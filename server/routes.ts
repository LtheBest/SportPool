import type { Express } from "express";
import * as express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  generateTokenPair,
  requireAuth,
  AuthenticatedRequest,
  hashPassword,
  verifyPassword,
  verifyRefreshToken,
  generateAccessToken,
  validatePasswordStrength,
  extractTokenFromHeader
} from "./auth";
import { randomUUID } from "crypto";
import { insertOrganizationSchema, insertEventSchema, insertEventParticipantSchema, insertMessageSchema } from "../shared/schema";
import { emailServiceEnhanced as emailService, emailServiceEnhanced } from "./email-enhanced";
import { chatbotService } from "./openai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";

// Utility function to clean email reply content
function cleanEmailReply(content: string): string {
  if (!content) return '';
  
  // Remove HTML tags if present
  const textContent = content.replace(/<[^>]*>/g, '');
  
  // Split by lines
  const lines = textContent.split('\n');
  const cleanLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Stop at common email reply indicators
    if (
      trimmedLine.startsWith('On ') && (trimmedLine.includes(' wrote:') || trimmedLine.includes(' a écrit :')) ||
      trimmedLine.startsWith('Le ') && (trimmedLine.includes(' a écrit :') || trimmedLine.includes(' wrote:')) ||
      trimmedLine.startsWith('From:') ||
      trimmedLine.startsWith('De :') ||
      trimmedLine.startsWith('-----Original Message-----') ||
      trimmedLine.startsWith('-----Message d\'origine-----') ||
      trimmedLine.match(/^\d{4}-\d{2}-\d{2}.*:$/) ||
      trimmedLine.startsWith('>')
    ) {
      break;
    }
    
    // Skip empty lines at the beginning
    if (cleanLines.length === 0 && trimmedLine === '') {
      continue;
    }
    
    cleanLines.push(line);
  }
  
  return cleanLines.join('\n').trim();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration CORS dynamique et optimisée pour Render
  const isProduction = process.env.NODE_ENV === 'production';
  const isRenderDeploy = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL || process.env.APP_URL?.includes('onrender.com');

  app.use(cors({
    origin: function (origin, callback) {
      // Allowed origins - Configuration complète pour tous les environnements
      const allowedOrigins = [
        // Development
        'http://localhost:8080',
        
        // Production Render
        'https://sportpool.onrender.com',
        process.env.APP_URL,
        process.env.RENDER_EXTERNAL_URL,
        // Vercel fallback si nécessaire
        // 'https://sportpool.vercel.app',
      ].filter(Boolean);

      console.log(`🌐 CORS check: origin=${origin}, allowed=${allowedOrigins.join(', ')}`);

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        console.log('✅ CORS: No origin provided, allowing request');
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        console.log('✅ CORS: Origin allowed');
        callback(null, true);
      } else {
        console.log(`❌ CORS: Origin ${origin} not allowed`);
        // En production sur Render, être plus permissif pour éviter les blocages
        if (isRenderDeploy && origin.includes('onrender.com')) {
          console.log('🔄 CORS: Render detected, allowing onrender.com origin');
          callback(null, true);
        } else {
          callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Set-Cookie',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200, // Support legacy browsers
    preflightContinue: false,
  }));

  // ---------- uploads dir & static ----------
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Serve static files from the uploads directory
  app.use("/uploads", express.static(uploadsDir));

  // Configuration multer pour les uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Images only!'));
      }
    }
  });

  // Debug middleware pour JWT (à utiliser seulement en développement)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        console.log(`🔍 JWT Debug: ${req.method} ${req.path}`);
        console.log(`   Authorization Header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
      }
      next();
    });
  }

  // ---------- AUTH ROUTES ----------

  // Register endpoint
  // Hidden admin registration endpoint (development only)
  app.post("/api/admin/register-super-user", async (req, res) => {
    try {
      // Security: Only allow in development or with special environment variable
      const isDevelopment = process.env.NODE_ENV === 'development';
      const allowAdminCreation = process.env.ALLOW_ADMIN_CREATION === 'true';
      
      if (!isDevelopment && !allowAdminCreation) {
        return res.status(404).json({ message: "Not found" });
      }

      const { name, email, password, firstName, lastName, secretKey } = req.body;
      
      // Additional security check with secret key
      const expectedSecret = process.env.ADMIN_CREATION_SECRET || 'dev-admin-secret-2024';
      if (secretKey !== expectedSecret) {
        return res.status(403).json({ message: "Invalid secret key" });
      }

      if (!name || !email || !password || !firstName || !lastName) {
        return res.status(400).json({ 
          message: "Name, email, password, firstName, and lastName are required" 
        });
      }

      // Check if admin already exists
      const existingAdmin = await storage.getOrganizationByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin with this email already exists" });
      }

      // Validate password strength
      if (!validatePasswordStrength(password)) {
        return res.status(400).json({ 
          message: "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character" 
        });
      }

      const hashedPassword = await hashPassword(password);

      // Create admin organization
      const adminData = {
        name: `${name} (Admin)`,
        type: "company" as const,
        email,
        contactFirstName: firstName,
        contactLastName: lastName,
        password: hashedPassword,
        role: "admin" as const,
        description: "System Administrator",
        sports: [],
        features: ["all"], // Admin gets all features
        isActive: true,
      };

      const admin = await storage.createOrganization(adminData);

      // Generate tokens for immediate login
      const tokens = generateTokenPair(admin.id, admin.email, admin.role);

      console.log(`✅ Admin user created successfully: ${email}`);

      res.status(201).json({
        message: "Admin created successfully",
        organization: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          contactFirstName: admin.contactFirstName,
          contactLastName: admin.contactLastName,
        },
        ...tokens,
      });
    } catch (error) {
      console.error("Admin creation error:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const data = insertOrganizationSchema.parse(req.body);

      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          message: "Password does not meet security requirements",
          errors: passwordValidation.errors
        });
      }

      // Check if organization already exists
      const existing = await storage.getOrganizationByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "An organization with this email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create organization
      const organization = await storage.createOrganization({
        ...data,
        password: hashedPassword,
      });

      // Generate JWT tokens
      const tokens = generateTokenPair({
        organizationId: organization.id,
        email: organization.email,
        name: organization.name,
      });

      res.json({
        organization: { ...organization, password: undefined },
        ...tokens,
        message: "Organization registered successfully"
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find organization
      const organization = await storage.getOrganizationByEmail(email);
      if (!organization) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await verifyPassword(password, organization.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT tokens
      const tokens = generateTokenPair({
        organizationId: organization.id,
        email: organization.email,
        name: organization.name,
      });

      res.json({
        organization: { ...organization, password: undefined },
        ...tokens,
        message: "Login successful",
        rememberMe: !!rememberMe
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Refresh token endpoint
  app.post("/api/refresh-token", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Verify organization still exists
      const organization = await storage.getOrganization(decoded.organizationId);
      if (!organization) {
        return res.status(401).json({ message: "Organization not found" });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken({
        organizationId: decoded.organizationId,
        email: decoded.email,
        name: decoded.name,
      });

      res.json({
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m"
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(401).json({ message: "Invalid refresh token" });
    }
  });

  // Logout endpoint (optionnel avec JWT, mais utile pour blacklisting)
  app.post("/api/logout", requireAuth, (req, res) => {
    // Avec JWT, le logout côté serveur est optionnel
    // Le client supprime simplement le token
    // Ici on pourrait ajouter le token à une blacklist si nécessaire
    res.json({ message: "Logout successful" });
  });

  // Get current user
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json({ ...organization, password: undefined });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // ---------- PASSWORD RESET ROUTES ----------

  // Forgot password
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if organization exists
      const organization = await storage.getOrganizationByEmail(email);
      if (!organization) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
      }

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await storage.createPasswordResetToken({
        email: email,
        token: resetToken,
        expiresAt: expiresAt,
      });

      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        email,
        `${organization.contactFirstName} ${organization.contactLastName}`,
        resetToken
      );

      if (emailSent.success) {
        console.log("Password reset email sent successfully");
      } else {
        console.error("Failed to send password reset email:", emailSent.error);
      }

      res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          message: "Password does not meet security requirements",
          errors: passwordValidation.errors
        });
      }

      // Verify token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update organization password
      await storage.updateOrganizationPassword(resetToken.email, hashedPassword);

      // Delete used token
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // ---------- PROTECTED ROUTES ----------

  // Email service diagnostic route
  app.get("/api/email/diagnostic", requireAuth, async (req, res) => {
    try {
      const report = await emailService.diagnoseService();
      const config = await emailService.testConfiguration();

      res.json({
        report: report,
        config: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Email diagnostic error:", error);
      res.status(500).json({ message: "Failed to run email diagnostic" });
    }
  });

  // Profile routes
  app.post("/api/profile/logo", requireAuth, upload.single("logo"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;

      if (!req.file) {
        return res.status(400).json({ message: "No logo file uploaded" });
      }

      const logoUrl = `/uploads/${req.file.filename}`;
      await storage.updateOrganization(authReq.user.organizationId, { logoUrl });

      res.json({ logoUrl, message: "Logo updated successfully" });
    } catch (error) {
      console.error("Logo upload error:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const data = req.body;

      const organization = await storage.updateOrganization(authReq.user.organizationId, data);
      res.json({ ...organization, password: undefined });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Events routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const events = await storage.getEventsByOrganization(authReq.user.organizationId);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;

      // Vérifier les limites d'abonnement avant de créer l'événement
      const eventPermission = await canCreateEvent(authReq.user.organizationId);
      if (!eventPermission.allowed) {
        return res.status(403).json({
          message: eventPermission.reason,
          type: "subscription_limit"
        });
      }

      // Transformation de la date string en Date
      const inputData = {
        ...req.body,
        organizationId: authReq.user.organizationId,
        // Supposons que la date dans req.body est dans req.body.date
        date: req.body.date ? new Date(req.body.date) : undefined,
      };

      const data = insertEventSchema.parse({
        ...inputData,
      });

      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const event = await storage.createEvent(data);
      
      // Incrémenter le compteur d'événements créés
      await incrementEventCount(authReq.user.organizationId);
      
      // Créer une notification de succès
      await createNotification({
        organizationId: authReq.user.organizationId,
        ...NotificationTemplates.EVENT_CREATED(event.name),
      });
      
      // 📧 Envoi automatique des invitations par email
      try {
        // Vérifier la configuration du service email d'abord
        const emailConfig = await emailServiceEnhanced.testConfiguration();
        console.log('📧 Email service configuration:', emailConfig);
        
        if (!emailConfig.canSendEmails) {
          console.warn('⚠️ Email service not properly configured. Skipping automatic invitations.');
          console.warn('Please check SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.');
        } else {
          const inviteEmails = req.body.inviteEmails;
          if (inviteEmails && Array.isArray(inviteEmails) && inviteEmails.length > 0) {
            // Vérifier les limites d'invitations pour le lot
            const invitationPermission = await canSendInvitations(authReq.user.organizationId, inviteEmails.length);
            if (!invitationPermission.allowed) {
              console.warn(`⚠️ Limite d'invitations atteinte: ${invitationPermission.reason}`);
              // Ne pas faire échouer la création de l'événement, mais limiter les invitations
              const maxAllowed = invitationPermission.remainingInvitations || 0;
              if (maxAllowed > 0) {
                inviteEmails.splice(maxAllowed); // Réduire la liste aux invitations possibles
                console.log(`📧 Réduction des invitations à ${maxAllowed} (limite atteinte)`);
              } else {
                console.log('📧 Aucune invitation envoyée (limite atteinte)');
                // Continuer sans envoyer d'invitations
                return res.json({ 
                  event, 
                  message: "Event created successfully, but invitation limit reached. Upgrade to send more invitations.",
                  invitationLimitReached: true
                });
              }
            }
            
            console.log(`📧 Envoi d'invitations à ${inviteEmails.length} adresses email pour l'événement ${event.id}`);
            
            // Envoi des invitations en parallèle
          const invitationPromises = inviteEmails.map(async (email: string) => {
            try {
              const invitationToken = randomUUID();
              
              // Création du lien d'invitation
              const invitationLink = `${process.env.APP_URL || 'http://localhost:8080'}/events/${event.id}?token=${invitationToken}`;
              
              // Envoi de l'email d'invitation avec le service amélioré
              const emailSent = await emailServiceEnhanced.sendEventInvitationWithLink(
                email,
                event.name,
                organization.name,
                new Date(event.date),
                invitationLink,
                event.meetingPoint,
                event.destination,
                event.sport || 'Sport',
                undefined, // duration
                `${organization.contactFirstName} ${organization.contactLastName}`,
                organization.email
              );
              
              if (emailSent) {
                console.log(`✅ Invitation envoyée avec succès à ${email}`);
                return { email, success: true };
              } else {
                throw new Error('Failed to send email');
              }
            } catch (error) {
              console.error(`❌ Erreur envoi invitation à ${email}:`, error);
              return { email, success: false, error: error.message };
            }
          });
          
          const invitationResults = await Promise.all(invitationPromises);
          const successCount = invitationResults.filter(r => r.success).length;
          
          // Incrémenter le compteur d'invitations pour les envois réussis
          if (successCount > 0) {
            await incrementInvitationCount(authReq.user.organizationId, successCount);
          }
          
          console.log(`📊 Invitations envoyées: ${successCount}/${inviteEmails.length}`);
          } else {
            console.log('📧 Aucun email d\'invitation spécifique fourni lors de la création');
          }
        
          // 📧 Récupération des participants des événements précédents pour invitations
          try {
          const organizationEvents = await storage.getEventsByOrganization(authReq.user.organizationId);
          const allParticipantEmails = new Set<string>();
          
          // Récupérer tous les participants des événements précédents
          for (const orgEvent of organizationEvents) {
            if (orgEvent.id !== event.id) { // Éviter d'inviter pour l'événement qu'on vient de créer
              try {
                const eventParticipants = await storage.getEventParticipants(orgEvent.id);
                eventParticipants.forEach(p => {
                  if (p.email) allParticipantEmails.add(p.email);
                });
              } catch (err) {
                console.error(`Erreur récupération participants événement ${orgEvent.id}:`, err);
              }
            }
          }
          
          if (allParticipantEmails.size > 0 && emailConfig.canSendEmails) {
            console.log(`📧 Envoi d'invitations à ${allParticipantEmails.size} membres précédents`);
            
            const existingInvitationPromises = Array.from(allParticipantEmails).map(async (email) => {
              try {
                const invitationLink = `${process.env.APP_URL || 'http://localhost:8080'}/events/${event.id}`;
                
                await emailService.sendEventInvitation({
                  to: email,
                  eventName: event.name,
                  eventDate: new Date(event.date),
                  organizationName: organization.name,
                  invitationLink: invitationLink,
                  meetingPoint: event.meetingPoint,
                  destination: event.destination,
                  sport: event.sport || 'Sport',
                  customMessage: `Nouvel événement disponible : ${event.name}. Rejoignez-nous !`
                });
                
                return { email, success: true };
              } catch (error) {
                console.error(`❌ Erreur envoi invitation membre ${email}:`, error);
                return { email, success: false };
              }
            });
            
            const existingResults = await Promise.all(existingInvitationPromises);
            const existingSuccessCount = existingResults.filter(r => r.success).length;
            
            console.log(`📊 Invitations membres: ${existingSuccessCount}/${allParticipantEmails.size}`);
          } else if (allParticipantEmails.size > 0 && !emailConfig.canSendEmails) {
            console.warn(`⚠️ ${allParticipantEmails.size} membres existants trouvés mais service email non configuré`);
          }
          } catch (membersError) {
            console.error('❌ Erreur lors de la récupération des membres existants:', membersError);
          }
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des invitations:', emailError);
        // On ne fait pas échouer la création d'événement si les emails échouent
      }
      
      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create event" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);

      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);

      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const data = insertEventSchema.partial().parse(req.body);
      const updatedEvent = await storage.updateEvent(req.params.id, data);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);

      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Participants routes
  app.get("/api/events/:id/participants", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);

      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const participants = await storage.getEventParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      console.error("Get participants error:", error);
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  app.delete("/api/participants/:id", requireAuth, async (req, res) => {
    try {
      const participant = await storage.getEventParticipant(req.params.id);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      const event = await storage.getEvent(participant.eventId);
      const authReq = req as AuthenticatedRequest;
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEventParticipant(req.params.id);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Delete participant error:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  app.put("/api/participants/:id", requireAuth, async (req, res) => {
    try {
      const participant = await storage.getEventParticipant(req.params.id);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      const event = await storage.getEvent(participant.eventId);
      const authReq = req as AuthenticatedRequest;
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const data = req.body;
      const updatedParticipant = await storage.updateEventParticipant(req.params.id, data);
      res.json(updatedParticipant);
    } catch (error) {
      console.error("Update participant error:", error);
      res.status(500).json({ message: "Failed to update participant" });
    }
  });

  // Public event routes (no auth required)
  app.get("/api/events/:id/public", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      const participants = await storage.getEventParticipants(event.id);

      // Format event data with organization details
      const eventData = {
        id: event.id,
        name: event.name,
        description: event.description,
        sport: event.sport,
        date: event.date,
        eventDate: event.eventDate,
        meetingPoint: event.meetingPoint,
        destination: event.destination,
        duration: event.duration,
        status: event.status,
        participants: participants,
        organization: organization ? {
          name: organization.name,
          logoUrl: organization.logoUrl,
          contactFirstName: organization.contactFirstName,
          contactLastName: organization.contactLastName
        } : null
      };

      res.json(eventData);
    } catch (error) {
      console.error("Get public event error:", error);
      res.status(500).json({ message: "Failed to get event details" });
    }
  });

  // Join event (public endpoint)
  app.post("/api/events/:id/join", async (req, res) => {
    try {
      const data = insertEventParticipantSchema.parse({
        ...req.body,
        eventId: req.params.id,
      });

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if already registered
      const existingParticipants = await storage.getEventParticipants(event.id);
      const existingParticipant = existingParticipants.find(p => p.email === data.email);

      if (existingParticipant) {
        return res.status(400).json({ message: "You are already registered for this event" });
      }

      const participant = await storage.createEventParticipant(data);
      res.json({ message: "Successfully registered for the event!" });
    } catch (error) {
      console.error("Join event error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to join event" });
    }
  });

  // Create shareable invitation token (auth required)
  app.post("/api/events/:id/invitations", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const token = randomUUID();
      const invitation = await storage.createEventInvitation({
        eventId: event.id,
        email: `sharedlink+${token}@local`,
        token,
        status: "pending",
      });

      res.json({ token: invitation.token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create invitation link" });
    }
  });

  // Redirect invitation tokens to public event page
  app.get("/invitation/:token", async (req, res) => {
    try {
      const invitation = await storage.getEventInvitation(req.params.token);
      if (!invitation) {
        return res.status(404).send(`
          <html><body>
            <h1>Invitation non trouvée</h1>
            <p>Cette invitation n'existe pas ou a expiré.</p>
          </body></html>
        `);
      }

      res.redirect(`/events/${invitation.eventId}`);
    } catch (error) {
      console.error("Invitation redirect error:", error);
      res.status(500).send(`
        <html><body>
          <h1>Erreur</h1>
          <p>Une erreur est survenue lors du traitement de votre invitation.</p>
        </body></html>
      `);
    }
  });

  // Send individual invitation email
  app.post("/api/events/:id/invite", requireAuth, async (req, res) => {
    try {
      const { email, customMessage } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const authReq = req as AuthenticatedRequest;
      
      // Vérifier les limites d'invitations avant d'envoyer
      const invitationPermission = await canSendInvitations(authReq.user.organizationId, 1);
      if (!invitationPermission.allowed) {
        return res.status(403).json({
          message: invitationPermission.reason,
          type: "subscription_limit",
          remainingInvitations: invitationPermission.remainingInvitations
        });
      }

      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const eventLink = `${process.env.APP_URL || 'https://sportpool.onrender.com'}/events/${event.id}`;

      const sent = await emailService.sendEventInvitationWithLink(
        email,
        event.name,
        organization.name,
        event.date,
        eventLink,
        event.meetingPoint,
        event.destination,
        event.sport,
        event.duration,
        `${organization.contactFirstName} ${organization.contactLastName}`,
        organization.email
      );

      if (sent) {
        try {
          const token = randomUUID();
          await storage.createEventInvitation({
            eventId: event.id,
            email: email.trim(),
            token,
          });
          
          // Incrémenter le compteur d'invitations envoyées
          await incrementInvitationCount(authReq.user.organizationId, 1);
        } catch (error) {
          console.error(`Failed to create invitation record for ${email}:`, error);
        }

        res.json({ message: "Invitation sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send invitation email" });
      }
    } catch (error) {
      console.error("Send invitation error:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Change requests routes
  app.get("/api/events/:id/change-requests", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const requests = await storage.getParticipantChangeRequestsByEvent(req.params.id);
      res.json(requests);
    } catch (error) {
      console.error("Get change requests error:", error);
      res.status(500).json({ message: "Failed to get change requests" });
    }
  });

  app.post("/api/participants/:id/change-request", async (req, res) => {
    try {
      const { requestType, requestedValue, reason } = req.body;

      if (!requestType || !reason) {
        return res.status(400).json({ message: "Request type and reason are required" });
      }

      const participant = await storage.getEventParticipant(req.params.id);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      const request = await storage.createParticipantChangeRequest({
        participantId: req.params.id,
        eventId: participant.eventId,
        requestType,
        currentValue: requestType === "role_change" ? participant.role :
          requestType === "seat_change" ? participant.availableSeats?.toString() : "active",
        requestedValue,
        reason,
        status: "pending",
      });

      const event = await storage.getEvent(participant.eventId);
      if (event) {
        const organization = await storage.getOrganization(event.organizationId);
        if (organization) {
          try {
            const requestTypeText = requestType === "role_change" ? "changement de rôle" :
              requestType === "seat_change" ? "changement de places disponibles" : "retrait de l'événement";

            await emailService.sendMessageNotificationEmail(
              organization.email,
              `${organization.contactFirstName} ${organization.contactLastName}`,
              event.name,
              organization.name,
              participant.name,
              `Demande de ${requestTypeText}: ${reason}`,
              event.id,
              request.id
            );
          } catch (error) {
            console.error("Failed to send change request notification:", error);
          }
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Create change request error:", error);
      res.status(500).json({ message: "Failed to create change request" });
    }
  });

  app.put("/api/change-requests/:id", requireAuth, async (req, res) => {
    try {
      const { status, organizerComment } = req.body;

      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Valid status (approved/rejected) is required" });
      }

      const request = await storage.getParticipantChangeRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Change request not found" });
      }

      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(request.eventId);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found or access denied" });
      }

      const updatedRequest = await storage.updateParticipantChangeRequest(req.params.id, {
        status,
        processedAt: new Date(),
      });

      if (status === "approved") {
        try {
          if (request.requestType === "role_change") {
            await storage.updateEventParticipant(request.participantId, {
              role: request.requestedValue as "passenger" | "driver",
              availableSeats: request.requestedValue === "driver" ? 1 : null
            });
          } else if (request.requestType === "seat_change") {
            await storage.updateEventParticipant(request.participantId, {
              availableSeats: parseInt(request.requestedValue || "0")
            });
          } else if (request.requestType === "withdrawal") {
            await storage.removeEventParticipant(request.participantId);
          }
        } catch (error) {
          console.error("Failed to apply approved changes:", error);
          return res.status(500).json({ message: "Failed to apply changes" });
        }
      }

      try {
        const participant = await storage.getEventParticipant(request.participantId);
        if (participant) {
          const organization = await storage.getOrganization(event.organizationId);
          if (organization) {
            const statusText = status === "approved" ? "approuvée" : "rejetée";
            const message = `Votre demande a été ${statusText}. ${organizerComment || ""}`;

            await emailService.sendMessageNotificationEmail(
              participant.email,
              participant.name,
              event.name,
              organization.name,
              organization.name,
              message,
              event.id,
              updatedRequest.id
            );
          }
        }
      } catch (error) {
        console.error("Failed to send decision notification:", error);
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("Process change request error:", error);
      res.status(500).json({ message: "Failed to process change request" });
    }
  });

  // Messages routes
  app.get("/api/events/:id/messages", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const messages = await storage.getEventMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/events/:id/messages", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const data = insertMessageSchema.parse({
        eventId: req.params.id,
        senderName: organization.name,
        senderEmail: organization.email,
        content: req.body.content,
        isFromOrganizer: true,
      });

      const message = await storage.createMessage(data);

      try {
        const participants = await storage.getEventParticipants(event.id);

        for (const participant of participants) {
          // Create a unique reply token for each participant
          const replyToken = randomUUID();
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          await storage.createEmailReplyToken({
            token: replyToken,
            eventId: event.id,
            participantEmail: participant.email,
            participantName: participant.name,
            organizerEmail: organization.email,
            organizerName: `${organization.contactFirstName} ${organization.contactLastName}`,
            expiresAt,
          });

          // Send message using enhanced email service with reply token
          const emailSent = await emailServiceEnhanced.sendBroadcastMessage(
            participant.email,
            participant.name,
            event.name,
            organization.name,
            data.content,
            `${organization.contactFirstName} ${organization.contactLastName}`,
            event.id
          );

          if (emailSent) {
            console.log(`✅ Message notification sent to ${participant.email} with reply token ${replyToken}`);
          } else {
            console.error(`❌ Failed to send message notification to ${participant.email}`);
          }
        }
      } catch (error) {
        console.error("Failed to send message notifications:", error);
      }

      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  app.delete("/api/events/:eventId/messages/:messageId", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.eventId);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const message = await storage.getMessage(req.params.messageId);
      if (!message || message.eventId !== event.id) {
        return res.status(404).json({ message: "Message not found" });
      }

      await storage.deleteMessage(req.params.messageId);
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Public message endpoint for participants
  app.post("/api/events/:id/messages/participant", async (req, res) => {
    try {
      const { senderName, senderEmail, content } = req.body;

      if (!senderName || !senderEmail || !content) {
        return res.status(400).json({ message: "Name, email, and content are required" });
      }

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const participants = await storage.getEventParticipants(event.id);
      const isParticipant = participants.some(p => p.email === senderEmail);

      if (!isParticipant) {
        return res.status(403).json({ message: "Only event participants can send messages" });
      }

      const data = insertMessageSchema.parse({
        eventId: req.params.id,
        senderName,
        senderEmail,
        content,
        isFromOrganizer: false,
      });

      const message = await storage.createMessage(data);

      try {
        const organization = await storage.getOrganization(event.organizationId);
        if (organization) {
          const emailSent = await emailService.sendMessageNotificationEmail(
            organization.email,
            `${organization.contactFirstName} ${organization.contactLastName}`,
            event.name,
            organization.name,
            senderName,
            content,
            event.id,
            message.id
          );

          if (emailSent) {
            console.log(`Participant message notification sent to organizer ${organization.email}`);
          } else {
            console.error(`Failed to send participant message notification to organizer`);
          }
        }
      } catch (error) {
        console.error("Failed to send organizer notification:", error);
      }

      res.json(message);
    } catch (error) {
      console.error("Create participant message error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // Chatbot routes
  app.post("/api/chatbot/message", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ 
          success: false,
          message: "Message is required" 
        });
      }

      console.log('📧 Chatbot request:', { message: message.substring(0, 100), historyLength: conversationHistory?.length || 0 });

      const response = await chatbotService.sendMessage(message, conversationHistory || []);
      
      console.log('🤖 Chatbot response:', { success: response.success, messageLength: response.message.length });
      
      res.json({
        success: response.success,
        message: response.message
      });
    } catch (error) {
      console.error("❌ Chatbot error:", error);
      res.status(500).json({ 
        success: false,
        message: "Désolé, le service est temporairement indisponible. Veuillez réessayer plus tard." 
      });
    }
  });

  app.post("/api/chatbot/organization-help", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const response = await chatbotService.getOrganizationHelp(message, organization);
      res.json({ response });
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({ message: "Failed to get chatbot response" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const events = await storage.getEventsByOrganization(authReq.user.organizationId);

      // Séparer les événements actifs (futurs) des événements passés
      const now = new Date();
      const activeEvents = events.filter(e => new Date(e.eventDate) >= now);
      const completedEvents = events.filter(e => new Date(e.eventDate) < now);
      
      // Compter le total d'événements créés par l'organisateur (selon demande utilisateur)
      const totalEventsCreated = events.length;
      const activeEventsCount = activeEvents.length;
      
      // Calculer les participants pour TOUS les événements (actifs et passés)
      let totalParticipants = 0;
      let totalDrivers = 0;
      let totalSeats = 0;
      let occupiedSeats = 0;

      // Statistiques séparées pour événements actifs seulement  
      let activeEventParticipants = 0;
      let activeEventDrivers = 0;
      let activeEventSeats = 0;
      let activeEventOccupiedSeats = 0;

      // Calculer pour tous les événements
      for (const event of events) {
        if (event.participants && event.participants.length > 0) {
          totalParticipants += event.participants.length;
          
          const drivers = event.participants.filter(p => p.role === 'driver');
          const passengers = event.participants.filter(p => p.role === 'passenger');
          
          totalDrivers += drivers.length;
          occupiedSeats += passengers.length;
          
          // Calculer le total des sièges disponibles des conducteurs
          const eventSeats = drivers.reduce((sum, driver) => {
            return sum + (driver.availableSeats || 0);
          }, 0);
          totalSeats += eventSeats;
        }
      }

      // Calculer pour les événements actifs seulement
      for (const event of activeEvents) {
        if (event.participants && event.participants.length > 0) {
          activeEventParticipants += event.participants.length;
          
          const drivers = event.participants.filter(p => p.role === 'driver');
          const passengers = event.participants.filter(p => p.role === 'passenger');
          
          activeEventDrivers += drivers.length;
          activeEventOccupiedSeats += passengers.length;
          
          // Calculer les sièges disponibles pour événements actifs
          const eventSeats = drivers.reduce((sum, driver) => {
            return sum + (driver.availableSeats || 0);
          }, 0);
          activeEventSeats += eventSeats;
        }
      }

      // Places disponibles = sièges totaux des conducteurs - sièges occupés par passagers
      const availableSeatsRemaining = Math.max(0, activeEventSeats - activeEventOccupiedSeats);

      res.json({
        // Statistiques selon les besoins utilisateur
        activeEvents: totalEventsCreated, // Nombre total d'événements créés par l'organisateur
        totalParticipants: totalParticipants, // Total participants (passagers + conducteurs)
        totalDrivers: totalDrivers, // Total conducteurs
        availableSeats: availableSeatsRemaining, // Places disponibles dans événements actifs
        
        // Statistiques détaillées additionnelles
        totalEventsCreated,
        activeEventsCount, 
        completedEventsCount: completedEvents.length,
        totalSeats,
        occupiedSeats,
        activeEventStats: {
          participants: activeEventParticipants,
          drivers: activeEventDrivers,
          seats: activeEventSeats,
          occupiedSeats: activeEventOccupiedSeats
        }
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/dashboard/stats/realtime", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const events = await storage.getEventsByOrganization(authReq.user.organizationId);

      const totalEvents = events.length;
      const activeEvents = events.filter(e => new Date(e.eventDate) >= new Date()).length;

      res.json({
        totalEvents,
        activeEvents,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Realtime dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get realtime stats" });
    }
  });

  // Email routes
  app.post("/api/events/:id/send-reminders", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const participants = await storage.getEventParticipants(event.id);
      const organization = await storage.getOrganization(event.organizationId);

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      let successCount = 0;
      for (const participant of participants) {
        try {
          const sent = await emailService.sendReminderEmail(
            participant.email,
            participant.name,
            event.name,
            organization.name,
            event.date,
            event.meetingPoint
          );
          if (sent) successCount++;
        } catch (error) {
          console.error(`Failed to send reminder to ${participant.email}:`, error);
        }
      }

      res.json({
        message: `Reminders sent to ${successCount} out of ${participants.length} participants`
      });
    } catch (error) {
      console.error("Send reminders error:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  app.post("/api/send-custom-email", requireAuth, async (req, res) => {
    try {
      const { to, subject, content } = req.body;

      if (!to || !subject || !content) {
        return res.status(400).json({ message: "To, subject, and content are required" });
      }

      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const sent = await emailService.sendCustomEmail(to, subject, content, organization);

      if (sent.success) {
        res.json({ message: "Email sent successfully" });
      } else {
        res.status(500).json({ message: sent.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Send custom email error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Messages routes
  app.get("/api/events/:id/messages", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const messages = await storage.getEventMessages(event.id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/events/:id/messages", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Create message record
      const messageData: any = {
        eventId: event.id,
        senderName: `${organization.contactFirstName} ${organization.contactLastName}`,
        senderEmail: organization.email,
        content,
        isFromOrganizer: true,
      };

      const message = await storage.createMessage(messageData);

      // Get all participants for this event
      const participants = await storage.getEventParticipants(event.id);

      // Send email to each participant with reply functionality
      let successCount = 0;
      for (const participant of participants) {
        try {
          // Create a unique reply token for this message-participant combination
          const replyToken = `${message.id}_${participant.id}_${Date.now()}`;
          
          const sent = await emailService.sendMessageToParticipant(
            participant.email,
            participant.name,
            content,
            event.name,
            organization.name,
            `${organization.contactFirstName} ${organization.contactLastName}`,
            replyToken
          );
          if (sent.success) successCount++;
        } catch (error) {
          console.error(`Failed to send message to ${participant.email}:`, error);
        }
      }

      res.json({
        message: `Message sent to ${successCount} out of ${participants.length} participants`,
        messageId: message.id
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const message = await storage.getMessage(req.params.id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Verify that the message belongs to an event owned by this organization
      const event = await storage.getEvent(message.eventId);
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteMessage(req.params.id);
      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Handle participant replies via email
  app.post("/api/messages/reply/:replyToken", async (req, res) => {
    try {
      const { replyToken } = req.params;
      const { content, senderEmail, senderName } = req.body;

      if (!content || !senderEmail || !senderName) {
        return res.status(400).json({ message: "Content, sender email, and sender name are required" });
      }

      // Get the reply token information
      const tokenData = await storage.getEmailReplyToken(replyToken);
      if (!tokenData) {
        return res.status(404).json({ message: "Invalid or expired reply token" });
      }

      // Verify the sender email matches the token
      if (tokenData.participantEmail !== senderEmail) {
        return res.status(403).json({ message: "Unauthorized: email doesn't match token" });
      }

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        await storage.deactivateEmailReplyToken(replyToken);
        return res.status(410).json({ message: "Reply token has expired" });
      }

      // Get event information
      const event = await storage.getEvent(tokenData.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Create the reply message in the database
      const replyMessage = await storage.createMessage({
        eventId: tokenData.eventId,
        senderName: tokenData.participantName,
        senderEmail: tokenData.participantEmail,
        content: content.trim(),
        isFromOrganizer: false,
      });

      // Send notification to organizer
      try {
        await emailServiceEnhanced.sendReplyNotificationToOrganizer(
          tokenData.organizerEmail,
          tokenData.organizerName,
          tokenData.participantName,
          content.trim(),
          event.name
        );
        console.log(`✅ Reply notification sent to organizer ${tokenData.organizerEmail}`);
      } catch (emailError) {
        console.error(`❌ Failed to send reply notification to organizer:`, emailError);
      }

      res.json({ 
        success: true, 
        message: "Reply processed successfully",
        messageId: replyMessage.id 
      });

    } catch (error) {
      console.error("Reply processing error:", error);
      res.status(500).json({ message: "Failed to process reply" });
    }
  });

  // SendGrid webhook endpoint for processing inbound emails
  app.post("/api/webhooks/sendgrid/inbound", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const payload = JSON.parse(req.body.toString());
      
      // Parse inbound email data from SendGrid
      for (const email of payload) {
        const toEmail = email.to?.[0]?.email || '';
        const fromEmail = email.from?.email || '';
        const fromName = email.from?.name || fromEmail;
        const subject = email.subject || '';
        const text = email.text || '';
        const html = email.html || '';
        
        // Extract reply token from email address (e.g., reply+token@sportpool.com)
        const replyTokenMatch = toEmail.match(/reply\+([^@]+)@/);
        if (!replyTokenMatch) {
          console.log(`No reply token found in email address: ${toEmail}`);
          continue;
        }
        
        const replyToken = replyTokenMatch[1];
        
        // Process the reply using the same logic as the API endpoint
        const tokenData = await storage.getEmailReplyToken(replyToken);
        if (!tokenData || new Date() > tokenData.expiresAt) {
          console.log(`Invalid or expired reply token: ${replyToken}`);
          continue;
        }
        
        if (tokenData.participantEmail !== fromEmail) {
          console.log(`Email sender mismatch: ${fromEmail} vs ${tokenData.participantEmail}`);
          continue;
        }
        
        // Clean up the reply content (remove quotes, signatures, etc.)
        const cleanContent = cleanEmailReply(text || html);
        if (!cleanContent.trim()) {
          console.log(`Empty reply content from ${fromEmail}`);
          continue;
        }
        
        // Get event information
        const event = await storage.getEvent(tokenData.eventId);
        if (!event) {
          console.log(`Event not found for token: ${replyToken}`);
          continue;
        }
        
        // Create the reply message
        const replyMessage = await storage.createMessage({
          eventId: tokenData.eventId,
          senderName: tokenData.participantName,
          senderEmail: tokenData.participantEmail,
          content: cleanContent.trim(),
          isFromOrganizer: false,
        });
        
        // Send notification to organizer
        try {
          await emailServiceEnhanced.sendReplyNotificationToOrganizer(
            tokenData.organizerEmail,
            tokenData.organizerName,
            tokenData.participantName,
            cleanContent.trim(),
            event.name
          );
          console.log(`✅ Inbound email reply processed for event ${event.name}: ${replyMessage.id}`);
        } catch (emailError) {
          console.error(`❌ Failed to send organizer notification:`, emailError);
        }
      }
      
      res.status(200).json({ message: "Webhook processed successfully" });
      
    } catch (error) {
      console.error("SendGrid webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Original route with modifications for better compatibility
  app.post("/api/messages/reply-old/:replyToken", async (req, res) => {
    try {
      const { replyToken } = req.params;
      const { content, senderEmail, senderName } = req.body;

      if (!content || !senderEmail || !senderName) {
        return res.status(400).json({ message: "Content, senderEmail, and senderName are required" });
      }

      // Parse reply token to get message and participant info
      const tokenParts = replyToken.split('_');
      if (tokenParts.length !== 3) {
        return res.status(400).json({ message: "Invalid reply token" });
      }

      const [messageId, participantId] = tokenParts;

      // Get original message to find the event
      const originalMessage = await storage.getMessage(messageId);
      if (!originalMessage) {
        return res.status(404).json({ message: "Original message not found" });
      }

      // Verify participant exists for this event
      const participants = await storage.getEventParticipants(originalMessage.eventId);
      const participant = participants.find(p => p.id === participantId && p.email === senderEmail);
      
      if (!participant) {
        return res.status(403).json({ message: "Unauthorized - participant not found" });
      }

      // Create reply message
      const replyData: any = {
        eventId: originalMessage.eventId,
        senderName,
        senderEmail,
        content,
        isFromOrganizer: false,
      };

      const replyMessage = await storage.createMessage(replyData);

      // Send notification to organizer
      const event = await storage.getEvent(originalMessage.eventId);
      const organization = await storage.getOrganization(event.organizationId);

      if (organization) {
        try {
          await emailService.sendReplyNotificationToOrganizer(
            organization.email,
            `${organization.contactFirstName} ${organization.contactLastName}`,
            senderName,
            content,
            event.name
          );
        } catch (error) {
          console.error("Failed to send reply notification to organizer:", error);
        }
      }

      res.json({ message: "Reply sent successfully", replyId: replyMessage.id });
    } catch (error) {
      console.error("Handle reply error:", error);
      res.status(500).json({ message: "Failed to process reply" });
    }
  });

  // Admin endpoints - protected by admin role check
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ message: "Failed to verify admin permissions" });
    }
  };

  // Middleware pour vérifier les fonctionnalités
  const requireFeature = (featureId: string) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user || !authReq.user.organizationId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const organization = await storage.getOrganization(authReq.user.organizationId);
        if (!organization) {
          return res.status(404).json({ message: "Organization not found" });
        }

        // Les admins ont accès à toutes les fonctionnalités
        if (organization.role === 'admin') {
          return next();
        }

        // Vérifier si l'organisation est active
        if (!organization.isActive) {
          return res.status(403).json({ message: "Organization is disabled" });
        }

        // Vérifier si la fonctionnalité est activée
        if (!organization.features || !organization.features.includes(featureId)) {
          return res.status(403).json({ 
            message: `Feature '${featureId}' is not enabled for this organization` 
          });
        }

        next();
      } catch (error) {
        console.error("Feature check error:", error);
        res.status(500).json({ message: "Failed to verify feature permissions" });
      }
    };
  };

  // Get all organizations (admin only)
  app.get("/api/admin/organizations", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizationsForAdmin();
      res.json(organizations.map(org => ({ ...org, password: undefined })));
    } catch (error) {
      console.error("Get all organizations error:", error);
      res.status(500).json({ message: "Failed to get organizations" });
    }
  });

  // Update organization status (admin only)
  app.patch("/api/admin/organizations/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const updatedOrg = await storage.updateOrganizationStatus(req.params.id, isActive);
      res.json({ ...updatedOrg, password: undefined });
    } catch (error) {
      console.error("Update organization status error:", error);
      res.status(500).json({ message: "Failed to update organization status" });
    }
  });

  // Update organization features (admin only)
  app.patch("/api/admin/organizations/:id/features", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { features } = req.body;
      
      if (!Array.isArray(features)) {
        return res.status(400).json({ message: "features must be an array" });
      }

      const updatedOrg = await storage.updateOrganizationFeatures(req.params.id, features);
      res.json({ ...updatedOrg, password: undefined });
    } catch (error) {
      console.error("Update organization features error:", error);
      res.status(500).json({ message: "Failed to update organization features" });
    }
  });

  // Delete organization (admin only)
  app.delete("/api/admin/organizations/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if trying to delete own organization
      const authReq = req as AuthenticatedRequest;
      if (id === authReq.user.organizationId) {
        return res.status(400).json({ message: "Cannot delete your own organization" });
      }

      await storage.deleteOrganization(id);
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      console.error("Delete organization error:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Import CSV/Excel parsing endpoint
  app.post("/api/import/parse-excel", requireAuth, requireFeature('csv_import'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // La vérification des permissions est déjà faite par le middleware requireFeature

      let content = '';
      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      if (fileExtension === '.csv' || fileExtension === '.txt') {
        // Lire le fichier CSV/TXT directement
        content = fs.readFileSync(filePath, 'utf-8');
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // Pour les fichiers Excel, on va juste retourner une version CSV simplifiée
        // En production, vous pourriez utiliser une bibliothèque comme 'xlsx' pour parser Excel
        // Pour l'instant, on indique que le format Excel nécessite une conversion manuelle
        fs.unlinkSync(filePath); // Nettoyer le fichier temporaire
        return res.status(400).json({ 
          message: "Excel files require manual conversion to CSV format. Please save your Excel file as CSV and try again." 
        });
      } else {
        fs.unlinkSync(filePath); // Nettoyer le fichier temporaire
        return res.status(400).json({ message: "Unsupported file format" });
      }

      // Nettoyer le fichier temporaire
      fs.unlinkSync(filePath);
      
      res.json({ content });
    } catch (error) {
      console.error("Excel parsing error:", error);
      // Nettoyer le fichier en cas d'erreur
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up file:", e);
        }
      }
      res.status(500).json({ message: "Failed to parse file" });
    }
  });

  // Route protégée pour les analytics avancées
  app.get("/api/analytics/detailed", requireAuth, requireFeature('analytics'), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const events = await storage.getEventsByOrganization(authReq.user.organizationId);
      
      // Calculs d'analytics détaillées
      const analytics = {
        eventTrends: events.map(e => ({
          date: e.eventDate,
          participants: e.participants?.length || 0
        })),
        participationRate: events.length > 0 ? 
          events.reduce((sum, e) => sum + (e.participants?.length || 0), 0) / events.length : 0,
        message: "Analytics avancées disponibles"
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Route protégée pour la messagerie avancée
  app.post("/api/messaging/bulk-send", requireAuth, requireFeature('messaging'), async (req, res) => {
    try {
      const { recipients, message, subject } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients array is required" });
      }
      
      // Simulation d'envoi en masse
      const results = {
        sent: recipients.length,
        failed: 0,
        message: "Messages envoyés avec succès (fonction messagerie avancée)"
      };
      
      res.json(results);
    } catch (error) {
      console.error("Bulk messaging error:", error);
      res.status(500).json({ message: "Failed to send bulk messages" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizationsForAdmin();
      const events = await storage.getEvents();
      
      const totalOrganizations = organizations.length;
      const activeOrganizations = organizations.filter(org => org.isActive).length;
      const inactiveOrganizations = totalOrganizations - activeOrganizations;
      const totalEvents = events.length;
      
      // Get participants count across all events
      let totalParticipants = 0;
      for (const event of events) {
        const participants = await storage.getEventParticipants(event.id);
        totalParticipants += participants.length;
      }

      res.json({
        totalOrganizations,
        activeOrganizations,
        inactiveOrganizations,
        totalEvents,
        totalParticipants,
        averageEventsPerOrg: totalOrganizations > 0 ? Math.round(totalEvents / totalOrganizations * 100) / 100 : 0
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  // Test endpoint pour vérifier l'authentification JWT
  app.get("/api/auth-test", requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({
      message: "JWT Authentication working!",
      user: authReq.user,
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint (non protégé)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      auth: "jwt"
    });
  });

  // Newsletter subscription endpoint (public)
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Send welcome email (optional)
      try {
        await emailService.sendCustomEmail(
          email,
          "Bienvenue dans la newsletter SportPool !",
          `Merci de vous être inscrit(e) à notre newsletter !\n\nVous recevrez désormais nos dernières actualités et nouveautés concernant SportPool.\n\nÀ bientôt !`
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the subscription if email fails
      }

      res.json({ 
        message: "Inscription réussie ! Vous recevrez bientôt nos actualités.",
        success: true 
      });
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  // Notifications API
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const notifications = await storage.getNotificationsByOrganization(authReq.user.organizationId);
      res.json(notifications || []);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await storage.markNotificationAsRead(req.params.id, authReq.user.organizationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await storage.markAllNotificationsAsRead(authReq.user.organizationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      await storage.deleteNotification(req.params.id, authReq.user.organizationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Broadcast messaging API
  app.post("/api/events/:id/broadcast", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      const authReq = req as AuthenticatedRequest;
      const event = await storage.getEvent(req.params.id);
      
      if (!event || event.organizationId !== authReq.user.organizationId) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get all event participants
      const participants = await storage.getEventParticipants(event.id);
      const emailPromises = [];

      // Store the broadcast message in database first to get the ID
      const broadcastMessage = await storage.createMessage({
        eventId: event.id,
        content: message,
        senderName: organization.name,
        senderEmail: organization.email,
        isFromOrganizer: true,
        isBroadcast: true,
      });

      // Send email to all participants with reply tokens
      for (const participant of participants) {
        // Create unique reply token for this participant and message
        const replyToken = randomUUID();
        
        await storage.createEmailReplyToken({
          token: replyToken,
          eventId: event.id,
          participantEmail: participant.email,
          participantName: participant.name,
          organizerEmail: organization.email,
          organizerName: `${organization.contactFirstName} ${organization.contactLastName}`,
          originalMessage: message,
          originalMessageId: broadcastMessage.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        const emailPromise = emailServiceEnhanced.sendBroadcastMessageWithReplyButton(
          participant.email,
          participant.name,
          event.name,
          organization.name,
          message,
          `${organization.contactFirstName} ${organization.contactLastName}`,
          event.id,
          replyToken
        );
        emailPromises.push(emailPromise);
      }

      // Send emails in parallel
      await Promise.all(emailPromises);

      res.json({ 
        message: "Broadcast message sent successfully",
        recipientCount: participants.length 
      });
    } catch (error) {
      console.error("Broadcast message error:", error);
      res.status(500).json({ message: "Failed to send broadcast message" });
    }
  });

  // Contact form endpoint (public)
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
          message: "Tous les champs sont requis (nom, email, sujet, message)" 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Format d'email invalide" });
      }

      // Send email to support
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDGRID_FROM_EMAIL;
      if (adminEmail) {
        try {
          await emailService.sendCustomEmail(
            adminEmail,
            `Nouveau message de contact : ${subject}`,
            `Nouveau message reçu via le formulaire de contact :\n\nDe : ${name} (${email})\nSujet : ${subject}\n\nMessage :\n${message}\n\n---\nEnvoyé depuis SportPool`
          );
        } catch (emailError) {
          console.error("Failed to send contact email:", emailError);
        }
      }

      res.json({ 
        message: "Message envoyé avec succès ! Nous vous répondrons rapidement.",
        success: true 
      });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi du message" });
    }
  });

  // Reply token routes for external messaging
  // Get reply data from token
  app.get("/api/reply-token/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const replyTokenData = await storage.getReplyTokenData(token);
      
      if (!replyTokenData) {
        return res.status(404).json({ message: "Invalid or expired reply token" });
      }

      // Get event and organization data
      const event = await storage.getEvent(replyTokenData.eventId);
      const organization = await storage.getOrganization(event.organizationId);

      res.json({
        eventName: event.name,
        organizerName: organization.name,
        originalMessage: replyTokenData.originalMessage || "Message de l'organisateur",
        messageDate: new Date(replyTokenData.createdAt).toLocaleDateString('fr-FR'),
        participantName: replyTokenData.participantName,
        participantEmail: replyTokenData.participantEmail,
      });
    } catch (error) {
      console.error("Get reply token error:", error);
      res.status(500).json({ message: "Failed to get reply token data" });
    }
  });

  // Handle reply message submission
  app.post("/api/reply-message/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const { content, participantName, participantEmail } = req.body;
      
      if (!token || !content || !participantName || !participantEmail) {
        return res.status(400).json({ 
          message: "Token, content, participantName, and participantEmail are required" 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(participantEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const replyTokenData = await storage.getReplyTokenData(token);
      
      if (!replyTokenData) {
        return res.status(404).json({ message: "Invalid or expired reply token" });
      }

      // Store the reply message
      const messageData = {
        eventId: replyTokenData.eventId,
        content: content.trim(),
        senderName: participantName.trim(),
        senderEmail: participantEmail.trim(),
        isFromOrganizer: false,
        isBroadcast: false,
        replyToId: replyTokenData.originalMessageId,
      };

      const replyMessage = await storage.createMessage(messageData);

      // Get event and organization data for notification
      const event = await storage.getEvent(replyTokenData.eventId);
      const organization = await storage.getOrganization(event.organizationId);

      // Send notification to organizer
      if (organization) {
        try {
          await emailServiceEnhanced.sendReplyNotificationToOrganizer(
            organization.email,
            `${organization.contactFirstName} ${organization.contactLastName}`,
            participantName,
            content,
            event.name
          );
          console.log(`✅ Notification envoyée à l'organisateur ${organization.email}`);
        } catch (emailError) {
          console.error("Failed to send reply notification to organizer:", emailError);
        }
      }

      // Mark reply token as used (optional, depending on your business logic)
      await storage.markReplyTokenAsUsed(token);

      res.json({ 
        message: "Reply sent successfully", 
        replyId: replyMessage.id 
      });
    } catch (error) {
      console.error("Handle reply message error:", error);
      res.status(500).json({ message: "Failed to process reply" });
    }
  });

  // SEO Endpoints - Sitemap
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      const baseUrl = process.env.APP_URL || "https://sportpool.onrender.com";
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

      // Add public event pages
      for (const event of events) {
        if (event.date && event.date > new Date()) { // Only future events
          sitemap += `
  <url>
    <loc>${baseUrl}/events/${event.id}</loc>
    <lastmod>${event.updatedAt?.toISOString().split('T')[0] || event.createdAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }
      }

      sitemap += `
</urlset>`;

      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // ========== SUBSCRIPTION & BILLING ROUTES ==========
  // Import subscription services
  const { 
    canCreateEvent, 
    canSendInvitations, 
    incrementEventCount, 
    incrementInvitationCount,
    createStripeSubscription,
    upgradeSubscription,
    cancelSubscription,
    createStripeCustomer,
    initializeSubscriptionPlans,
    SUBSCRIPTION_LIMITS
  } = await import('./stripe');
  
  // Import theme services
  const { 
    getUserPreferences, 
    updateUserPreferences, 
    resetUserPreferences 
  } = await import('./theme');
  
  // Import notification services
  const { 
    createNotification,
    getOrganizationNotifications,
    getUnreadNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    createSystemNotification,
    NotificationTemplates
  } = await import('./notifications');
  
  // Import admin communication services
  const {
    createConversation,
    sendMessage,
    getOrganizationConversations,
    getConversationMessages,
    markMessagesAsRead,
    closeConversation,
    getAllConversationsForAdmin
  } = await import('./admin-communication');

  // Initialize subscription plans on startup
  await initializeSubscriptionPlans();

  // Get subscription info for an organization
  app.get("/api/subscription/info", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const organization = await storage.getOrganization(req.user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organisation not found" });
      }

      const limits = SUBSCRIPTION_LIMITS[organization.subscriptionType];
      
      res.json({
        subscriptionType: organization.subscriptionType,
        subscriptionStatus: organization.subscriptionStatus,
        paymentMethod: organization.paymentMethod,
        subscriptionStartDate: organization.subscriptionStartDate,
        subscriptionEndDate: organization.subscriptionEndDate,
        eventCreatedCount: organization.eventCreatedCount || 0,
        invitationsSentCount: organization.invitationsSentCount || 0,
        limits: limits,
        remainingEvents: limits.maxEvents ? Math.max(0, limits.maxEvents - (organization.eventCreatedCount || 0)) : null,
        remainingInvitations: limits.maxInvitations ? Math.max(0, limits.maxInvitations - (organization.invitationsSentCount || 0)) : null,
      });
    } catch (error) {
      console.error("Subscription info error:", error);
      res.status(500).json({ message: "Failed to get subscription info" });
    }
  });

  // Check if organization can create event
  app.get("/api/subscription/can-create-event", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await canCreateEvent(req.user.organizationId);
      res.json(result);
    } catch (error) {
      console.error("Can create event check error:", error);
      res.status(500).json({ message: "Failed to check event creation permission" });
    }
  });

  // Check if organization can send invitations
  app.post("/api/subscription/can-send-invitations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { count } = req.body;
      if (!count || count <= 0) {
        return res.status(400).json({ message: "Invalid invitation count" });
      }
      
      const result = await canSendInvitations(req.user.organizationId, count);
      res.json(result);
    } catch (error) {
      console.error("Can send invitations check error:", error);
      res.status(500).json({ message: "Failed to check invitation permission" });
    }
  });

  // Create Stripe customer
  app.post("/api/subscription/create-customer", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await createStripeCustomer(req.user.organizationId);
      res.json({ customerId: customer.id });
    } catch (error) {
      console.error("Create Stripe customer error:", error);
      res.status(500).json({ message: "Failed to create Stripe customer" });
    }
  });

  // Upgrade to Premium
  app.post("/api/subscription/upgrade", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { billingInterval, paymentMethodId } = req.body;
      
      if (!billingInterval || !paymentMethodId) {
        return res.status(400).json({ message: "Billing interval and payment method are required" });
      }

      if (!['monthly', 'annual'].includes(billingInterval)) {
        return res.status(400).json({ message: "Invalid billing interval" });
      }

      const result = await upgradeSubscription({
        organizationId: req.user.organizationId,
        newPlanType: 'premium',
        billingInterval,
        paymentMethodId,
      });

      // Create notification
      await createNotification({
        organizationId: req.user.organizationId,
        ...NotificationTemplates.SUBSCRIPTION_UPGRADED('Premium', billingInterval),
        sendEmail: true,
      });

      res.json(result);
    } catch (error) {
      console.error("Subscription upgrade error:", error);
      res.status(500).json({ message: "Failed to upgrade subscription" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await cancelSubscription(req.user.organizationId);
      
      // Create notification
      await createNotification({
        organizationId: req.user.organizationId,
        ...NotificationTemplates.SUBSCRIPTION_CANCELLED(),
        sendEmail: true,
      });

      res.json(result);
    } catch (error) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ========== USER PREFERENCES & THEME ROUTES ==========

  // Get user preferences
  app.get("/api/preferences", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const preferences = await getUserPreferences(req.user.organizationId);
      res.json(preferences);
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to get user preferences" });
    }
  });

  // Update user preferences
  app.put("/api/preferences", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { theme, language, emailNotifications, pushNotifications, marketingEmails } = req.body;
      
      const result = await updateUserPreferences(req.user.organizationId, {
        theme,
        language,
        emailNotifications,
        pushNotifications,
        marketingEmails,
      });

      res.json(result);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Reset user preferences
  app.post("/api/preferences/reset", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await resetUserPreferences(req.user.organizationId);
      res.json(result);
    } catch (error) {
      console.error("Reset preferences error:", error);
      res.status(500).json({ message: "Failed to reset user preferences" });
    }
  });

  // ========== ENHANCED NOTIFICATIONS ROUTES ==========

  // Get notifications for organization
  app.get("/api/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const notifications = await getOrganizationNotifications(req.user.organizationId, limit, offset);
      const unreadCount = await getUnreadNotificationCount(req.user.organizationId);
      
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/unread-count", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const count = await getUnreadNotificationCount(req.user.organizationId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const result = await markNotificationAsRead(id, req.user.organizationId);
      
      if (!result) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await markAllNotificationsAsRead(req.user.organizationId);
      res.json(result);
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const result = await deleteNotification(id, req.user.organizationId);
      
      if (!result) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ========== ADMIN COMMUNICATION ROUTES ==========

  // Create conversation with admin
  app.post("/api/admin/conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { subject, message, priority } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }

      const conversation = await createConversation({
        organizationId: req.user.organizationId,
        subject,
        message,
        priority,
      });

      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get organization conversations
  app.get("/api/admin/conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const conversations = await getOrganizationConversations(req.user.organizationId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Get conversation messages
  app.get("/api/admin/conversations/:id/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const messages = await getConversationMessages(id, req.user.organizationId);
      
      // Mark messages as read
      await markMessagesAsRead(id, req.user.organizationId, 'organization');
      
      res.json(messages);
    } catch (error) {
      console.error("Get conversation messages error:", error);
      res.status(500).json({ message: "Failed to get conversation messages" });
    }
  });

  // Send message in conversation
  app.post("/api/admin/conversations/:id/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const result = await sendMessage({
        conversationId: id,
        senderId: req.user.organizationId,
        senderType: 'organization',
        message,
      });

      res.json(result);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Close conversation
  app.put("/api/admin/conversations/:id/close", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const result = await closeConversation(id, 'organization');
      res.json(result);
    } catch (error) {
      console.error("Close conversation error:", error);
      res.status(500).json({ message: "Failed to close conversation" });
    }
  });

  // ========== ADMIN ONLY ROUTES ==========

  // Get all conversations for admin
  app.get("/api/admin/all-conversations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      const organization = await storage.getOrganization(req.user.organizationId);
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const conversations = await getAllConversationsForAdmin();
      res.json(conversations);
    } catch (error) {
      console.error("Get all conversations error:", error);
      res.status(500).json({ message: "Failed to get all conversations" });
    }
  });

  // Send admin message
  app.post("/api/admin/conversations/:id/admin-message", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      const organization = await storage.getOrganization(req.user.organizationId);
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const result = await sendMessage({
        conversationId: id,
        senderId: req.user.organizationId,
        senderType: 'admin',
        message,
      });

      res.json(result);
    } catch (error) {
      console.error("Send admin message error:", error);
      res.status(500).json({ message: "Failed to send admin message" });
    }
  });

  // Create system notification (admin only)
  app.post("/api/admin/system-notification", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      const organization = await storage.getOrganization(req.user.organizationId);
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { type, title, message, sendEmail } = req.body;
      
      if (!type || !title || !message) {
        return res.status(400).json({ message: "Type, title and message are required" });
      }

      const result = await createSystemNotification({
        type,
        title,
        message,
        sendEmail,
      });

      res.json(result);
    } catch (error) {
      console.error("Create system notification error:", error);
      res.status(500).json({ message: "Failed to create system notification" });
    }
  });

  // URL sanitization middleware for security
  app.use((req, res, next) => {
    // Prevent path traversal attacks
    if (req.path.includes('..') || req.path.includes('%2e%2e')) {
      return res.status(400).json({ error: "Invalid path" });
    }
    
    // Prevent null bytes
    if (req.path.includes('\0')) {
      return res.status(400).json({ error: "Invalid characters in path" });
    }
    
    next();
  });

  const server = createServer(app);
  return server;
}