import { apiRequest } from "./queryClient";

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  type: "club" | "association" | "company";
  email: string;
  phone?: string;
  address?: string;
  description?: string;
  contactFirstName: string;
  contactLastName: string;
  password: string;
  sports?: string[];
}

export interface EventData {
  name: string;
  sport: string;
  description?: string;
  date: string;
  duration?: string;
  meetingPoint: string;
  destination: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  inviteEmails?: string[];
}

export interface InvitationResponse {
  name: string;
  role: "passenger" | "driver";
  availableSeats?: number;
  comment?: string;
}

export const api = {
  auth: {
    login: (data: LoginData) => apiRequest("POST", "/api/login", data),
    register: (data: RegisterData) => apiRequest("POST", "/api/register", data),
    logout: () => apiRequest("POST", "/api/logout"),
    getProfile: () => fetch("/api/me", { credentials: "include" }),
  },
  
  events: {
    getAll: () => fetch("/api/events", { credentials: "include" }),
    create: (data: EventData) => apiRequest("POST", "/api/events", data),
    update: (id: string, data: Partial<EventData>) => apiRequest("PUT", `/api/events/${id}`, data),
    delete: (id: string) => apiRequest("DELETE", `/api/events/${id}`),
    getParticipants: (id: string) => fetch(`/api/events/${id}/participants`, { credentials: "include" }),
  },
  
  invitations: {
    get: (token: string) => fetch(`/api/invitations/${token}`),
    respond: (token: string, data: InvitationResponse) => apiRequest("POST", `/api/invitations/${token}/respond`, data),
  },
  
  messages: {
    getByEvent: (eventId: string) => fetch(`/api/events/${eventId}/messages`, { credentials: "include" }),
    send: (eventId: string, content: string) => apiRequest("POST", `/api/events/${eventId}/messages`, { content }),
    sendAsParticipant: (eventId: string, senderName: string, senderEmail: string, content: string) => 
      apiRequest("POST", `/api/events/${eventId}/messages/participant`, { senderName, senderEmail, content }),
  },
  
  dashboard: {
    getStats: () => fetch("/api/dashboard/stats", { credentials: "include" }),
  },
};
