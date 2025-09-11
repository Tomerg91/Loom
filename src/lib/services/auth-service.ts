import { createAuthService } from '@/lib/auth/auth';

// This service wraps the auth library for consistent API access
class AuthService {
  private authLibPromise = createAuthService(true);

  async getSession() {
    try {
      const authLib = await this.authLibPromise;
      const user = await authLib.getCurrentUser();
      if (!user) return null;
      
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        }
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async updateUser(userId: string, updates: Record<string, unknown>) {
    try {
      const authLib = await this.authLibPromise;
      return await authLib.updateUser(userId, updates);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const authLib = await this.authLibPromise;
      return await authLib.getCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updatePasswordWithToken(token: string, password: string) {
    try {
      const authLib = await this.authLibPromise;
      return await authLib.updatePasswordWithToken(token, password);
    } catch (error) {
      console.error('Error updating password with token:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
