import { apiRequest } from "./queryClient";
import { buildApiUrl, defaultHeaders, requestTimeout, config } from "./config";
import { AuthService } from "@/hooks/useAuth";

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

// Helper function for making API requests with JWT authentication
async function makeAuthenticatedRequest(method: string, path: string, data?: any): Promise<Response> {
  const url = buildApiUrl(path);
  const timeout = config.isProduction ? requestTimeout.production : requestTimeout.development;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      ...defaultHeaders,
    };

    // Add JWT Authorization header
    const authHeader = AuthService.getAuthHeader();
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // Keep for any legacy functionality
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Helper function for public API requests (no auth required)
async function makePublicRequest(method: string, path: string, data?: any): Promise<Response> {
  const url = buildApiUrl(path);
  const timeout = config.isProduction ? requestTimeout.production : requestTimeout.development;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
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
    // Use AuthService methods for JWT authentication
    login: async (data: LoginData) => {
      const result = await AuthService.login(data.email, data.password, data.rememberMe);
      if (!result.success) {
        throw new Error(result.error || "Login failed");
      }
      return result;
    },
    
    register: async (data: RegisterData) => {
      const result = await AuthService.register(data);
      if (!result.success) {
        throw new Error(result.error || "Registration failed");
      }
      return result;
    },
    
    logout: () => AuthService.logout(),
    
    getProfile: () => makeAuthenticatedRequest("GET", "/api/me"),
    
    refreshToken: () => AuthService.refreshAccessToken(),
  },
  
  events: {
    getAll: () => makeAuthenticatedRequest("GET", "/api/events"),
    create: (data: EventData) => apiRequest("POST", "/api/events", data),
    update: (id: string, data: Partial<EventData>) => apiRequest("PUT", `/api/events/${id}`, data),
    delete: (id: string) => apiRequest("DELETE", `/api/events/${id}`),
    getParticipants: (id: string) => makeAuthenticatedRequest("GET", `/api/events/${id}/participants`),
    invite: (id: string, email: string, customMessage?: string) => 
      apiRequest("POST", `/api/events/${id}/invite`, { email, customMessage }),
    getChangeRequests: (id: string) => makeAuthenticatedRequest("GET", `/api/events/${id}/change-requests`),
    sendReminders: (id: string) => apiRequest("POST", `/api/events/${id}/send-reminders`),
    
    // Public endpoints (no auth required)
    getPublic: (id: string) => makePublicRequest("GET", `/api/events/${id}/public`),
    join: (id: string, data: InvitationResponse) => makePublicRequest("POST", `/api/events/${id}/join`, data),
  },
  
  invitations: {
    create: (eventId: string) => apiRequest("POST", `/api/events/${eventId}/invitations`),
    get: (token: string) => makePublicRequest("GET", `/api/invitations/${token}`),
    respond: (token: string, data: InvitationResponse) => makePublicRequest("POST", `/api/invitations/${token}/respond`, data),
  },
  
  participants: {
    update: (id: string, data: any) => apiRequest("PUT", `/api/participants/${id}`, data),
    delete: (id: string) => apiRequest("DELETE", `/api/participants/${id}`),
    createChangeRequest: (id: string, requestType: string, requestedValue: string, reason: string) =>
      makePublicRequest("POST", `/api/participants/${id}/change-request`, { 
        requestType, 
        requestedValue, 
        reason 
      }),
  },
  
  changeRequests: {
    update: (id: string, status: "approved" | "rejected", organizerComment?: string) =>
      apiRequest("PUT", `/api/change-requests/${id}`, { status, organizerComment }),
  },
  
  messages: {
    getByEvent: (eventId: string) => makeAuthenticatedRequest("GET", `/api/events/${eventId}/messages`),
    send: (eventId: string, content: string) => apiRequest("POST", `/api/events/${eventId}/messages`, { content }),
    delete: (eventId: string, messageId: string) => apiRequest("DELETE", `/api/events/${eventId}/messages/${messageId}`),
    sendAsParticipant: (eventId: string, senderName: string, senderEmail: string, content: string) => 
      makePublicRequest("POST", `/api/events/${eventId}/messages/participant`, { 
        senderName, 
        senderEmail, 
        content 
      }),
  },
  
  profile: {
    update: (data: any) => apiRequest("PUT", "/api/profile", data),
    uploadLogo: (formData: FormData) => {
      // Special handling for file upload
      const authHeader = AuthService.getAuthHeader();
      const headers: Record<string, string> = {};
      if (authHeader) {
        headers.Authorization = authHeader;
      }

      return fetch(buildApiUrl("/api/profile/logo"), {
        method: "POST",
        headers,
        body: formData, // Don't set Content-Type for FormData
        credentials: "include",
      });
    },
  },
  
  dashboard: {
    getStats: () => makeAuthenticatedRequest("GET", "/api/dashboard/stats"),
    getRealtimeStats: () => makeAuthenticatedRequest("GET", "/api/dashboard/stats/realtime"),
  },

  chatbot: {
    getOrganizationHelp: (message: string) => 
      apiRequest("POST", "/api/chatbot/organization-help", { message }),
  },

  email: {
    sendCustom: (to: string, subject: string, content: string) =>
      apiRequest("POST", "/api/send-custom-email", { to, subject, content }),
    diagnostic: () => makeAuthenticatedRequest("GET", "/api/email/diagnostic"),
  },

  // Password reset (public endpoints)
  password: {
    requestReset: (email: string) => makePublicRequest("POST", "/api/forgot-password", { email }),
    reset: (token: string, newPassword: string) => 
      makePublicRequest("POST", "/api/reset-password", { token, newPassword }),
  },

  // Admin support endpoints
  admin: {
    getConversations: () => makeAuthenticatedRequest("GET", "/api/admin/conversations"),
    createConversation: (data: any) => makeAuthenticatedRequest("POST", "/api/admin/conversations", data),
    getMessages: (conversationId: string) => makeAuthenticatedRequest("GET", `/api/admin/conversations/${conversationId}/messages`),
    sendMessage: (conversationId: string, message: string) => makeAuthenticatedRequest("POST", `/api/admin/conversations/${conversationId}/messages`, { message }),
    closeConversation: (conversationId: string) => makeAuthenticatedRequest("PUT", `/api/admin/conversations/${conversationId}/close`),
  },

  // Subscription and payment endpoints  
  subscription: {
    getPlans: () => makePublicRequest("GET", "/api/subscription/plans"),
    getInfo: () => makeAuthenticatedRequest("GET", "/api/subscription/info"),
    createPayment: (planId: string, successUrl?: string, cancelUrl?: string) => 
      makeAuthenticatedRequest("POST", "/api/subscriptions/create", { 
        planId, 
        successUrl, 
        cancelUrl 
      }),
    handlePaymentSuccess: (sessionId: string, organizationId: string) =>
      makeAuthenticatedRequest("POST", "/api/registration/payment-success", {
        sessionId,
        organizationId
      }),
    handlePaymentCancellation: (organizationId?: string) =>
      makeAuthenticatedRequest("POST", "/api/registration/payment-cancelled", {
        organizationId
      }),
    upgrade: (planId: string, successUrl?: string, cancelUrl?: string) =>
      makeAuthenticatedRequest("POST", "/api/subscription/upgrade-from-decouverte", {
        planId,
        successUrl,
        cancelUrl
      }),
    cancel: () => makeAuthenticatedRequest("POST", "/api/subscription/cancel-to-decouverte"),
    canCreateEvent: () => makeAuthenticatedRequest("GET", "/api/subscription/can-create-event"),
    canSendInvitations: (count: number) => 
      makeAuthenticatedRequest("POST", "/api/subscription/can-send-invitations", { count }),
  },

  // Stripe endpoints
  stripe: {
    getConfig: () => makePublicRequest("GET", "/api/stripe/config"),
    getPublicKey: () => makePublicRequest("GET", "/api/stripe/public-key"),
    createCheckoutSession: (planId: string, successUrl?: string, cancelUrl?: string) =>
      makeAuthenticatedRequest("POST", "/api/stripe/create-checkout-session", {
        planId,
        successUrl,
        cancelUrl
      }),
    createPaymentIntent: (planId: string, amount: number, currency: string = 'eur') =>
      makeAuthenticatedRequest("POST", "/api/stripe/create-payment-intent", {
        planId,
        amount,
        currency
      }),
    handlePaymentSuccess: (paymentIntentId: string) =>
      makeAuthenticatedRequest("POST", "/api/stripe/payment-success", {
        paymentIntentId
      }),
    createCustomerPortal: () => makeAuthenticatedRequest("POST", "/api/stripe/customer-portal"),
    getSubscriptionInfo: () => makeAuthenticatedRequest("GET", "/api/stripe/subscription-info"),
    cancelSubscription: () => makeAuthenticatedRequest("POST", "/api/stripe/cancel-subscription"),
  },

  // Diagnostic and test endpoints
  health: () => makePublicRequest("GET", "/api/health"),
  authTest: () => makeAuthenticatedRequest("GET", "/api/auth-test"),
  test: () => makePublicRequest("GET", "/api/test"),
  debugUsers: () => makeAuthenticatedRequest("GET", "/api/debug/users"),
};