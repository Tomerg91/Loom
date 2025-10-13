import { config } from '@/lib/config';
import type { UserRole, Language } from '@/types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  language: Language;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  language: Language;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  language?: Language;
  specialties?: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  user?: AuthUser;
  error?: string;
  message?: string;
  details?: string[];
}

class AuthApiClient {
  private readonly baseUrl: string;
  private readonly authEndpoints = config.endpoints.auth;
  private readonly httpConfig = config.http;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL ?? '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private resolveUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.resolveUrl(endpoint);
      const headers = new Headers(options.headers ?? {});

      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', this.httpConfig.contentTypes.JSON);
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: options.credentials ?? 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'An error occurred',
          details: data.details,
        };
      }

      return {
        success: true,
        ...data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>(this.authEndpoints.SIGN_UP, {
      method: this.httpConfig.methods.POST,
      body: JSON.stringify(data),
    });
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>(this.authEndpoints.SIGN_IN, {
      method: this.httpConfig.methods.POST,
      body: JSON.stringify(data),
    });
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<ApiResponse> {
    return this.request(this.authEndpoints.SIGN_OUT, {
      method: this.httpConfig.methods.POST,
    });
  }

  /**
   * Get the current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>(this.authEndpoints.ME);
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<ApiResponse> {
    return this.request(this.authEndpoints.SESSION);
  }

  /**
   * Terminate the current session
   */
  async terminateSession(): Promise<ApiResponse> {
    return this.request(this.authEndpoints.SESSION, {
      method: this.httpConfig.methods.DELETE,
    });
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<ApiResponse> {
    return this.request(this.authEndpoints.RESET_PASSWORD, {
      method: this.httpConfig.methods.POST,
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Update password
   */
  async updatePassword(password: string, confirmPassword: string): Promise<ApiResponse> {
    return this.request(this.authEndpoints.UPDATE_PASSWORD, {
      method: this.httpConfig.methods.POST,
      body: JSON.stringify({ password, confirmPassword }),
    });
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>(this.authEndpoints.PROFILE);
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>(this.authEndpoints.PROFILE, {
      method: this.httpConfig.methods.PUT,
      body: JSON.stringify(data),
    });
  }

  /**
   * Verify email token
   */
  async verifyToken(tokenHash: string, type: string = 'signup'): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>(this.authEndpoints.VERIFY, {
      method: this.httpConfig.methods.POST,
      body: JSON.stringify({ token_hash: tokenHash, type }),
    });
  }

  /**
   * Check if user has specific role
   */
  async hasRole(role: UserRole): Promise<boolean> {
    const response = await this.getCurrentUser();
    return response.success && response.user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(roles: UserRole[]): Promise<boolean> {
    const response = await this.getCurrentUser();
    return response.success && response.user ? roles.includes(response.user.role) : false;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const response = await this.getCurrentUser();
    return response.success && !!response.user;
  }
}

// Export singleton instance
export const authApi = new AuthApiClient();

// Export class for testing or custom instances
export { AuthApiClient };