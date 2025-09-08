import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { enum: ["club", "association", "company"] }).notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  description: text("description"),
  sports: json("sports").$type<string[]>().default([]),
  logoUrl: text("logo_url"),
  contactFirstName: text("contact_first_name").notNull(),
  contactLastName: text("contact_last_name").notNull(),
  sirenNumber: varchar("siren_number", { length: 9 }), // Numéro SIREN (9 chiffres)
  password: text("password").notNull(),
  role: varchar("role", { enum: ["organization", "admin"] }).default("organization"),
  isActive: boolean("is_active").default(true),
  features: json("features").$type<string[]>().default([]), // Features available to this organization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  duration: text("duration"),
  meetingPoint: text("meeting_point").notNull(),
  destination: text("destination").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // e.g., "weekly", "monthly"
  status: varchar("status", { enum: ["draft", "confirmed", "cancelled"] }).default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event participants table
export const eventParticipants = pgTable("event_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: varchar("role", { enum: ["passenger", "driver"] }).notNull(),
  availableSeats: integer("available_seats"), // null for passengers
  comment: text("comment"),
  status: varchar("status", { enum: ["pending", "confirmed", "declined"] }).default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event invitations table
export const eventInvitations = pgTable("event_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: varchar("status", { enum: ["pending", "accepted", "declined"] }).default("pending"),
  sentAt: timestamp("sent_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  content: text("content").notNull(),
  isFromOrganizer: boolean("is_from_organizer").default(false),
  isBroadcast: boolean("is_broadcast").default(false),
  replyToId: varchar("reply_to_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: varchar("type", { enum: ["info", "success", "warning", "error"] }).notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  actionUrl: text("action_url"),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Participant change requests table
export const participantChangeRequests = pgTable("participant_change_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: varchar("participant_id").notNull().references(() => eventParticipants.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  requestType: varchar("request_type", { enum: ["role_change", "seat_change", "withdrawal"] }).notNull(),
  currentValue: text("current_value"),
  requestedValue: text("requested_value"),
  reason: text("reason"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  participants: many(eventParticipants),
  invitations: many(eventInvitations),
  messages: many(messages),
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, {
    fields: [eventParticipants.eventId],
    references: [events.id],
  }),
}));

export const eventInvitationsRelations = relations(eventInvitations, ({ one }) => ({
  event: one(events, {
    fields: [eventInvitations.eventId],
    references: [events.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  event: one(events, {
    fields: [messages.eventId],
    references: [events.id],
  }),
}));

export const participantChangeRequestsRelations = relations(participantChangeRequests, ({ one }) => ({
  participant: one(eventParticipants, {
    fields: [participantChangeRequests.participantId],
    references: [eventParticipants.id],
  }),
  event: one(events, {
    fields: [participantChangeRequests.eventId],
    references: [events.id],
  }),
}));

// Password reset tokens have no relations needed

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({
  id: true,
  createdAt: true,
});

export const insertEventInvitationSchema = createInsertSchema(eventInvitations).omit({
  id: true,
  sentAt: true,
  respondedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertParticipantChangeRequestSchema = createInsertSchema(participantChangeRequests).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;
export type EventInvitation = typeof eventInvitations.$inferSelect;
export type InsertEventInvitation = z.infer<typeof insertEventInvitationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ParticipantChangeRequest = typeof participantChangeRequests.$inferSelect;
export type InsertParticipantChangeRequest = z.infer<typeof insertParticipantChangeRequestSchema>;
