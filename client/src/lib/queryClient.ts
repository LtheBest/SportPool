import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "./config";

// Token management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = "TeamMove_access_token";
  private static readonly REFRESH_TOKEN_KEY = "TeamMove_refresh_token";

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      console.warn('⚠️ TokenManager: window is undefined (SSR?)');
      return null;
    }
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    console.log(`🔍 TokenManager.getAccessToken(): ${token ? 'Token found' : 'NO TOKEN'}`);
    return token;
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setAccessToken(token: string): void {
    if (typeof window === 'undefined') {
      console.warn('⚠️ Cannot set access token: window is undefined');
      return;
    }
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    console.log('✅ Access token stored in localStorage');
  }

  static clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const isExpired = payload.exp < currentTime;
      console.log(`⏱️ Token expiry check: exp=${payload.exp}, now=${currentTime}, expired=${isExpired}`);
      return isExpired;
    } catch (error) {
      console.error('❌ Failed to check token expiry:', error);
      return true;
    }
  }
}

// Refresh token function
async function refreshAccessToken(): Promise<string | null> {
  console.log('🔄 Attempting to refresh access token...');
  const refreshToken = TokenManager.getRefreshToken();
  if (!refreshToken) {
    console.error('❌ No refresh token available');
    return null;
  }

  console.log(`🔑 Refresh token available: ${refreshToken.substring(0, 20)}...`);

  try {
    const response = await fetch(buildApiUrl("/api/refresh-token"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    console.log(`📡 Refresh token response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to refresh token: ${errorText}`);
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    console.log('✅ New access token received');
    TokenManager.setAccessToken(data.accessToken);
    return data.accessToken;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    TokenManager.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = "/";
    }
    return null;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${res.status} ${res.statusText}`, text);
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
  
  console.log(`🌐 API Request: ${method} ${fullUrl}`);

  // Get access token
  let accessToken = TokenManager.getAccessToken();
  console.log(`🔑 Access Token from localStorage: ${accessToken ? 'Present (length: ' + accessToken.length + ')' : 'MISSING'}`);
  
  // Check if token is expired and try to refresh
  if (accessToken && TokenManager.isTokenExpired(accessToken)) {
    console.log("🔄 Access token expired, attempting refresh...");
    accessToken = await refreshAccessToken();
    if (!accessToken) {
      console.error("❌ Token refresh failed - no access token available");
      throw new Error("401: Authentication required");
    }
    console.log("✅ Token refreshed successfully");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Add Authorization header if we have a token
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    console.log(`✅ Authorization header added: Bearer ${accessToken.substring(0, 20)}...`);
  } else {
    console.warn("⚠️ No access token available - Authorization header NOT added");
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // For any remaining cookie-based functionality
  });

  console.log(`📡 API Response: ${res.status} ${res.statusText}`);
  
  // Handle 401 errors (token invalid/expired)
  if (res.status === 401) {
    console.warn('🚫 Authentication failed - token might be invalid');
    
    // Try to refresh token once more if it's not a login/register request
    if (!url.includes('/login') && !url.includes('/register') && !url.includes('/refresh-token')) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry the request with the new token
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        const retryRes = await fetch(fullUrl, {
          method,
          headers: retryHeaders,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        if (retryRes.ok) {
          console.log('✅ Request successful after token refresh');
          return retryRes;
        }
      }
    }
    
    // If refresh failed or this is a login/register request, clear tokens
    TokenManager.clearTokens();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
    
    // Get access token
    let accessToken = TokenManager.getAccessToken();
    
    // Check if token is expired and try to refresh
    if (accessToken && TokenManager.isTokenExpired(accessToken)) {
      console.log("🔄 Query: Access token expired, attempting refresh...");
      accessToken = await refreshAccessToken();
    }

    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    // Add Authorization header if we have a token
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    // Handle 401 based on behavior setting
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        console.log("🔄 Query: Returning null for 401");
        return null;
      }
      
      // Try refresh once more for "throw" behavior
      if (!url.includes('/login') && !url.includes('/register')) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const retryRes = await fetch(fullUrl, {
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
            credentials: "include",
          });
          
          if (retryRes.ok) {
            return await retryRes.json();
          }
        }
      }
      
      TokenManager.clearTokens();
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Return null for 401s by default
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error.message.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// Expose TokenManager for use in components
export { TokenManager };