import { apiRequest } from "./queryClient";
import { buildApiUrl, defaultHeaders, requestTimeout, config } from "./config";

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
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

// Helper function for making API requests with proper configuration
async function makeApiRequest(method: string, path: string, data?: any): Promise<Response> {
  const url = buildApiUrl(path);
  const timeout = config.isProduction ? requestTimeout.production : requestTimeout.development;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...defaultHeaders,
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const api = {
  auth: {
    login: (data: LoginData) => apiRequest("POST", "/api/login", data),
    register: (data: RegisterData) => apiRequest("POST", "/api/register", data),
    logout: () => apiRequest("POST", "/api/logout"),
    getProfile: () => makeApiRequest("GET", "/api/me"),
  },
  
  events: {
    getAll: () => makeApiRequest("GET", "/api/events"),
    create: (data: EventData) => apiRequest("POST", "/api/events", data),
    update: (id: string, data: Partial<EventData>) => apiRequest("PUT", `/api/events/${id}`, data),
    delete: (id: string) => apiRequest("DELETE", `/api/events/${id}`),
    getParticipants: (id: string) => makeApiRequest("GET", `/api/events/${id}/participants`),
    invite: (id: string, emails: string[]) => apiRequest("POST", `/api/events/${id}/invite`, { emails }),
    getChangeRequests: (id: string) => makeApiRequest("GET", `/api/events/${id}/change-requests`),
  },
  
  invitations: {
    get: (token: string) => makeApiRequest("GET", `/api/invitations/${token}`),
    respond: (token: string, data: InvitationResponse) => apiRequest("POST", `/api/invitations/${token}/respond`, data),
  },
  
  messages: {
    getByEvent: (eventId: string) => makeApiRequest("GET", `/api/events/${eventId}/messages`),
    send: (eventId: string, content: string) => apiRequest("POST", `/api/events/${eventId}/messages`, { content }),
    sendAsParticipant: (eventId: string, senderName: string, senderEmail: string, content: string) => 
      apiRequest("POST", `/api/events/${eventId}/messages/participant`, { senderName, senderEmail, content }),
  },
  
  dashboard: {
    getStats: () => makeApiRequest("GET", "/api/dashboard/stats"),
    getRealtimeStats: () => makeApiRequest("GET", "/api/dashboard/stats/realtime"),
  },

  // Diagnostic endpoints
  health: () => makeApiRequest("GET", "/api/health"),
  emailDiagnostic: () => makeApiRequest("GET", "/api/email/diagnostic"),
  test: () => makeApiRequest("GET", "/api/test"),
  debugUsers: () => makeApiRequest("GET", "/api/debug/users"),
};
