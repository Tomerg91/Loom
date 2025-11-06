import * as crypto from 'crypto';
import { NextRequest } from 'next/server';
import * as speakeasy from 'speakeasy';

import { supabase as clientSupabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// Secure environment validation - NO FALLBACKS ALLOWED
function validateMfaEnvironment() {
  if (typeof window !== 'undefined') {
    // Client-side, skip validation
    return;
  }

  // Always enforce in production - no exceptions
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.MFA_ENCRYPTION_KEY) {
      throw new Error(
        'CRITICAL SECURITY ERROR: MFA_ENCRYPTION_KEY environment variable is required in production'
      );
    }
    if (!process.env.MFA_SIGNING_KEY) {
      throw new Error(
        'CRITICAL SECURITY ERROR: MFA_SIGNING_KEY environment variable is required in production'
      );
    }
    if (process.env.MFA_ENCRYPTION_KEY.length < 32) {
      throw new Error(
        'CRITICAL SECURITY ERROR: MFA_ENCRYPTION_KEY must be at least 32 characters long'
      );
    }
    if (process.env.MFA_SIGNING_KEY.length < 32) {
      throw new Error(
        'CRITICAL SECURITY ERROR: MFA_SIGNING_KEY must be at least 32 characters long'
      );
    }
  }
}

// MFA Configuration from environment - NO INSECURE FALLBACKS
const getMfaConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, require all security keys
    return {
      ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY!,
      SIGNING_KEY: process.env.MFA_SIGNING_KEY!,
      ISSUER_NAME: process.env.MFA_ISSUER_NAME || 'Loom',
      TOKEN_EXPIRY: parseInt(process.env.MFA_TOKEN_EXPIRY_SECONDS || '1800'),
      MAX_ATTEMPTS: parseInt(process.env.MFA_MAX_VERIFICATION_ATTEMPTS || '3'),
      RATE_LIMIT_WINDOW: parseInt(
        process.env.MFA_RATE_LIMIT_WINDOW_MS || '300000'
      ),
      RATE_LIMIT_MAX: parseInt(process.env.MFA_RATE_LIMIT_MAX_ATTEMPTS || '5'),
    };
  } else {
    // Development only - generate secure random keys if not provided
    return {
      ENCRYPTION_KEY:
        process.env.MFA_ENCRYPTION_KEY ||
        crypto.randomBytes(32).toString('hex'),
      SIGNING_KEY:
        process.env.MFA_SIGNING_KEY || crypto.randomBytes(32).toString('hex'),
      ISSUER_NAME: process.env.MFA_ISSUER_NAME || 'Loom',
      TOKEN_EXPIRY: parseInt(process.env.MFA_TOKEN_EXPIRY_SECONDS || '1800'),
      MAX_ATTEMPTS: parseInt(process.env.MFA_MAX_VERIFICATION_ATTEMPTS || '3'),
      RATE_LIMIT_WINDOW: parseInt(
        process.env.MFA_RATE_LIMIT_WINDOW_MS || '300000'
      ),
      RATE_LIMIT_MAX: parseInt(process.env.MFA_RATE_LIMIT_MAX_ATTEMPTS || '5'),
    };
  }
};

const MFA_CONFIG = getMfaConfig();

type TrustedDeviceRow = {
  id: string;
  user_id: string;
  device_name: string | null;
  device_fingerprint: string;
  ip_address: string | null;
  user_agent: string | null;
  location?: string | null;
  last_used_at: string | null;
  created_at: string | null;
  expires_at: string | null;
};

type SecurityEventRow = {
  id: string;
  user_id: string;
  type: string;
  timestamp: string;
  ip_address: string | null;
  location: string | null;
  device_info: string | null;
  metadata: Record<string, unknown> | null;
};

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
  deviceName?: string;
  deviceFingerprint: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type:
    | 'login'
    | 'backup_code_used'
    | 'device_trusted'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'backup_codes_regenerated';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any;

  constructor(isServer = true) {
    // Validate environment only during actual runtime operations
    validateMfaEnvironment();

    if (isServer) {
      // Lazy import to avoid server-only code in client bundles
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createServerClient } = require('@/lib/supabase/server');
      this.supabase = createServerClient();
    } else {
      this.supabase = clientSupabase;
    }
  }

  // Helper to use the correct Supabase client in both server and client contexts
  private supbaseOrServer() {
    return this.supabase;
  }

  // Helper to get Supabase client (supports both server and client contexts)
  private getSupabaseClient() {
    return this.supabase;
  }

  /**
   * Encrypt MFA secret for secure database storage
   */
  private encryptSecret(secret: string, userId?: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      // Use a cryptographically secure salt derived from signing key and user ID
      const saltBase = userId
        ? `${MFA_CONFIG.SIGNING_KEY}:${userId}`
        : MFA_CONFIG.SIGNING_KEY;
      const salt = crypto
        .createHash('sha256')
        .update(saltBase)
        .digest()
        .slice(0, 16);
      const key = crypto.scryptSync(MFA_CONFIG.ENCRYPTION_KEY, salt, 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);

      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return iv + encrypted data (CBC mode doesn't use auth tags)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Failed to encrypt MFA secret:', error);
      throw new Error('Failed to encrypt MFA secret');
    }
  }

  /**
   * Decrypt MFA secret from database
   */
  private decryptSecret(encryptedSecret: string, userId?: string): string {
    try {
      const parts = encryptedSecret.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted secret format');
      }

      const algorithm = 'aes-256-cbc';
      // Use the same salt derivation as encryption
      const saltBase = userId
        ? `${MFA_CONFIG.SIGNING_KEY}:${userId}`
        : MFA_CONFIG.SIGNING_KEY;
      const salt = crypto
        .createHash('sha256')
        .update(saltBase)
        .digest()
        .slice(0, 16);
      const key = crypto.scryptSync(MFA_CONFIG.ENCRYPTION_KEY, salt, 32);
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt MFA secret:', error);
      throw new Error('Failed to decrypt MFA secret');
    }
  }

  /**
   * Generate a new TOTP secret and backup codes for user
   */
  async generateMfaSecret(
    userId: string
  ): Promise<{ secret: MfaSecret | null; error: string | null }> {
    try {
      // Generate cryptographically secure TOTP secret using speakeasy
      const secret = this.generateRandomSecret();
      const backupCodes = this.generateBackupCodes();

      // Get user email from database using the userId
      let userEmail: string;
      try {
        const supabase = this.getSupabaseClient();
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();

        if (profileError || !userProfile?.email) {
          throw new Error('User profile not found or email not available');
        }

        userEmail = userProfile.email;
      } catch (dbError) {
        logger.error('Failed to fetch user email for MFA setup:', dbError);
        return {
          secret: null,
          error: 'Failed to retrieve user information for MFA setup',
        };
      }

      // Create QR code URL with proper escaping and validation
      const issuer = MFA_CONFIG.ISSUER_NAME;
      const label = encodeURIComponent(`${issuer}:${userEmail}`);
      const qrCodeUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      return {
        secret: {
          secret,
          qrCodeUrl,
          backupCodes,
        },
        error: null,
      };
    } catch (error) {
      return {
        secret: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate MFA secret',
      };
    }
  }

  /**
   * Enable MFA for a user
   */
  async enableMfa(
    userId: string,
    secret: string,
    verificationCode: string,
    backupCodes: string[]
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Verify the TOTP code first with rate limiting
      const isValidCode = await this.verifyTotpCode(
        secret,
        verificationCode,
        userId
      );
      if (!isValidCode) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Save MFA settings to database
      const supabase = this.supbaseOrServer();

      // Hash backup codes before storing
      const hashedBackupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      );

      const { error: saveError } = await supabase.from('user_mfa').upsert({
        user_id: userId,
        secret: this.encryptSecret(secret, userId),
        backup_codes: hashedBackupCodes,
        backup_codes_used: [],
        is_enabled: true,
        verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (saveError) {
        logger.error('Failed to save MFA settings:', saveError);
        return { success: false, error: 'Failed to save MFA settings' };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_enabled',
        timestamp: new Date().toISOString(),
        metadata: { method: 'totp' },
      });

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable MFA',
      };
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(
    userId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Remove MFA settings from database
      const supabase = this.supbaseOrServer();

      const { error: removeError } = await supabase
        .from('user_mfa')
        .update({
          is_enabled: false,
          secret: null,
          backup_codes: [],
          backup_codes_used: [],
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (removeError) {
        logger.error('Failed to remove MFA settings:', removeError);
        return { success: false, error: 'Failed to remove MFA settings' };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_disabled',
        timestamp: new Date().toISOString(),
      });

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable MFA',
      };
    }
  }

  /**
   * Check and update rate limiting for MFA verification attempts
   */
  private async checkRateLimit(
    userId: string,
    action: 'totp' | 'backup_code'
  ): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    try {
      const supabase = this.supbaseOrServer();
      const now = new Date();
      const windowStart = new Date(
        now.getTime() - MFA_CONFIG.RATE_LIMIT_WINDOW
      );

      // Get recent attempts within the time window
      const { data: attempts, error } = await supabase
        .from('mfa_rate_limit')
        .select('attempts, last_attempt')
        .eq('user_id', userId)
        .eq('action', action)
        .gte('last_attempt', windowStart.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking rate limit:', error);
        return { allowed: false };
      }

      const currentAttempts = attempts?.attempts || 0;

      if (currentAttempts >= MFA_CONFIG.RATE_LIMIT_MAX) {
        return {
          allowed: false,
          remainingAttempts: 0,
        };
      }

      // Update or create rate limit record
      const newAttempts = currentAttempts + 1;
      await supabase.from('mfa_rate_limit').upsert({
        user_id: userId,
        action,
        attempts: newAttempts,
        last_attempt: now.toISOString(),
        window_start: windowStart.toISOString(),
      });

      return {
        allowed: true,
        remainingAttempts: MFA_CONFIG.RATE_LIMIT_MAX - newAttempts,
      };
    } catch (error) {
      logger.error('Error in rate limiting:', error);
      return { allowed: false };
    }
  }

  /**
   * Verify TOTP code with rate limiting
   */
  async verifyTotpCode(
    secret: string,
    code: string,
    userId?: string
  ): Promise<boolean> {
    try {
      if (!secret || !code) {
        return false;
      }

      // Apply rate limiting if userId is provided
      if (userId) {
        const rateCheck = await this.checkRateLimit(userId, 'totp');
        if (!rateCheck.allowed) {
          logger.warn(
            `Rate limit exceeded for user ${userId} TOTP verification`
          );
          return false;
        }
      }

      // Use speakeasy to verify TOTP code with time window tolerance
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 2, // Allow 2 time steps (60 seconds) tolerance
        algorithm: 'sha1',
      });

      return verified;
    } catch (error) {
      logger.error('Error verifying TOTP code:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<MfaVerificationResult> {
    try {
      if (!userId || !code) {
        return {
          success: false,
          error: 'User ID and backup code are required',
        };
      }

      // Apply rate limiting for backup code verification
      const rateCheck = await this.checkRateLimit(userId, 'backup_code');
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: 'Too many verification attempts. Please try again later.',
          remainingAttempts: 0,
        };
      }

      const supabase = this.getSupabaseClient();

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
        const hashedInput = crypto
          .createHash('sha256')
          .update(code)
          .digest('hex');
        if (
          crypto.timingSafeEqual(
            Buffer.from(hashedInput),
            Buffer.from(storedCode)
          )
        ) {
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
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to mark backup code as used:', updateError);
        return { success: false, error: 'Failed to process backup code' };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'backup_code_used',
        timestamp: new Date().toISOString(),
      });

      const remainingCodes = validCodes.length - updatedUsedCodes.length;
      return {
        success: true,
        remainingAttempts: remainingCodes,
      };
    } catch (error) {
      logger.error('Error verifying backup code:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to verify backup code',
      };
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string
  ): Promise<{ codes: string[] | null; error: string | null }> {
    try {
      const newBackupCodes = this.generateBackupCodes();

      // Hash backup codes before storing
      const hashedCodes = newBackupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      );

      const supabase = this.getSupabaseClient();

      // Save hashed backup codes to database and reset used codes
      const { error: updateError } = await supabase
        .from('user_mfa')
        .update({
          backup_codes: hashedCodes,
          backup_codes_used: [], // Reset used codes
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to save backup codes:', updateError);
        return {
          codes: null,
          error: 'Failed to save backup codes to database',
        };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'backup_codes_regenerated',
        timestamp: new Date().toISOString(),
      });

      // Return plain text codes to user (only time they'll see them)
      return { codes: newBackupCodes, error: null };
    } catch (error) {
      logger.error('Error regenerating backup codes:', error);
      return {
        codes: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate backup codes',
      };
    }
  }

  /**
   * Trust a device
   */
  async trustDevice(
    userId: string,
    deviceInfo: Partial<TrustedDevice>
  ): Promise<{ device: TrustedDevice | null; error: string | null }> {
    try {
      const now = new Date();
      const device: TrustedDevice = {
        id: this.generateId(),
        userId,
        deviceName:
          deviceInfo.deviceName || this.deriveDeviceName(deviceInfo.userAgent),
        deviceFingerprint:
          deviceInfo.deviceFingerprint ||
          this.generateDeviceFingerprint(deviceInfo.userAgent ?? undefined),
        ipAddress: deviceInfo.ipAddress ?? null,
        userAgent: deviceInfo.userAgent ?? null,
        location: deviceInfo.location,
        lastUsedAt: now.toISOString(),
        createdAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + this.getTrustedDeviceTtlMs()
        ).toISOString(),
      };

      const supabase = this.getSupabaseClient();
      const { error: saveError } = await supabase
        .from('trusted_devices')
        .upsert({
          id: device.id,
          user_id: device.userId,
          device_name: device.deviceName,
          device_fingerprint: device.deviceFingerprint,
          ip_address: device.ipAddress,
          user_agent: device.userAgent,
          location: device.location,
          last_used_at: device.lastUsedAt,
          expires_at: device.expiresAt,
          created_at: device.createdAt,
        });

      if (saveError) {
        logger.error('Failed to save trusted device:', saveError);
        throw new Error('Failed to save trusted device to database');
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'device_trusted',
        timestamp: new Date().toISOString(),
        ipAddress: device.ipAddress ?? undefined,
        location: device.location,
        deviceInfo: device.deviceName,
      });

      return { device, error: null };
    } catch (error) {
      return {
        device: null,
        error:
          error instanceof Error ? error.message : 'Failed to trust device',
      };
    }
  }

  /**
   * Remove trusted device
   */
  async removeTrustedDevice(
    userId: string,
    deviceId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Remove trusted device from database
      const supabase = this.getSupabaseClient();
      const { error: deleteError } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId)
        .eq('id', deviceId);

      if (deleteError) {
        logger.error('Failed to remove trusted device:', deleteError);
        throw new Error('Failed to remove trusted device from database');
      }

      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to remove trusted device',
      };
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId: string, deviceToken: string): Promise<boolean> {
    try {
      if (!userId || !deviceToken) {
        return false;
      }

      const supabase = this.getSupabaseClient();
      const tokenHash = this.hashTrustedDeviceToken(deviceToken);
      const { data: device, error: fetchError } = await supabase
        .from('trusted_devices')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('device_fingerprint', tokenHash)
        .single();

      if (fetchError || !device) {
        return false;
      }

      if (device.expires_at && new Date(device.expires_at) <= new Date()) {
        await supabase.from('trusted_devices').delete().eq('id', device.id);
        return false;
      }

      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', device.id);

      return true;
    } catch (error) {
      logger.error('Error checking trusted device:', error);
      return false;
    }
  }

  async issueTrustedDeviceToken({
    userId,
    ipAddress,
    userAgent,
  }: {
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<
    | {
        success: true;
        deviceId: string;
        token: string;
        expiresAt: string;
        maxAgeSeconds: number;
      }
    | { success: false; error: string }
  > {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const supabase = this.getSupabaseClient();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.getTrustedDeviceTtlMs());
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashTrustedDeviceToken(token);
      const deviceId = this.generateId();
      const deviceName = this.deriveDeviceName(userAgent);

      const { error: upsertError } = await supabase
        .from('trusted_devices')
        .upsert({
          id: deviceId,
          user_id: userId,
          device_name: deviceName,
          device_fingerprint: tokenHash,
          ip_address: ipAddress ?? null,
          user_agent: userAgent ?? null,
          last_used_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          created_at: now.toISOString(),
        });

      if (upsertError) {
        logger.error('Failed to persist trusted device token:', upsertError);
        return {
          success: false,
          error: 'Failed to persist trusted device token',
        };
      }

      await this.logSecurityEvent({
        userId,
        type: 'device_trusted',
        timestamp: now.toISOString(),
        ipAddress: ipAddress ?? undefined,
        deviceInfo: deviceName,
      });

      return {
        success: true,
        deviceId,
        token,
        expiresAt: expiresAt.toISOString(),
        maxAgeSeconds: Math.max(
          1,
          Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
        ),
      };
    } catch (error) {
      logger.error('Error issuing trusted device token:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to issue trusted device token',
      };
    }
  }

  async verifyTrustedDeviceToken(
    userId: string,
    deviceId: string,
    token: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<boolean> {
    try {
      if (!userId || !deviceId || !token) {
        return false;
      }

      const supabase = this.getSupabaseClient();
      const tokenHash = this.hashTrustedDeviceToken(token);
      const { data: device, error } = await supabase
        .from('trusted_devices')
        .select('id, expires_at')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .eq('device_fingerprint', tokenHash)
        .single();

      if (error || !device) {
        return false;
      }

      if (device.expires_at && new Date(device.expires_at) <= new Date()) {
        await supabase.from('trusted_devices').delete().eq('id', deviceId);
        return false;
      }

      const updatePayload: Record<string, string | null> = {
        last_used_at: new Date().toISOString(),
      };
      if (metadata?.ipAddress !== undefined) {
        updatePayload.ip_address = metadata.ipAddress;
      }
      if (metadata?.userAgent !== undefined) {
        updatePayload.user_agent = metadata.userAgent;
      }

      await supabase
        .from('trusted_devices')
        .update(updatePayload)
        .eq('id', deviceId);

      return true;
    } catch (error) {
      logger.error('Error validating trusted device token:', error);
      return false;
    }
  }

  /**
   * Get user's trusted devices from database
   */
  async getTrustedDevices(
    userId: string
  ): Promise<{ devices: TrustedDevice[]; error: string | null }> {
    try {
      if (!userId) {
        return { devices: [], error: 'User ID is required' };
      }

      const supabase = this.getSupabaseClient();

      // Fetch trusted devices from database
      const { data: devices, error: fetchError } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false });

      if (fetchError) {
        logger.error('Failed to fetch trusted devices:', fetchError);
        return { devices: [], error: 'Failed to fetch trusted devices' };
      }

      // Map database records to TrustedDevice interface
      const trustedDevices: TrustedDevice[] = (devices || []).map(
        (device: TrustedDeviceRow) => ({
          id: device.id,
          userId: device.user_id,
          deviceName: device.device_name ?? undefined,
          deviceFingerprint: device.device_fingerprint,
          ipAddress: device.ip_address,
          userAgent: device.user_agent,
          location: device.location ?? undefined,
          lastUsedAt: device.last_used_at,
          createdAt: device.created_at,
          expiresAt: device.expires_at,
        })
      );

      return { devices: trustedDevices, error: null };
    } catch (error) {
      logger.error('Error getting trusted devices:', error);
      return {
        devices: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get trusted devices',
      };
    }
  }

  /**
   * Get security events for user from database
   */
  async getSecurityEvents(
    userId: string,
    limit = 50
  ): Promise<{ events: SecurityEvent[]; error: string | null }> {
    try {
      if (!userId) {
        return { events: [], error: 'User ID is required' };
      }

      const supabase = this.getSupabaseClient();

      // Fetch security events from database
      const { data: events, error: fetchError } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(Math.min(limit, 100)); // Cap at 100 for performance

      if (fetchError) {
        logger.error('Failed to fetch security events:', fetchError);
        return { events: [], error: 'Failed to fetch security events' };
      }

      // Map database records to SecurityEvent interface
      const securityEvents: SecurityEvent[] = (events || []).map(
        (event: SecurityEventRow) => ({
          id: event.id,
          userId: event.user_id,
          type: event.type,
          timestamp: event.timestamp,
          ipAddress: event.ip_address,
          location: event.location,
          deviceInfo: event.device_info,
          metadata: event.metadata,
        })
      );

      return { events: securityEvents, error: null };
    } catch (error) {
      logger.error('Error getting security events:', error);
      return {
        events: [],
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get security events',
      };
    }
  }

  /**
   * Log a security event to the database
   */
  private async logSecurityEvent(
    event: Omit<SecurityEvent, 'id'>
  ): Promise<void> {
    try {
      if (!event.userId || !event.type) {
        logger.error('Invalid security event: userId and type are required');
        return;
      }

      const supabase = this.getSupabaseClient();

      // Insert security event into database
      const { error: insertError } = await supabase
        .from('security_events')
        .insert({
          user_id: event.userId,
          type: event.type,
          timestamp: event.timestamp,
          ip_address: event.ipAddress,
          location: event.location,
          device_info: event.deviceInfo,
          metadata: event.metadata,
        });

      if (insertError) {
        logger.error('Failed to log security event to database:', insertError);
        // Don't throw here as logging failures shouldn't break the main flow
      }
    } catch (error) {
      logger.error('Failed to log security event:', error);
      // Don't throw here as logging failures shouldn't break the main flow
    }
  }

  /**
   * Generate a cryptographically secure TOTP secret using speakeasy
   * @returns Base32-encoded secret suitable for TOTP
   */
  private generateRandomSecret(): string {
    try {
      // Use speakeasy to generate a cryptographically secure secret
      const secret = speakeasy.generateSecret({
        length: 32, // 32 bytes = 256 bits of entropy
        name: 'User Account',
        issuer: MFA_CONFIG.ISSUER_NAME,
      });

      if (!secret.base32) {
        throw new Error('Failed to generate base32 secret');
      }

      return secret.base32;
    } catch (error) {
      logger.error('Failed to generate secure TOTP secret:', error);
      throw new Error('Failed to generate secure TOTP secret');
    }
  }

  /**
   * Generate cryptographically secure backup codes
   * @param count Number of backup codes to generate (default: 8)
   * @returns Array of cryptographically secure backup codes
   */
  private generateBackupCodes(count = 8): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        // Generate 8 cryptographically secure random bytes
        const randomBytes = crypto.randomBytes(8);

        // Convert to a 16-character hexadecimal string and format as XXXX-XXXX
        const hexString = randomBytes.toString('hex').toUpperCase();
        const formattedCode = `${hexString.slice(0, 4)}-${hexString.slice(4, 8)}`;

        codes.push(formattedCode);
      } catch (error) {
        logger.error('Failed to generate secure backup code:', error);
        throw new Error('Failed to generate secure backup codes');
      }
    }

    return codes;
  }

  /**
   * Generate a cryptographically secure unique ID
   * @returns Cryptographically secure UUID-like string
   */
  private generateId(): string {
    try {
      return crypto.randomUUID();
    } catch (error) {
      logger.error('Failed to generate secure ID:', error);
      throw new Error('Failed to generate secure ID');
    }
  }

  /**
   * Generate cryptographically secure device fingerprint
   * @param deviceInfo Optional device characteristics for fingerprinting
   * @returns Secure device fingerprint
   */
  private generateDeviceFingerprint(deviceInfo?: string): string {
    try {
      // Generate base fingerprint from secure random data
      const randomBytes = crypto.randomBytes(16);
      const baseFingerprint = randomBytes.toString('hex');

      // If device info is provided, incorporate it into the fingerprint
      if (deviceInfo) {
        const hash = crypto.createHash('sha256');
        hash.update(baseFingerprint + deviceInfo + Date.now().toString());
        return 'fp_' + hash.digest('hex').substring(0, 24);
      }

      return 'fp_' + baseFingerprint.substring(0, 24);
    } catch (error) {
      logger.error('Failed to generate secure device fingerprint:', error);
      throw new Error('Failed to generate secure device fingerprint');
    }
  }

  private getTrustedDeviceTtlMs(): number {
    const fallbackDays = 30;
    const raw = process.env.MFA_TRUSTED_DEVICE_TTL_DAYS;
    const parsed = raw ? Number.parseInt(raw, 10) : fallbackDays;
    const days =
      Number.isFinite(parsed) && parsed > 0 && parsed <= 365
        ? parsed
        : fallbackDays;
    return days * 24 * 60 * 60 * 1000;
  }

  private hashTrustedDeviceToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private deriveDeviceName(userAgent?: string | null): string {
    if (!userAgent) {
      return 'Trusted device';
    }

    const ua = userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) {
      return 'iOS device';
    }
    if (ua.includes('android')) {
      return 'Android device';
    }
    if (ua.includes('mac os') || ua.includes('macintosh')) {
      return 'macOS device';
    }
    if (ua.includes('windows')) {
      return 'Windows device';
    }
    if (ua.includes('linux')) {
      return 'Linux device';
    }

    return userAgent.slice(0, 64);
  }

  /**
   * Get MFA status for a user from database
   */
  async getMFAStatus(userId: string): Promise<MfaStatus> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const supabase = this.getSupabaseClient();

      // Fetch MFA settings from database
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_mfa')
        .select(
          'is_enabled, secret, verified_at, backup_codes, backup_codes_used'
        )
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        // If no MFA record exists, user hasn't set up MFA yet
        if (fetchError.code === 'PGRST116') {
          return {
            isEnabled: false,
            isSetup: false,
            verifiedAt: undefined,
            backupCodesRemaining: 0,
          };
        }

        logger.error('Failed to fetch MFA status:', fetchError);
        throw new Error('Failed to fetch MFA status');
      }

      const backupCodes = mfaData?.backup_codes || [];
      const usedCodes = mfaData?.backup_codes_used || [];
      const backupCodesRemaining = Math.max(
        0,
        backupCodes.length - usedCodes.length
      );

      return {
        isEnabled: mfaData?.is_enabled || false,
        isSetup: !!mfaData?.secret,
        verifiedAt: mfaData?.verified_at || undefined,
        backupCodesRemaining,
      };
    } catch (error) {
      logger.error('Error getting MFA status:', error);
      return {
        isEnabled: false,
        isSetup: false,
        verifiedAt: undefined,
        backupCodesRemaining: 0,
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
      logger.error('Error checking MFA requirement:', error);
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

      // Create QR code URL with proper validation
      if (!email || !email.includes('@')) {
        throw new Error('Valid email address is required for MFA setup');
      }

      const issuer = MFA_CONFIG.ISSUER_NAME;
      const label = encodeURIComponent(`${issuer}:${email}`);
      const qrCodeUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      return {
        secret,
        qrCodeUrl,
        manualEntryKey: secret,
        backupCodes,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to setup MFA'
      );
    }
  }

  /**
   * Generate MFA setup (client-side compatible method)
   */
  async generateMfaSetup(
    userId: string,
    email: string
  ): Promise<{ data?: MfaSetupData; error?: string }> {
    try {
      const setupData = await this.setupMFA(userId, email);
      return { data: setupData };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate MFA setup',
      };
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMFA(
    userId: string,
    totpCode: string,
    _ipAddress?: string | null,
    _userAgent?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!userId || !totpCode) {
        return {
          success: false,
          error: 'User ID and verification code are required',
        };
      }

      const supabase = this.getSupabaseClient();

      // Get user's MFA secret from database
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_mfa')
        .select('secret, is_enabled')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaData) {
        return {
          success: false,
          error: 'MFA setup not found. Please set up MFA first.',
        };
      }

      if (mfaData.is_enabled) {
        return {
          success: false,
          error: 'MFA is already enabled for this user',
        };
      }

      // Verify the TOTP code with the user's secret
      const decryptedSecret = this.decryptSecret(mfaData.secret, userId);
      const isValid = await this.verifyTotpCode(
        decryptedSecret,
        totpCode,
        userId
      );
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Enable MFA in database
      const { error: updateError } = await supabase
        .from('user_mfa')
        .update({
          is_enabled: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to enable MFA:', updateError);
        return { success: false, error: 'Failed to enable MFA' };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_enabled',
        timestamp: new Date().toISOString(),
        ipAddress: _ipAddress || undefined,
        deviceInfo: _userAgent || undefined,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error enabling MFA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable MFA',
      };
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(
    userId: string,
    totpCode: string,
    _ipAddress?: string | null,
    _userAgent?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!userId || !totpCode) {
        return {
          success: false,
          error: 'User ID and verification code are required',
        };
      }

      const supabase = this.getSupabaseClient();

      // Get user's MFA secret from database first
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_mfa')
        .select('secret, is_enabled')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaData) {
        return { success: false, error: 'MFA not found for user' };
      }

      if (!mfaData.is_enabled) {
        return { success: false, error: 'MFA is not enabled for this user' };
      }

      // Verify TOTP code with user's secret
      const decryptedSecret = this.decryptSecret(mfaData.secret, userId);
      const isValid = await this.verifyTotpCode(
        decryptedSecret,
        totpCode,
        userId
      );
      if (!isValid) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Disable MFA in database
      const { error: updateError } = await supabase
        .from('user_mfa')
        .update({
          is_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to disable MFA:', updateError);
        return { success: false, error: 'Failed to disable MFA' };
      }

      // Log security event
      await this.logSecurityEvent({
        userId,
        type: 'mfa_disabled',
        timestamp: new Date().toISOString(),
        ipAddress: _ipAddress || undefined,
        deviceInfo: _userAgent || undefined,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error disabling MFA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable MFA',
      };
    }
  }

  /**
   * Verify MFA code (TOTP or backup code)
   */
  async verifyMFA(
    userId: string,
    code: string,
    method: 'totp' | 'backup_code',
    _ipAddress?: string | null,
    _userAgent?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (method === 'totp') {
        // Get user's MFA secret from database
        const supabase = this.getSupabaseClient();
        const { data: mfaData, error: fetchError } = await supabase
          .from('user_mfa')
          .select('secret, is_enabled')
          .eq('user_id', userId)
          .single();

        if (fetchError || !mfaData || !mfaData.is_enabled) {
          return { success: false, error: 'MFA not enabled for user' };
        }

        const decryptedSecret = this.decryptSecret(mfaData.secret, userId);
        const isValid = await this.verifyTotpCode(
          decryptedSecret,
          code,
          userId
        );
        return {
          success: isValid,
          error: isValid ? undefined : 'Invalid TOTP code',
        };
      } else if (method === 'backup_code') {
        const result = await this.verifyBackupCode(userId, code);
        return { success: result.success, error: result.error };
      }

      return { success: false, error: 'Invalid verification method' };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to verify MFA code',
      };
    }
  }

  /**
   * Validate MFA session
   */
  async validateMfaSession(sessionToken: string): Promise<{
    session?: {
      sessionToken: string;
      mfaVerified: boolean;
      userId: string;
      expiresAt: string;
    } | null;
    error?: string;
  }> {
    try {
      if (!sessionToken || !sessionToken.startsWith('mfa_')) {
        return { session: null, error: 'Invalid session token' };
      }

      // Validate token format
      const tokenPart = sessionToken.replace('mfa_', '');
      if (tokenPart.length !== 64) {
        return { session: null, error: 'Invalid session token format' };
      }

      const supabase = this.getSupabaseClient();
      const { data: session, error } = await supabase
        .from('mfa_sessions')
        .select('user_id, mfa_verified, expires_at')
        .eq('session_token', sessionToken)
        .single();

      if (error || !session) {
        return { session: null, error: 'Invalid or expired session token' };
      }

      if (new Date(session.expires_at) < new Date()) {
        return { session: null, error: 'Session has expired' };
      }

      return {
        session: {
          sessionToken,
          mfaVerified: session.mfa_verified,
          userId: session.user_id,
          expiresAt: session.expires_at,
        },
      };
    } catch (error) {
      logger.error('Error validating MFA session:', error);
      return {
        session: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to validate MFA session',
      };
    }
  }

  /**
   * Create MFA session
   */
  async createMfaSession(
    userId: string,
    temporary = false
  ): Promise<{
    session?: {
      sessionToken: string;
      expiresAt: string;
      userId: string;
      mfaVerified: boolean;
    };
    error?: string;
  }> {
    try {
      // Create a cryptographically secure session token
      const sessionToken = 'mfa_' + crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + (temporary ? 10 * 60 * 1000 : 60 * 60 * 1000)
      ).toISOString();

      // Store session in database
      const supabase = this.getSupabaseClient();
      const { error: insertError } = await supabase
        .from('mfa_sessions')
        .insert({
          session_token: sessionToken,
          user_id: userId,
          mfa_verified: false,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error('Failed to create MFA session:', insertError);
        return {
          session: undefined,
          error: 'Failed to create MFA session in database',
        };
      }

      return {
        session: {
          sessionToken,
          expiresAt,
          userId,
          mfaVerified: false,
        },
      };
    } catch (error) {
      return {
        session: undefined,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create MFA session',
      };
    }
  }

  /**
   * Complete MFA session (mark as verified)
   */
  async completeMfaSession(
    sessionToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!sessionToken || !sessionToken.startsWith('mfa_')) {
        return { success: false, error: 'Invalid session token' };
      }

      // Validate token format
      const tokenPart = sessionToken.replace('mfa_', '');
      if (tokenPart.length !== 64) {
        // Should be 32 bytes = 64 hex chars
        return { success: false, error: 'Invalid session token format' };
      }

      // Update session in database to mark MFA as verified
      const supabase = this.getSupabaseClient();
      const { data: session, error: fetchError } = await supabase
        .from('mfa_sessions')
        .select('expires_at')
        .eq('session_token', sessionToken)
        .single();

      if (fetchError || !session) {
        return { success: false, error: 'Session not found or expired' };
      }

      // Check if session is still valid
      if (new Date(session.expires_at) < new Date()) {
        return { success: false, error: 'Session has expired' };
      }

      // Mark session as MFA verified
      const { error: updateError } = await supabase
        .from('mfa_sessions')
        .update({
          mfa_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('session_token', sessionToken);

      if (updateError) {
        logger.error('Failed to update MFA session:', updateError);
        return { success: false, error: 'Failed to update session' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error completing MFA session:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to complete MFA session',
      };
    }
  }

  /**
   * Client-side MFA verification (simplified interface)
   */
  async verifyMfa(
    userId: string,
    options: {
      method: 'totp' | 'backup_code';
      code: string;
      rememberDevice?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
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
            rememberDevice: options.rememberDevice,
          }),
        });

        const result = await response.json();
        return {
          success: result.success || false,
          error:
            result.error ||
            (result.success ? undefined : 'Verification failed'),
        };
      }

      // Server-side verification
      return await this.verifyMFA(userId, options.code, options.method);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to verify MFA code',
      };
    }
  }

  /**
   * Regenerate backup codes with TOTP verification (new method signature)
   */
  async regenerateBackupCodesWithVerification(
    userId: string,
    totpCode: string,
    _ipAddress?: string | null,
    _userAgent?: string | null
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      if (!userId || !totpCode) {
        return {
          success: false,
          error: 'User ID and verification code are required',
        };
      }

      const supabase = this.getSupabaseClient();

      // Get user's MFA secret from database first
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_mfa')
        .select('secret, is_enabled')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaData) {
        return { success: false, error: 'MFA not found for user' };
      }

      if (!mfaData.is_enabled) {
        return { success: false, error: 'MFA is not enabled for this user' };
      }

      // Verify TOTP code with user's secret
      const decryptedSecret = this.decryptSecret(mfaData.secret, userId);
      const isValid = await this.verifyTotpCode(
        decryptedSecret,
        totpCode,
        userId
      );
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
        error:
          error instanceof Error
            ? error.message
            : 'Failed to regenerate backup codes',
      };
    }
  }
}

// Factory function to create MFA service instances
export const createMfaService = (isServer = true) => {
  // Only create service when actually called, not during module load
  return new MfaService(isServer);
};

// Also export with uppercase 'MFA' for backward compatibility
export const createMFAService = createMfaService;

// Server-side MFA helpers
export const getMfaSecret = async (
  userId: string
): Promise<MfaSecret | null> => {
  const mfaService = createMfaService(true);
  const { secret } = await mfaService.generateMfaSecret(userId);
  return secret;
};

export const verifyMfaCode = async (
  secret: string,
  code: string,
  userId?: string
): Promise<boolean> => {
  const mfaService = createMfaService(true);
  return mfaService.verifyTotpCode(secret, code, userId);
};

export const getUserTrustedDevices = async (
  userId: string
): Promise<TrustedDevice[]> => {
  const mfaService = createMfaService(true);
  const { devices } = await mfaService.getTrustedDevices(userId);
  return devices;
};

export const getUserSecurityEvents = async (
  userId: string,
  limit?: number
): Promise<SecurityEvent[]> => {
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
