import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import { randomUUID } from "crypto";
import { insertOrganizationSchema, insertEventSchema, insertEventParticipantSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

// Session interface
declare module "express-session" {
  interface SessionData {
    organizationId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Organization routes
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
      const data = insertEventSchema.parse({
        ...req.body,
        organizationId: req.session.organizationId!,
      });

      const event = await storage.createEvent(data);
      
      // Send invitations if emails provided
      if (req.body.inviteEmails && Array.isArray(req.body.inviteEmails)) {
        for (const email of req.body.inviteEmails) {
          const token = randomUUID();
          await storage.createEventInvitation({
            eventId: event.id,
            email: email.trim(),
            token,
          });
          
          // TODO: Send email invitation
          console.log(`Invitation sent to ${email} with token: ${token}`);
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
      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
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

      const data = insertMessageSchema.parse({
        eventId: req.params.id,
        senderName,
        senderEmail,
        content,
        isFromOrganizer: false,
      });

      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      console.error("Create participant message error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send message" });
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
