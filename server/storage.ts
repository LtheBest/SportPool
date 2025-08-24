import {
  organizations,
  events,
  eventParticipants,
  eventInvitations,
  messages,
  passwordResetTokens,
  participantChangeRequests,
  type Organization,
  type InsertOrganization,
  type Event,
  type InsertEvent,
  type EventParticipant,
  type InsertEventParticipant,
  type EventInvitation,
  type InsertEventInvitation,
  type Message,
  type InsertMessage,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type ParticipantChangeRequest,
  type InsertParticipantChangeRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationByEmail(email: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getEventsByOrganization(organizationId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;

  // Event Participants
  getEventParticipant(id: string): Promise<EventParticipant | undefined>;
  getEventParticipants(eventId: string): Promise<EventParticipant[]>;
  addEventParticipant(participant: InsertEventParticipant): Promise<EventParticipant>;
  removeEventParticipant(id: string): Promise<void>;
  updateEventParticipant(id: string, data: Partial<InsertEventParticipant>): Promise<EventParticipant>;

  // Event Invitations
  getEventInvitation(token: string): Promise<EventInvitation | undefined>;
  getEventInvitations(eventId: string): Promise<EventInvitation[]>;
  createEventInvitation(invitation: InsertEventInvitation): Promise<EventInvitation>;
  updateEventInvitation(id: string, data: Partial<InsertEventInvitation>): Promise<EventInvitation>;

  // Messages
  getEventMessages(eventId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(id: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;

  // Participant Change Requests
  createParticipantChangeRequest(request: InsertParticipantChangeRequest): Promise<ParticipantChangeRequest>;
  getParticipantChangeRequestsByEvent(eventId: string): Promise<ParticipantChangeRequest[]>;
  getParticipantChangeRequest(id: string): Promise<ParticipantChangeRequest | undefined>;
  updateParticipantChangeRequest(id: string, data: Partial<InsertParticipantChangeRequest>): Promise<ParticipantChangeRequest>;
}

export class DatabaseStorage implements IStorage {
  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationByEmail(email: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.email, email));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(org).returning();
    return newOrg;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    const [updatedOrg] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrg;
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventsByOrganization(organizationId: string): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.organizationId, organizationId))
      .orderBy(desc(events.date));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Event Participants
  async getEventParticipant(id: string): Promise<EventParticipant | undefined> {
    const [participant] = await db
      .select()
      .from(eventParticipants)
      .where(eq(eventParticipants.id, id));
    return participant;
  }

  async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    return await db
      .select()
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId))
      .orderBy(desc(eventParticipants.createdAt));
  }

  async addEventParticipant(participant: InsertEventParticipant): Promise<EventParticipant> {
    const [newParticipant] = await db.insert(eventParticipants).values(participant).returning();
    return newParticipant;
  }

  async removeEventParticipant(id: string): Promise<void> {
    await db.delete(eventParticipants).where(eq(eventParticipants.id, id));
  }

  async updateEventParticipant(id: string, data: Partial<InsertEventParticipant>): Promise<EventParticipant> {
    const [updatedParticipant] = await db
      .update(eventParticipants)
      .set(data)
      .where(eq(eventParticipants.id, id))
      .returning();
    return updatedParticipant;
  }

  // Event Invitations
  async getEventInvitation(token: string): Promise<EventInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(eventInvitations)
      .where(eq(eventInvitations.token, token));
    return invitation;
  }

  async getEventInvitations(eventId: string): Promise<EventInvitation[]> {
    return await db
      .select()
      .from(eventInvitations)
      .where(eq(eventInvitations.eventId, eventId))
      .orderBy(desc(eventInvitations.sentAt));
  }

  async createEventInvitation(invitation: InsertEventInvitation): Promise<EventInvitation> {
    const [newInvitation] = await db.insert(eventInvitations).values(invitation).returning();
    return newInvitation;
  }

  async updateEventInvitation(id: string, data: Partial<InsertEventInvitation>): Promise<EventInvitation> {
    const [updatedInvitation] = await db
      .update(eventInvitations)
      .set({ ...data, respondedAt: new Date() })
      .where(eq(eventInvitations.id, id))
      .returning();
    return updatedInvitation;
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }
  
  async getEventMessages(eventId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.eventId, eventId))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // Password Reset Tokens
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt)
      ));
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`expires_at < NOW()`);
  }

  // Participant Change Requests
  async createParticipantChangeRequest(request: InsertParticipantChangeRequest): Promise<ParticipantChangeRequest> {
    const [newRequest] = await db
      .insert(participantChangeRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getParticipantChangeRequestsByEvent(eventId: string): Promise<ParticipantChangeRequest[]> {
    return await db
      .select()
      .from(participantChangeRequests)
      .where(eq(participantChangeRequests.eventId, eventId))
      .orderBy(desc(participantChangeRequests.createdAt));
  }

  async getParticipantChangeRequest(id: string): Promise<ParticipantChangeRequest | undefined> {
    const [request] = await db
      .select()
      .from(participantChangeRequests)
      .where(eq(participantChangeRequests.id, id));
    return request;
  }

  async updateParticipantChangeRequest(id: string, data: Partial<InsertParticipantChangeRequest>): Promise<ParticipantChangeRequest> {
    const [updatedRequest] = await db
      .update(participantChangeRequests)
      .set(data)
      .where(eq(participantChangeRequests.id, id))
      .returning();
    return updatedRequest;
  }
}

export const storage = new DatabaseStorage();
