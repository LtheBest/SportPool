import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Organization {
  id: string;
  name: string;
  email: string;
  contactFirstName: string;
  contactLastName: string;
  logoUrl?: string;
  planType: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// Gestion du stockage sécurisé des tokens
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = "sportpool_access_token";
  private static readonly REFRESH_TOKEN_KEY = "sportpool_refresh_token";

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
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
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }
}

// Service d'authentification JWT
export class AuthService {
  private static queryClient: ReturnType<typeof useQueryClient>;

  static setQueryClient(client: ReturnType<typeof useQueryClient>) {
    this.queryClient = client;
  }

  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await apiRequest("POST", "/api/refresh-token", {
        refreshToken
      });

      const data = await response.json();
      const accessToken = data.accessToken;

      // Update only the access token
      if (typeof window !== 'undefined') {
        localStorage.setItem("sportpool_access_token", accessToken);
      }

      return accessToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      this.logout();
      return null;
    }
  }

  static async login(email: string, password: string, rememberMe?: boolean): Promise<{ success: boolean; error?: string; organization?: Organization }> {
    try {
      const response = await apiRequest("POST", "/api/login", {
        email,
        password,
        rememberMe
      });

      const data = await response.json();
      
      // Store tokens
      TokenManager.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      });

      // Invalider les requêtes d'auth pour forcer un rechargement
      try {
        if (this.queryClient) {
          this.queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        }
      } catch (error) {
        console.error("QueryClient invalidation error:", error);
      }

      return {
        success: true,
        organization: data.organization
      };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.message || "Login failed"
      };
    }
  }

  static async register(organizationData: any): Promise<{ success: boolean; error?: string; organization?: Organization }> {
    try {
      const response = await apiRequest("POST", "/api/register", organizationData);
      const data = await response.json();
      
      // Store tokens
      TokenManager.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      });

      // Invalider les requêtes d'auth pour forcer un rechargement
      try {
        if (this.queryClient) {
          this.queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        }
      } catch (error) {
        console.error("QueryClient invalidation error:", error);
      }

      return {
        success: true,
        organization: data.organization
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error.message || "Registration failed"
      };
    }
  }

  static async logout(): Promise<void> {
    const accessToken = TokenManager.getAccessToken();
    
    // Clear tokens immediately for instant logout
    TokenManager.clearTokens();

    // Invalider toutes les requêtes d'auth et vider le cache
    try {
      if (this.queryClient) {
        this.queryClient.clear();
        this.queryClient.invalidateQueries();
      }
    } catch (error) {
      console.error("QueryClient clear error:", error);
    }

    // Call logout endpoint in background (non-blocking)
    if (accessToken) {
      // Don't await this - let it run in background
      apiRequest("POST", "/api/logout").catch(error => {
        console.error("Logout endpoint error:", error);
        // Ignore errors - tokens already cleared
      });
    }

    // Force page refresh to ensure complete logout
    if (typeof window !== 'undefined') {
      // Clear any remaining storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force hard reload to home page
      window.location.replace("/");
    }
  }

  static getAuthHeader(): string | null {
    const token = TokenManager.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  static isAuthenticated(): boolean {
    const token = TokenManager.getAccessToken();
    if (!token) return false;
    
    if (TokenManager.isTokenExpired(token)) {
      // Try to refresh if token is expired
      this.refreshAccessToken();
      return false;
    }
    
    return true;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Set query client for AuthService with error handling
  try {
    if (queryClient && !AuthService['queryClient']) {
      AuthService.setQueryClient(queryClient);
    }
  } catch (error) {
    console.error("QueryClient setup error:", error);
  }

  const { data: organization, isLoading, error } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
    staleTime: 0,
    enabled: !!TokenManager.getAccessToken(), // Only fetch if we have a token
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!organization && !error && AuthService.isAuthenticated();

  // Enhanced logout function with error handling
  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if there's an error
      TokenManager.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.replace("/");
      }
    }
  };

  return {
    organization,
    isLoading: isLoading && !!TokenManager.getAccessToken(), // Only show loading if we have a token
    isAuthenticated,
    login: AuthService.login,
    register: AuthService.register,
    logout: handleLogout,
    refreshToken: AuthService.refreshAccessToken,
  };
}