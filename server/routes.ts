import type { Express } from "express";
import * as express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import { randomUUID } from "crypto";
import { insertOrganizationSchema, insertEventSchema, insertEventParticipantSchema, insertMessageSchema } from "@shared/schema";
import { emailServiceEnhanced as emailService } from "./email-enhanced";
import { chatbotService } from "./openai";
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

      // Automatically send invitations to all existing participants and new emails
      const organization = await storage.getOrganization(req.session.organizationId!);
      if (organization) {
        let emailsToInvite: string[] = [];
        
        // Add emails from existing participants in other events
        const existingEvents = await storage.getEventsByOrganization(req.session.organizationId!);
        const existingEmails = new Set<string>();
        
        for (const existingEvent of existingEvents) {
          const participants = await storage.getEventParticipants(existingEvent.id);
          participants.forEach(p => existingEmails.add(p.email));
        }
        
        // Add existing participants emails
        emailsToInvite.push(...Array.from(existingEmails));
        
        // Add new emails from the request if provided
        if (req.body.inviteEmails && Array.isArray(req.body.inviteEmails)) {
          const newEmails = req.body.inviteEmails.map((email: string) => email.trim()).filter(Boolean);
          emailsToInvite.push(...newEmails);
        }
        
        // Remove duplicates
        emailsToInvite = Array.from(new Set(emailsToInvite));
        
        // Generate event link (public link to view event details)
        const eventLink = `${process.env.APP_URL || 'https://sportpool.onrender.com'}/events/${event.id}`;
        
        // Send invitations using bulk email function
        if (emailsToInvite.length > 0) {
          const results = await emailService.sendBulkEventInvitations(
            emailsToInvite,
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
          
          console.log(`Event invitations sent: ${results.success} successful, ${results.failed.length} failed`);
          if (results.failed.length > 0) {
            console.error('Failed to send invitations to:', results.failed);
          }
          
          // Create invitation records for tracking
          for (const email of emailsToInvite) {
            try {
              const token = randomUUID();
              await storage.createEventInvitation({
                eventId: event.id,
                email: email.trim(),
                token,
              });
            } catch (error) {
              console.error(`Failed to create invitation record for ${email}:`, error);
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

  // Public route to view event details (for invitations)
  app.get("/api/events/:id/public", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get organization info
      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Get participants count
      const participants = await storage.getEventParticipants(event.id);
      
      res.json({
        ...event,
        organization: {
          name: organization.name,
          logoUrl: organization.logoUrl,
          contactFirstName: organization.contactFirstName,
          contactLastName: organization.contactLastName
        },
        participantsCount: participants.length,
        participants: participants.map(p => ({
          name: p.name,
          role: p.role,
          availableSeats: p.availableSeats
        }))
      });
    } catch (error) {
      console.error("Get public event error:", error);
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

  // Update participant by organizer
  app.put("/api/participants/:id", requireAuth, async (req, res) => {
    try {
      const { role, availableSeats, status } = req.body;
      
      // Get the participant to verify event ownership
      const participant = await storage.getEventParticipant(req.params.id);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      const event = await storage.getEvent(participant.eventId);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found or access denied" });
      }

      // Validation
      if (role && !["passenger", "driver"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (role === "driver" && (!availableSeats || availableSeats < 1 || availableSeats > 7)) {
        return res.status(400).json({ message: "Drivers must specify 1-7 available seats" });
      }

      if (status && !["pending", "confirmed", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Update participant
      const updatedData: any = {};
      if (role !== undefined) {
        updatedData.role = role;
        updatedData.availableSeats = role === "driver" ? availableSeats : null;
      }
      if (availableSeats !== undefined && participant.role === "driver") {
        updatedData.availableSeats = availableSeats;
      }
      if (status !== undefined) {
        updatedData.status = status;
      }

      const updatedParticipant = await storage.updateEventParticipant(req.params.id, updatedData);
      res.json(updatedParticipant);
    } catch (error) {
      console.error("Update participant error:", error);
      res.status(500).json({ message: "Failed to update participant" });
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

  // Public route to join event directly (without token)
  app.post("/api/events/:id/join", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const { name, email, role, availableSeats, comment } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ message: "Name, email and role are required" });
      }

      if (role === "driver" && (!availableSeats || availableSeats < 1 || availableSeats > 7)) {
        return res.status(400).json({ message: "Drivers must specify 1-7 available seats" });
      }

      // Check if already registered
      const existingParticipants = await storage.getEventParticipants(event.id);
      const alreadyRegistered = existingParticipants.some(p => p.email.toLowerCase() === email.toLowerCase());
      
      if (alreadyRegistered) {
        return res.status(400).json({ message: "You are already registered for this event" });
      }

      // Add participant
      await storage.addEventParticipant({
        eventId: event.id,
        name,
        email: email.toLowerCase(),
        role,
        availableSeats: role === "driver" ? availableSeats : null,
        comment,
      });

      res.json({ message: "Successfully registered for the event!" });
    } catch (error) {
      console.error("Join event error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to join event" });
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

      // Redirect to public event page
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

      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Generate event link (public link to view event details)
      const eventLink = `${process.env.APP_URL || 'https://sportpool.onrender.com'}/events/${event.id}`;

      // Send invitation email
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
        // Create invitation record for tracking
        try {
          const token = randomUUID();
          await storage.createEventInvitation({
            eventId: event.id,
            email: email.trim(),
            token,
          });
        } catch (error) {
          console.error(`Failed to create invitation record for ${email}:`, error);
          // Don't fail the request if invitation record fails
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

  // Participant change requests routes
  app.get("/api/events/:id/change-requests", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
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

      // Get the participant
      const participant = await storage.getEventParticipant(req.params.id);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      // Create the change request
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

      // Notify the organizer
      const event = await storage.getEvent(participant.eventId);
      if (event) {
        const organization = await storage.getOrganization(event.organizationId);
        if (organization) {
          // Send notification email to organizer
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
              request.id // Use request ID as message ID for tracking
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

      // Verify organizer has access to this event
      const event = await storage.getEvent(request.eventId);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found or access denied" });
      }

      // Update the request
      const updatedRequest = await storage.updateParticipantChangeRequest(req.params.id, {
        status,
        processedAt: new Date(),
      });

      // If approved, apply the changes
      if (status === "approved") {
        try {
          if (request.requestType === "role_change") {
            await storage.updateEventParticipant(request.participantId, {
              role: request.requestedValue as "passenger" | "driver",
              availableSeats: request.requestedValue === "driver" ? 1 : null // Default to 1 seat for new drivers
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

      // Notify the participant of the decision
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

  // Chatbot routes
  app.post("/api/chatbot/message", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const response = await chatbotService.sendMessage(message, conversationHistory || []);
      res.json(response);
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({ 
        message: "Je rencontre un problème technique. Veuillez réessayer.",
        success: false 
      });
    }
  });

  app.post("/api/chatbot/event-suggestions", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      const response = await chatbotService.getEventSuggestions(query);
      res.json(response);
    } catch (error) {
      console.error("Event suggestions error:", error);
      res.status(500).json({ 
        message: "Je ne peux pas générer de suggestions pour le moment.",
        success: false 
      });
    }
  });

  app.post("/api/chatbot/organization-help", requireAuth, async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      // Get organization info
      const organization = await storage.getOrganization(req.session.organizationId!);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const response = await chatbotService.getOrganizationHelp(query, organization.type);
      res.json(response);
    } catch (error) {
      console.error("Organization help error:", error);
      res.status(500).json({ 
        message: "Je ne peux pas vous aider pour le moment.",
        success: false 
      });
    }
  });

  // Enhanced dashboard stats with real-time updates
  app.get("/api/dashboard/stats/realtime", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEventsByOrganization(req.session.organizationId!);
      const activeEvents = events.filter(e => e.status === "confirmed" && new Date(e.date) >= new Date());

      let totalParticipants = 0;
      let totalDrivers = 0;
      let totalSeats = 0;
      let occupiedSeats = 0;

      const eventStats = [];

      for (const event of activeEvents) {
        const participants = await storage.getEventParticipants(event.id);
        const eventParticipants = participants.length;
        const drivers = participants.filter(p => p.role === "driver");
        const passengers = participants.filter(p => p.role === "passenger");
        const eventDrivers = drivers.length;
        const eventSeats = drivers.reduce((sum, d) => sum + (d.availableSeats || 0), 0);
        const eventOccupiedSeats = passengers.length;

        totalParticipants += eventParticipants;
        totalDrivers += eventDrivers;
        totalSeats += eventSeats;
        occupiedSeats += eventOccupiedSeats;

        eventStats.push({
          eventId: event.id,
          eventName: event.name,
          participants: eventParticipants,
          drivers: eventDrivers,
          availableSeats: eventSeats,
          occupiedSeats: eventOccupiedSeats,
          availableSeatsRemaining: eventSeats - eventOccupiedSeats
        });
      }

      res.json({
        activeEvents: activeEvents.length,
        totalParticipants,
        totalDrivers,
        totalSeats,
        occupiedSeats,
        availableSeatsRemaining: totalSeats - occupiedSeats,
        eventStats
      });
    } catch (error) {
      console.error("Get realtime dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Download event calendar file (.ics)
  app.get("/api/events/:id/calendar", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const icalContent = emailService.generateICalendar(
        event.name,
        event.date,
        event.duration || "2h",
        event.meetingPoint,
        event.destination,
        event.description || "",
        organization.name
      );

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${event.name.replace(/[^a-z0-9]/gi, '_')}.ics"`);
      res.send(icalContent);
    } catch (error) {
      console.error("Generate calendar error:", error);
      res.status(500).json({ message: "Failed to generate calendar file" });
    }
  });

  // Send reminder emails for upcoming events
  app.post("/api/events/:id/send-reminders", requireAuth, async (req, res) => {
    try {
      const { hoursBeforeEvent = 24 } = req.body;

      const event = await storage.getEvent(req.params.id);
      if (!event || event.organizationId !== req.session.organizationId!) {
        return res.status(404).json({ message: "Event not found" });
      }

      const organization = await storage.getOrganization(event.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const participants = await storage.getEventParticipants(event.id);
      const eventLink = `${process.env.APP_URL || 'https://sportpool.onrender.com'}/events/${event.id}`;

      const results = {
        success: 0,
        failed: [] as string[]
      };

      for (const participant of participants) {
        try {
          const sent = await emailService.sendEventReminderEmail(
            participant.email,
            participant.name,
            event.name,
            organization.name,
            event.date,
            event.meetingPoint,
            event.destination,
            eventLink,
            hoursBeforeEvent
          );

          if (sent) {
            results.success++;
          } else {
            results.failed.push(participant.email);
          }
        } catch (error) {
          console.error(`Failed to send reminder to ${participant.email}:`, error);
          results.failed.push(participant.email);
        }
      }

      res.json({
        message: `Rappels envoyés : ${results.success} réussis, ${results.failed.length} échecs`,
        results
      });
    } catch (error) {
      console.error("Send reminders error:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  // Send email with custom template
  app.post("/api/send-custom-email", requireAuth, async (req, res) => {
    try {
      const { email, name, content, subject } = req.body;

      if (!email || !name || !content) {
        return res.status(400).json({ message: "Email, name, and content are required" });
      }

      const success = await emailService.sendCustomTemplateEmail(email, name, content, subject);

      if (success) {
        res.json({ message: "Email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Send custom email error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Health check endpoint for Docker and monitoring
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const organizations = await storage.getOrganizations();
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "connected",
        services: {
          storage: "operational",
          email: process.env.SENDGRID_API_KEY ? "configured" : "not configured"
        }
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Email reply page for participants
  app.get("/reply/:eventId/:messageId", async (req, res) => {
    try {
      const { eventId, messageId } = req.params;
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Événement non trouvé - SportPool</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; color: #c33; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Événement non trouvé</h2>
              <p>L'événement que vous recherchez n'existe pas ou n'est plus disponible.</p>
            </div>
          </body>
          </html>
        `);
      }

      const message = await storage.getMessage(messageId);
      if (!message || message.eventId !== eventId) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Message non trouvé - SportPool</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; color: #c33; }
            </style>
          </head>
          <body>
            <div class="error">
              <h2>Message non trouvé</h2>
              <p>Le message que vous recherchez n'existe pas ou n'est plus disponible.</p>
            </div>
          </body>
          </html>
        `);
      }

      const organization = await storage.getOrganization(event.organizationId);
      
      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Répondre au message - ${event.name}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 700px; 
              margin: 0 auto; 
              padding: 20px; 
              background-color: #f8fafc;
              color: #334155;
            }
            .container { 
              background: white; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
              color: white; 
              padding: 30px; 
              text-align: center; 
            }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .message-info { 
              background: #f1f5f9; 
              border-left: 4px solid #3b82f6; 
              padding: 20px; 
              margin-bottom: 30px; 
              border-radius: 0 8px 8px 0; 
            }
            .form-group { margin-bottom: 20px; }
            label { 
              display: block; 
              margin-bottom: 8px; 
              font-weight: 600; 
              color: #374151; 
            }
            input, textarea { 
              width: 100%; 
              padding: 12px; 
              border: 2px solid #e5e7eb; 
              border-radius: 8px; 
              font-size: 16px; 
              transition: border-color 0.2s;
            }
            input:focus, textarea:focus { 
              outline: none; 
              border-color: #3b82f6; 
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            textarea { resize: vertical; min-height: 120px; }
            .btn { 
              background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
              color: white; 
              padding: 12px 24px; 
              border: none; 
              border-radius: 8px; 
              font-size: 16px; 
              font-weight: 600; 
              cursor: pointer; 
              transition: all 0.2s;
            }
            .btn:hover { 
              transform: translateY(-1px); 
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); 
            }
            .btn:disabled { 
              opacity: 0.6; 
              cursor: not-allowed; 
              transform: none; 
            }
            .success { 
              background: #ecfdf5; 
              border: 1px solid #a7f3d0; 
              color: #065f46; 
              padding: 16px; 
              border-radius: 8px; 
              margin-bottom: 20px; 
              display: none; 
            }
            .error { 
              background: #fef2f2; 
              border: 1px solid #fca5a5; 
              color: #991b1b; 
              padding: 16px; 
              border-radius: 8px; 
              margin-bottom: 20px; 
              display: none; 
            }
            .loading { display: none; align-items: center; margin-top: 10px; }
            .spinner { 
              width: 20px; 
              height: 20px; 
              border: 2px solid #e5e7eb; 
              border-top: 2px solid #3b82f6; 
              border-radius: 50%; 
              animation: spin 1s linear infinite; 
              margin-right: 10px; 
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 Répondre au message</h1>
              <p>Événement : ${event.name}</p>
            </div>
            <div class="content">
              <div class="message-info">
                <h3>Message original</h3>
                <p><strong>De :</strong> ${message.senderName}</p>
                <p><strong>Date :</strong> ${new Date(message.createdAt).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                <p><strong>Message :</strong></p>
                <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
                  ${message.content.replace(/\n/g, '<br>')}
                </div>
              </div>

              <div class="success" id="success-message">
                ✅ Votre réponse a été envoyée avec succès !
              </div>
              
              <div class="error" id="error-message">
                ❌ Une erreur s'est produite. Veuillez réessayer.
              </div>

              <form id="reply-form">
                <div class="form-group">
                  <label for="senderName">Votre nom *</label>
                  <input type="text" id="senderName" name="senderName" required>
                </div>
                
                <div class="form-group">
                  <label for="senderEmail">Votre email *</label>
                  <input type="email" id="senderEmail" name="senderEmail" required>
                </div>
                
                <div class="form-group">
                  <label for="content">Votre réponse *</label>
                  <textarea id="content" name="content" placeholder="Écrivez votre réponse ici..." required></textarea>
                </div>
                
                <button type="submit" class="btn" id="submit-btn">
                  Envoyer la réponse
                </button>
                
                <div class="loading" id="loading">
                  <div class="spinner"></div>
                  <span>Envoi en cours...</span>
                </div>
              </form>
            </div>
          </div>

          <script>
            document.getElementById('reply-form').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const submitBtn = document.getElementById('submit-btn');
              const loading = document.getElementById('loading');
              const successMessage = document.getElementById('success-message');
              const errorMessage = document.getElementById('error-message');
              
              // Reset messages
              successMessage.style.display = 'none';
              errorMessage.style.display = 'none';
              
              // Show loading
              submitBtn.disabled = true;
              loading.style.display = 'flex';
              
              const formData = new FormData(e.target);
              const data = {
                senderName: formData.get('senderName'),
                senderEmail: formData.get('senderEmail'),
                content: formData.get('content'),
                replyToMessageId: '${messageId}'
              };
              
              try {
                const response = await fetch('/api/events/${eventId}/messages/participant', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(data)
                });
                
                if (response.ok) {
                  successMessage.style.display = 'block';
                  e.target.reset();
                } else {
                  const errorData = await response.json();
                  errorMessage.textContent = '❌ ' + (errorData.message || 'Une erreur s\\'est produite');
                  errorMessage.style.display = 'block';
                }
              } catch (error) {
                errorMessage.textContent = '❌ Erreur de connexion. Veuillez réessayer.';
                errorMessage.style.display = 'block';
              }
              
              // Hide loading
              submitBtn.disabled = false;
              loading.style.display = 'none';
            });
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Email reply page error:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Erreur - SportPool</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background-color: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; color: #c33; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Erreur</h2>
            <p>Une erreur inattendue s'est produite. Veuillez réessayer plus tard.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
