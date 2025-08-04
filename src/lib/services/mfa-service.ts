import { createServerClient } from '@/lib/supabase/server';
import { supabase as clientSupabase } from '@/lib/supabase/client';
import { createUserService } from '@/lib/database';
import { NextRequest } from 'next/server';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

export interface MfaSecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MfaVerificationResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'browser';
  fingerprint: string;
  ipAddress: string;
  location?: string;
  lastUsed: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login' | 'backup_code_used' | 'device_trusted' | 'mfa_enabled' | 'mfa_disabled' | 'backup_codes_regenerated';
  timestamp: string;
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  metadata?: Record<string, unknown>;
}

export interface MfaStatus {
  isEnabled: boolean;
  isSetup: boolean;
  verifiedAt?: string;
  backupCodesRemaining: number;
}

export interface MfaSetupData {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export class MfaService {
  private supabase: ReturnType<typeof createServerClient> | typeof clientSupabase;
  private userService: ReturnType<typeof createUserService>;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : clientSupabase;
    this.userService = createUserService(isServer);
  }

  /**
   * Generate a new TOTP secret and backup codes for user
   */
  async generateMfaSecret(userId: string): Promise<{ secret: MfaSecret | null; error: string | null }> {
    try {
      // In a real app, you'd use a library like speakeasy or node-otp
      const secret = this.generateRandomSecret();
      const backupCodes = this.generateBackupCodes();
      
      // Create QR code URL (in real app, use the user's email)
      const issuer = 'Loom';
      const label = encodeURIComponent(`${issuer}:user@loom.app`);
      const qrCodeUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      return {
        secret: {
          secret,
          qrCodeUrl,
          backupCodes
        },
        error: null
      };
    } catch (error) {
      return {
        secret: null,
        error: error instanceof Error ? error.message : 'Failed to generate MFA secret'
      };
    }
  }

  /**
   * Enable MFA for a user
   */
  async enableMfa(userId: string, secret: string, verificationCode: string, backupCodes: string[]): Promise<{ success: boolean; error: string | null }> {
    try {
      // Verify the TOTP code first
      const isValidCode = this.verifyTotpCode(secret, verificationCode);
      if (!isValidCode) {
        return { success: false, error: 'Invalid verification code' };
      }

      // In a real app, save to database
      // await this.saveMfaSettings(userId, secret, backupCodes);
      
      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_enabled',
        timestamp: new Date().toISOString(),
        metadata: { method: 'totp' }
      });

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable MFA'
      };
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // In a real app, remove MFA settings from database
      // await this.removeMfaSettings(userId);
      
      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_disabled',
        timestamp: new Date().toISOString()
      });

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable MFA'
      };
    }
  }

  /**
   * Verify TOTP code
   */
  async verifyTotpCode(secret: string, code: string): Promise<boolean> {
    try {
      if (!secret || !code) {
        return false;
      }

      // Use speakeasy to verify TOTP code with time window tolerance
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 2, // Allow 2 time steps (60 seconds) tolerance
        algorithm: 'sha1'
      });

      return verified;
    } catch (error) {
      console.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MfaVerificationResult> {
    try {
      if (!userId || !code) {
        return { success: false, error: 'User ID and backup code are required' };
      }

      const supabase = await createServerClient();
      
      // Fetch user's backup codes from database
      const { data: backupCodes, error: fetchError } = await supabase
        .from('user_mfa')
        .select('backup_codes, backup_codes_used')
        .eq('user_id', userId)
        .eq('is_enabled', true)
        .single();

      if (fetchError || !backupCodes) {
        return { success: false, error: 'No MFA backup codes found for user' };
      }

      const validCodes = backupCodes.backup_codes || [];
      const usedCodes = backupCodes.backup_codes_used || [];
      
      // Check if code has already been used
      if (usedCodes.includes(code)) {
        return { success: false, error: 'Backup code has already been used' };
      }
      
      // Verify code against stored backup codes (hashed comparison)
      let isValidCode = false;
      for (const storedCode of validCodes) {
        // Use crypto to compare hashed backup codes
        const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
        if (crypto.timingSafeEqual(Buffer.from(hashedInput), Buffer.from(storedCode))) {
          isValidCode = true;
          break;
        }
      }

      if (!isValidCode) {
        return { success: false, error: 'Invalid backup code' };
      }

      // Mark code as used
      const updatedUsedCodes = [...usedCodes, code];
      const { error: updateError } = await supabase
        .from('user_mfa')
        .update({ 
          backup_codes_used: updatedUsedCodes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to mark backup code as used:', updateError);
        return { success: false, error: 'Failed to process backup code' };
      }
      
      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'backup_code_used',
        timestamp: new Date().toISOString()
      });

      const remainingCodes = validCodes.length - updatedUsedCodes.length;
      return { 
        success: true, 
        remainingAttempts: remainingCodes 
      };
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify backup code'
      };
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<{ codes: string[] | null; error: string | null }> {
    try {
      const newBackupCodes = this.generateBackupCodes();
      
      // Hash backup codes before storing
      const hashedCodes = newBackupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );
      
      const supabase = await createServerClient();
      
      // Save hashed backup codes to database and reset used codes
      const { error: updateError } = await supabase
        .from('user_mfa')
        .update({ 
          backup_codes: hashedCodes,
          backup_codes_used: [], // Reset used codes
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to save backup codes:', updateError);
        return { codes: null, error: 'Failed to save backup codes to database' };
      }
      
      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'backup_codes_regenerated',
        timestamp: new Date().toISOString()
      });

      // Return plain text codes to user (only time they'll see them)
      return { codes: newBackupCodes, error: null };
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      return {
        codes: null,
        error: error instanceof Error ? error.message : 'Failed to regenerate backup codes'
      };
    }
  }

  /**
   * Trust a device
   */
  async trustDevice(userId: string, deviceInfo: Partial<TrustedDevice>): Promise<{ device: TrustedDevice | null; error: string | null }> {
    try {
      const device: TrustedDevice = {
        id: this.generateId(),
        userId,
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        deviceType: deviceInfo.deviceType || 'browser',
        fingerprint: deviceInfo.fingerprint || this.generateDeviceFingerprint(),
        ipAddress: deviceInfo.ipAddress || '127.0.0.1',
        location: deviceInfo.location,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // In a real app, save to database
      // await this.saveTrustedDevice(device);
      
      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'device_trusted',
        timestamp: new Date().toISOString(),
        ipAddress: device.ipAddress,
        location: device.location,
        deviceInfo: device.deviceName
      });

      return { device, error: null };
    } catch (error) {
      return {
        device: null,
        error: error instanceof Error ? error.message : 'Failed to trust device'
      };
    }
  }

  /**
   * Remove trusted device
   */
  async removeTrustedDevice(userId: string, deviceId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // In a real app, remove from database
      // await this.deleteTrustedDevice(userId, deviceId);
      
      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove trusted device'
      };
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      // In a real app, check against database
      // const trustedDevices = await this.getTrustedDevices(userId);
      // return trustedDevices.some(device => device.fingerprint === deviceFingerprint);
      
      // Mock response
      return false;
    } catch (error) {
      console.error('Error checking trusted device:', error);
      return false;
    }
  }

  /**
   * Get user's trusted devices
   */
  async getTrustedDevices(userId: string): Promise<{ devices: TrustedDevice[]; error: string | null }> {
    try {
      // In a real app, fetch from database
      const mockDevices: TrustedDevice[] = [
        {
          id: '1',
          userId,
          deviceName: 'MacBook Pro',
          deviceType: 'desktop',
          fingerprint: 'fp_123456',
          ipAddress: '192.168.1.1',
          location: 'New York, NY',
          lastUsed: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() // 1 week ago
        },
        {
          id: '2',
          userId,
          deviceName: 'iPhone 15',
          deviceType: 'mobile',
          fingerprint: 'fp_789012',
          ipAddress: '192.168.1.2',
          location: 'New York, NY',
          lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() // 3 days ago
        }
      ];

      return { devices: mockDevices, error: null };
    } catch (error) {
      return {
        devices: [],
        error: error instanceof Error ? error.message : 'Failed to get trusted devices'
      };
    }
  }

  /**
   * Get security events for user
   */
  async getSecurityEvents(userId: string, limit = 50): Promise<{ events: SecurityEvent[]; error: string | null }> {
    try {
      // In a real app, fetch from database
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          userId,
          type: 'login',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          ipAddress: '192.168.1.1',
          location: 'New York, NY',
          deviceInfo: 'MacBook Pro'
        },
        {
          id: '2',
          userId,
          type: 'backup_code_used',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          ipAddress: '192.168.1.2',
          location: 'New York, NY',
          deviceInfo: 'iPhone 15'
        },
        {
          id: '3',
          userId,
          type: 'device_trusted',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          ipAddress: '192.168.1.3',
          location: 'Unknown Location',
          deviceInfo: 'Chrome Browser'
        }
      ];

      return { events: mockEvents.slice(0, limit), error: null };
    } catch (error) {
      return {
        events: [],
        error: error instanceof Error ? error.message : 'Failed to get security events'
      };
    }
  }

  /**
   * Log a security event
   */
  private async logSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<void> {
    try {
      // In a real app, save to database
      console.log('Security event logged:', event);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Generate a random TOTP secret
   */
  private generateRandomSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate cryptographically secure random backup codes
      const randomBytes = crypto.randomBytes(4);
      let code = '';
      for (let j = 0; j < 4; j++) {
        // Convert each byte to 2 digits (00-99)
        code += (randomBytes[j] % 100).toString().padStart(2, '0');
      }
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(): string {
    // In a real app, this would be based on device characteristics
    return 'fp_' + Math.random().toString(36).substr(2, 12);
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<MfaStatus> {
    try {
      // In a real app, fetch from database
      // For now, return mock data
      return {
        isEnabled: false, // Mock - would check database
        isSetup: false,   // Mock - would check if secret exists
        verifiedAt: undefined,
        backupCodesRemaining: 0 // Mock - would count remaining codes
      };
    } catch (error) {
      console.error('Error getting MFA status:', error);
      return {
        isEnabled: false,
        isSetup: false,
        verifiedAt: undefined,
        backupCodesRemaining: 0
      };
    }
  }

  /**
   * Check if user requires MFA
   */
  async requiresMFA(userId: string): Promise<boolean> {
    try {
      const status = await this.getMFAStatus(userId);
      return status.isEnabled;
    } catch (error) {
      console.error('Error checking MFA requirement:', error);
      return false;
    }
  }

  /**
   * Setup MFA for a user
   */
  async setupMFA(userId: string, email: string): Promise<MfaSetupData> {
    try {
      const secret = this.generateRandomSecret();
      const backupCodes = this.generateBackupCodes();
      
      // Create QR code URL
      const issuer = 'Loom';
      const label = encodeURIComponent(`${issuer}:${email}`);
      const qrCodeUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

      return {
        secret,
        qrCodeUrl,
        manualEntryKey: secret,
        backupCodes
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to setup MFA');
    }
  }

  /**
   * Generate MFA setup (client-side compatible method)
   */
  async generateMfaSetup(userId: string, email: string): Promise<{ data?: MfaSetupData; error?: string }> {
    try {
      const setupData = await this.setupMFA(userId, email);
      return { data: setupData };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to generate MFA setup'
      };
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMFA(userId: string, totpCode: string, ipAddress?: string | null, userAgent?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      if (!userId || !totpCode) {
        return { success: false, error: 'User ID and verification code are required' };
      }

      const supabase = await createServerClient();
      
      // Get user's MFA secret from database
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_mfa')
        .select('secret, is_enabled')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaData) {
        return { success: false, error: 'MFA setup not found. Please set up MFA first.' };
      }

      if (mfaData.is_enabled) {
        return { success: false, error: 'MFA is already enabled for this user' };
      }

      // Verify the TOTP code with the user's secret
      const isValid = await this.verifyTotpCode(mfaData.secret, totpCode);
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Enable MFA in database
      const { error: updateError } = await supabase
        .from('user_mfa')
        .update({ 
          is_enabled: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to enable MFA:', updateError);
        return { success: false, error: 'Failed to enable MFA' };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_enabled',
        timestamp: new Date().toISOString(),
        ipAddress: ipAddress || undefined,
        deviceInfo: userAgent || undefined
      });

      return { success: true };
    } catch (error) {
      console.error('Error enabling MFA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable MFA'
      };
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string, totpCode: string, ipAddress?: string | null, userAgent?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the TOTP code before disabling
      const isValid = await this.verifyTotpCode('', totpCode); // In real app, get secret from DB
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Disable MFA (in real app, update database)
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable MFA'
      };
    }
  }

  /**
   * Verify MFA code (TOTP or backup code)
   */
  async verifyMFA(userId: string, code: string, method: 'totp' | 'backup_code', ipAddress?: string | null, userAgent?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      if (method === 'totp') {
        const isValid = await this.verifyTotpCode('', code); // In real app, get secret from DB
        return { success: isValid, error: isValid ? undefined : 'Invalid TOTP code' };
      } else if (method === 'backup_code') {
        const result = await this.verifyBackupCode(userId, code);
        return { success: result.success, error: result.error };
      }

      return { success: false, error: 'Invalid verification method' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify MFA code'
      };
    }
  }

  /**
   * Validate MFA session
   */
  async validateMfaSession(sessionToken: string): Promise<{ session?: { sessionToken: string; mfaVerified: boolean; userId: string; expiresAt: string } | null; error?: string }> {
    try {
      // In a real app, validate the session token
      // For now, return mock validation
      return {
        session: {
          sessionToken,
          mfaVerified: false, // Mock - would check actual status
          userId: 'mock-user-id', // Would extract from token
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error.message : 'Failed to validate MFA session'
      };
    }
  }

  /**
   * Create MFA session
   */
  async createMfaSession(userId: string, temporary = false): Promise<{ session?: { sessionToken: string; expiresAt: string; userId: string; mfaVerified: boolean }; error?: string }> {
    try {
      // In a real app, create a secure session token
      const sessionToken = 'mfa_' + Math.random().toString(36).substr(2, 32);
      const expiresAt = new Date(Date.now() + (temporary ? 10 * 60 * 1000 : 60 * 60 * 1000)).toISOString();
      
      return {
        session: {
          sessionToken,
          expiresAt,
          userId,
          mfaVerified: false
        }
      };
    } catch (error) {
      return {
        session: undefined,
        error: error instanceof Error ? error.message : 'Failed to create MFA session'
      };
    }
  }

  /**
   * Complete MFA session (mark as verified)
   */
  async completeMfaSession(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real app, mark the session as MFA verified
      // For now, just return success
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete MFA session'
      };
    }
  }

  /**
   * Client-side MFA verification (simplified interface)
   */
  async verifyMfa(userId: string, options: { method: 'totp' | 'backup_code'; code: string; rememberDevice?: boolean }): Promise<{ success: boolean; error?: string }> {
    try {
      // For client-side calls, make API request
      if (!this.supabase) {
        // This is a client-side call, make HTTP request
        const response = await fetch('/api/auth/mfa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            code: options.code,
            method: options.method,
          }),
        });

        const result = await response.json();
        return {
          success: result.success || false,
          error: result.error || (result.success ? undefined : 'Verification failed'),
        };
      }

      // Server-side verification
      return await this.verifyMFA(userId, options.code, options.method);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify MFA code'
      };
    }
  }

  /**
   * Regenerate backup codes with TOTP verification (new method signature)
   */
  async regenerateBackupCodesWithVerification(userId: string, totpCode: string, ipAddress?: string | null, userAgent?: string | null): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      // Verify TOTP code first
      const isValid = await this.verifyTotpCode('', totpCode); // In real app, get secret from DB
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Generate new backup codes using existing method
      const { codes, error } = await this.regenerateBackupCodes(userId);
      if (error) {
        return { success: false, error };
      }

      return { success: true, backupCodes: codes || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate backup codes'
      };
    }
  }
}

// Factory function to create MFA service instances
export const createMfaService = (isServer = true) => {
  return new MfaService(isServer);
};

// Also export with uppercase 'MFA' for backward compatibility
export const createMFAService = createMfaService;

// Server-side MFA helpers
export const getMfaSecret = async (userId: string): Promise<MfaSecret | null> => {
  const mfaService = createMfaService(true);
  const { secret } = await mfaService.generateMfaSecret(userId);
  return secret;
};

export const verifyMfaCode = async (secret: string, code: string): Promise<boolean> => {
  const mfaService = createMfaService(true);
  return mfaService.verifyTotpCode(secret, code);
};

export const getUserTrustedDevices = async (userId: string): Promise<TrustedDevice[]> => {
  const mfaService = createMfaService(true);
  const { devices } = await mfaService.getTrustedDevices(userId);
  return devices;
};

export const getUserSecurityEvents = async (userId: string, limit?: number): Promise<SecurityEvent[]> => {
  const mfaService = createMfaService(true);
  const { events } = await mfaService.getSecurityEvents(userId, limit);
  return events;
};

// Utility functions for extracting client information
export const getClientIP = (request: NextRequest): string | null => {
  // Check various headers for the real IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  // Try to get from connection info (Next.js specific)
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  return null;
};

export const getUserAgent = (request: NextRequest): string | null => {
  return request.headers.get('user-agent');
};