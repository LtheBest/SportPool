import type { Express } from "express";
import * as express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import { randomUUID } from "crypto";
import { insertOrganizationSchema, insertEventSchema, insertEventParticipantSchema, insertMessageSchema } from "@shared/schema";
import { emailService } from "./email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Session interface
declare module "express-session" {
  interface SessionData {
    organizationId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ---------- uploads dir & static ----------
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Serve static files from the uploads directory
  app.use("/uploads", express.static(uploadsDir));
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.organizationId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const data = insertOrganizationSchema.parse(req.body);

      // Check if organization already exists
      const existing = await storage.getOrganizationByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "An organization with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create organization
      const organization = await storage.createOrganization({
        ...data,
        password: hashedPassword,
      });

      // Set session
      req.session.organizationId = organization.id;

      res.json({
        organization: { ...organization, password: undefined },
        message: "Organization registered successfully"
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find organization
      const organization = await storage.getOrganizationByEmail(email);
      if (!organization) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, organization.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.organizationId = organization.id;

      res.json({
        organization: { ...organization, password: undefined },
        message: "Login successful"
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const organization = await storage.getOrganization(req.session.organizationId!);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json({ ...organization, password: undefined });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Password reset routes
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

      if (!emailSent) {
        console.error("Failed to send password reset email");
        return res.status(500).json({ message: "Failed to send password reset email" });
      }

      res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Get and validate token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Get organization
      const organization = await storage.getOrganizationByEmail(resetToken.email);
      if (!organization) {
        return res.status(400).json({ message: "Associated account not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateOrganization(organization.id, {
        password: hashedPassword,
      });

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(resetToken.id);

      // Clean up expired tokens
      await storage.cleanupExpiredTokens();

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid token", valid: false });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Token expired", valid: false });
      }

      res.json({ message: "Token is valid", valid: true });
    } catch (error) {
      console.error("Validate reset token error:", error);
      res.status(500).json({ message: "Failed to validate token", valid: false });
    }
  });

  // Organization routes


  // ---------- Multer diskStorage (garde l'extension) ----------
  const storageMulter = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, filename);
    },
  });
  const upload = multer({ storage: storageMulter });

  // Upload logo route
  app.post("/api/profile/logo", requireAuth, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Aucun fichier" });
      // URL publique (servie par express.static ci-dessus)
      const logoUrl = `/uploads/${req.file.filename}`;
      await storage.updateOrganization(req.session.organizationId!, { logoUrl });
      res.json({ url: logoUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Upload failed" });
    }
  });


  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const data = insertOrganizationSchema.partial().parse(req.body);

      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      const organization = await storage.updateOrganization(req.session.organizationId!, data);
      res.json({ ...organization, password: undefined });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Update failed" });
    }
  });

  // Event routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEventsByOrganization(req.session.organizationId!);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {

      const dataToValidate = {
        ...req.body,
        organizationId: req.session.organizationId!,
      };

      // Conversion explicite de la date (string -> Date)
      if (typeof dataToValidate.date === "string") {
        const parsedDate = new Date(dataToValidate.date);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        dataToValidate.date = parsedDate;
      }

      const data = insertEventSchema.parse(dataToValidate);

      const event = await storage.createEvent(data);

      // Send invitations if emails provided
      if (req.body.inviteEmails && Array.isArray(req.body.inviteEmails)) {
        const organization = await storage.getOrganization(req.session.organizationId!);
        
        for (const email of req.body.inviteEmails) {
          const token = randomUUID();
          await storage.createEventInvitation({
            eventId: event.id,
            email: email.trim(),
            token,
          });

          // Send email invitation via Mailjet
          if (organization) {
            const emailSent = await emailService.sendEventInvitationEmail(
              email.trim(),
              event.name,
              organization.name,
              event.date,
              token
            );
            
            if (emailSent) {
              console.log(`Invitation email sent to ${email} with token: ${token}`);
            } else {
              console.error(`Failed to send invitation email to ${email}`);
            }
          }
        }
      }

      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create event" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
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
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
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
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found" });
      }

      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event participants routes
  app.get("/api/events/:id/participants", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
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
      await storage.removeEventParticipant(req.params.id);
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Remove participant error:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // Invitation routes (public)
  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getEventInvitation(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      const event = await storage.getEvent(invitation.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json({
        invitation,
        event,
        organization: { ...organization, password: undefined },
      });
    } catch (error) {
      console.error("Get invitation error:", error);
      res.status(500).json({ message: "Failed to get invitation" });
    }
  });

  app.post("/api/invitations/:token/respond", async (req, res) => {
    try {
      const invitation = await storage.getEventInvitation(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation already responded to" });
      }

      const { name, role, availableSeats, comment } = req.body;

      if (!name || !role) {
        return res.status(400).json({ message: "Name and role are required" });
      }

      if (role === "driver" && (!availableSeats || availableSeats < 1 || availableSeats > 7)) {
        return res.status(400).json({ message: "Drivers must specify 1-7 available seats" });
      }

      // Add participant
      await storage.addEventParticipant({
        eventId: invitation.eventId,
        name,
        email: invitation.email,
        role,
        availableSeats: role === "driver" ? availableSeats : null,
        comment,
      });

      // Update invitation status
      await storage.updateEventInvitation(invitation.id, {
        status: "accepted",
      });

      res.json({ message: "Response recorded successfully" });
    } catch (error) {
      console.error("Respond to invitation error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to respond to invitation" });
    }
  });

  // POST create shareable invitation token (auth required)
  app.post("/api/events/:id/invitations", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found" });
      }
      const token = randomUUID();
      // store an invitation with a placeholder email so we can reuse the invitation flow
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


  // Messages routes
  app.get("/api/events/:id/messages", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
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
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(req.session.organizationId!);
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

      // Send email notifications to all event participants
      try {
        const participants = await storage.getEventParticipants(event.id);
        
        for (const participant of participants) {
          const emailSent = await emailService.sendMessageNotificationEmail(
            participant.email,
            participant.name,
            event.name,
            organization.name,
            organization.name,
            data.content,
            event.id,
            message.id
          );
          
          if (emailSent) {
            console.log(`Message notification sent to ${participant.email}`);
          } else {
            console.error(`Failed to send message notification to ${participant.email}`);
          }
        }
      } catch (error) {
        console.error("Failed to send message notifications:", error);
        // Don't fail the request if notification emails fail
      }

      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // DELETE message
  app.delete("/api/events/:eventId/messages/:messageId", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event || event.organizationId !== req.session.organizationId!) {
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

      // Verify that the sender is a participant of this event
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

      // Notify the organizer of the new participant message
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
        // Don't fail the request if notification email fails
      }

      res.json(message);
    } catch (error) {
      console.error("Create participant message error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
    }
  });

  // Reply to message via email (public endpoint)
  app.get("/api/events/:eventId/reply", async (req, res) => {
    try {
      const { eventId } = req.params;
      const { messageId, email } = req.query;

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Verify participant
      const participants = await storage.getEventParticipants(eventId);
      const participant = participants.find(p => p.email === email);
      
      if (!participant) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the original message if messageId provided
      let originalMessage = null;
      if (messageId) {
        originalMessage = await storage.getMessage(messageId as string);
      }

      // Return HTML page for replying to message
      const replyPageHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Répondre au message - ${event.name}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .event-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .original-message { background-color: #e9ecef; padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            textarea { min-height: 120px; resize: vertical; }
            .btn { background-color: #007bff; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            .btn:hover { background-color: #0056b3; }
            .success { background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-bottom: 20px; display: none; }
            .error { background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; display: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Répondre au message</h1>
              <h2>${event.name}</h2>
            </div>
            
            <div class="event-info">
              <strong>Organisé par :</strong> ${organization.name}<br>
              <strong>Date :</strong> ${event.date.toLocaleDateString('fr-FR')}<br>
              <strong>Vous répondez en tant que :</strong> ${participant.name}
            </div>
            
            ${originalMessage ? `
              <div class="original-message">
                <strong>Message original de ${originalMessage.senderName} :</strong><br>
                "${originalMessage.content}"
              </div>
            ` : ''}
            
            <div id="success" class="success">Message envoyé avec succès !</div>
            <div id="error" class="error">Erreur lors de l'envoi du message.</div>
            
            <form id="replyForm">
              <div class="form-group">
                <label for="content">Votre message :</label>
                <textarea id="content" name="content" placeholder="Tapez votre message ici..." required></textarea>
              </div>
              
              <button type="submit" class="btn">Envoyer la réponse</button>
            </form>
          </div>

          <script>
            document.getElementById('replyForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const content = document.getElementById('content').value;
              if (!content.trim()) return;
              
              try {
                const response = await fetch('/api/events/${eventId}/messages/participant', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    senderName: '${participant.name}',
                    senderEmail: '${participant.email}',
                    content: content
                  })
                });
                
                if (response.ok) {
                  document.getElementById('success').style.display = 'block';
                  document.getElementById('error').style.display = 'none';
                  document.getElementById('content').value = '';
                } else {
                  document.getElementById('error').style.display = 'block';
                  document.getElementById('success').style.display = 'none';
                }
              } catch (error) {
                document.getElementById('error').style.display = 'block';
                document.getElementById('success').style.display = 'none';
              }
            });
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(replyPageHtml);
    } catch (error) {
      console.error("Reply page error:", error);
      res.status(500).json({ message: "Failed to load reply page" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEventsByOrganization(req.session.organizationId!);
      const activeEvents = events.filter(e => e.status === "confirmed" && new Date(e.date) >= new Date());

      let totalParticipants = 0;
      let totalDrivers = 0;
      let totalSeats = 0;

      for (const event of events) {
        const participants = await storage.getEventParticipants(event.id);
        totalParticipants += participants.length;
        const drivers = participants.filter(p => p.role === "driver");
        totalDrivers += drivers.length;
        totalSeats += drivers.reduce((sum, d) => sum + (d.availableSeats || 0), 0);
      }

      res.json({
        activeEvents: activeEvents.length,
        totalParticipants,
        totalDrivers,
        totalSeats,
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
