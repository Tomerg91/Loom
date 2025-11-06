import type { Notification } from '@/types';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailDeliveryLog {
  id: string;
  to: string;
  template: string;
  status: 'sent' | 'failed' | 'pending';
  attempts: number;
  lastError?: string;
  sentAt?: Date;
  failedAt?: Date;
}

export class EnhancedEmailService {
  private apiKey: string | undefined;
  private fromEmail: string;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second
  private deliveryLogs: Map<string, EmailDeliveryLog> = new Map();

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@loom-coach.com';
  }

  /**
   * Send email with automatic retry logic
   */
  async sendWithRetry(
    to: string,
    template: string,
    data: any,
    options?: {
      maxRetries?: number;
      priority?: 'high' | 'normal' | 'low';
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const maxRetries = options?.maxRetries ?? this.maxRetries;
    const logId = `${to}-${template}-${Date.now()}`;

    this.deliveryLogs.set(logId, {
      id: logId,
      to,
      template,
      status: 'pending',
      attempts: 0,
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const log = this.deliveryLogs.get(logId)!;
        log.attempts = attempt + 1;

        const result = await this.send(to, template, data);

        if (result.success) {
          log.status = 'sent';
          log.sentAt = new Date();
          return result;
        }

        // If last attempt, mark as failed
        if (attempt === maxRetries - 1) {
          log.status = 'failed';
          log.failedAt = new Date();
          log.lastError = result.error;
          return result;
        }

        // Exponential backoff with jitter
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);

      } catch (error) {
        console.error(`Email attempt ${attempt + 1}/${maxRetries} failed:`, error);

        if (attempt === maxRetries - 1) {
          const log = this.deliveryLogs.get(logId)!;
          log.status = 'failed';
          log.failedAt = new Date();
          log.lastError = error instanceof Error ? error.message : String(error);

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send email',
          };
        }

        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Send email (single attempt)
   */
  private async send(
    to: string,
    template: string,
    data: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.warn('Email service not configured - API key missing');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailTemplate = this.getEmailTemplate(template, data);

      // Use Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to send email:', result);
        return {
          success: false,
          error: result.message || 'Failed to send email',
        };
      }

      console.log(`Email sent successfully to ${to} - Template: ${template}`);
      return {
        success: true,
        messageId: result.id,
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    notification: Notification,
    recipientEmail: string,
    recipientName: string
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      notification.type,
      {
        recipientName,
        notification,
        ...notification.data,
      }
    );

    return result.success;
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string,
    userRole: 'client' | 'coach'
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      'welcome',
      {
        recipientName,
        userRole,
      },
      { priority: 'high' }
    );

    return result.success;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    recipientEmail: string,
    recipientName: string,
    resetToken: string,
    expiresIn: number = 3600 // 1 hour in seconds
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      'password_reset',
      {
        recipientName,
        resetToken,
        expiresIn,
      },
      { priority: 'high' }
    );

    return result.success;
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    recipientEmail: string,
    recipientName: string,
    verificationToken: string
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      'email_verification',
      {
        recipientName,
        verificationToken,
      },
      { priority: 'high' }
    );

    return result.success;
  }

  /**
   * Send session reminder email
   */
  async sendSessionReminderEmail(
    recipientEmail: string,
    recipientName: string,
    sessionData: {
      title: string;
      coachName: string;
      scheduledAt: string;
      meetingLink?: string;
    }
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      'session_reminder',
      {
        recipientName,
        ...sessionData,
      }
    );

    return result.success;
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceiptEmail(
    recipientEmail: string,
    recipientName: string,
    paymentData: {
      amount: number;
      currency: string;
      description: string;
      receiptUrl?: string;
      date: string;
    }
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      'payment_receipt',
      {
        recipientName,
        ...paymentData,
      }
    );

    return result.success;
  }

  /**
   * Send resource shared notification email
   */
  async sendResourceSharedEmail(
    recipientEmail: string,
    recipientName: string,
    resourceData: {
      resourceTitle: string;
      resourceType: string;
      sharedBy: string;
      resourceUrl: string;
    }
  ): Promise<boolean> {
    const result = await this.sendWithRetry(
      recipientEmail,
      'resource_shared',
      {
        recipientName,
        ...resourceData,
      }
    );

    return result.success;
  }

  /**
   * Get email template based on type
   */
  private getEmailTemplate(template: string, data: any): EmailTemplate {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    switch (template) {
      case 'welcome':
        return this.getWelcomeTemplate(data, baseUrl);
      case 'password_reset':
        return this.getPasswordResetTemplate(data, baseUrl);
      case 'email_verification':
        return this.getEmailVerificationTemplate(data, baseUrl);
      case 'session_reminder':
        return this.getSessionReminderTemplate(data, baseUrl);
      case 'payment_receipt':
        return this.getPaymentReceiptTemplate(data, baseUrl);
      case 'resource_shared':
        return this.getResourceSharedTemplate(data, baseUrl);
      case 'coach_approved':
        return this.getCoachApprovedTemplate(data, baseUrl);
      case 'coach_rejected':
        return this.getCoachRejectedTemplate(data, baseUrl);
      default:
        return this.getDefaultTemplate(data, baseUrl);
    }
  }

  /**
   * Template generators
   */
  private getWelcomeTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, userRole } = data;
    const roleContent = userRole === 'coach'
      ? 'Start building meaningful relationships with your clients and track their progress.'
      : 'Begin your coaching journey and discover new insights about yourself.';

    return {
      subject: 'Welcome to Loom Coaching!',
      html: this.wrapInBaseTemplate(
        `<h2>Welcome, ${recipientName}!</h2>
        <p>${roleContent}</p>
        <div style="margin: 30px 0;">
          <a href="${baseUrl}/dashboard" class="button">Get Started</a>
        </div>`,
        baseUrl
      ),
      text: `Welcome to Loom Coaching, ${recipientName}!\n\n${roleContent}\n\nGet started: ${baseUrl}/dashboard`,
    };
  }

  private getPasswordResetTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, resetToken, expiresIn } = data;
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    const expiresInMinutes = Math.floor(expiresIn / 60);

    return {
      subject: 'Reset Your Password - Loom Coaching',
      html: this.wrapInBaseTemplate(
        `<h2>Password Reset Request</h2>
        <p>Hi ${recipientName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        <p>This link will expire in ${expiresInMinutes} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>`,
        baseUrl
      ),
      text: `Password Reset Request\n\nHi ${recipientName},\n\nReset your password: ${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes.`,
    };
  }

  private getEmailVerificationTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, verificationToken } = data;
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    return {
      subject: 'Verify Your Email - Loom Coaching',
      html: this.wrapInBaseTemplate(
        `<h2>Verify Your Email Address</h2>
        <p>Hi ${recipientName},</p>
        <p>Please verify your email address to complete your registration:</p>
        <div style="margin: 30px 0;">
          <a href="${verifyUrl}" class="button">Verify Email</a>
        </div>
        <p>If you didn't create an account, you can safely ignore this email.</p>`,
        baseUrl
      ),
      text: `Verify Your Email\n\nHi ${recipientName},\n\nVerify your email: ${verifyUrl}`,
    };
  }

  private getSessionReminderTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, title, coachName, scheduledAt, meetingLink } = data;
    const sessionTime = new Date(scheduledAt).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      subject: `Reminder: ${title} - ${new Date(scheduledAt).toLocaleDateString()}`,
      html: this.wrapInBaseTemplate(
        `<h2>Session Reminder</h2>
        <p>Hi ${recipientName},</p>
        <p>This is a reminder about your upcoming coaching session:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${title}</h3>
          <p><strong>Coach:</strong> ${coachName}</p>
          <p><strong>Date & Time:</strong> ${sessionTime}</p>
          ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
        </div>
        <div style="margin: 30px 0;">
          <a href="${baseUrl}/sessions" class="button">View Session Details</a>
        </div>`,
        baseUrl
      ),
      text: `Session Reminder\n\n${title}\nCoach: ${coachName}\nTime: ${sessionTime}\n\nView details: ${baseUrl}/sessions`,
    };
  }

  private getPaymentReceiptTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, amount, currency, description, date, receiptUrl } = data;
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);

    return {
      subject: `Payment Receipt - ${formattedAmount}`,
      html: this.wrapInBaseTemplate(
        `<h2>Payment Received</h2>
        <p>Hi ${recipientName},</p>
        <p>Thank you for your payment. Here are the details:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${formattedAmount}</p>
          <p><strong>Description:</strong> ${description}</p>
          <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
        </div>
        ${receiptUrl ? `<div style="margin: 30px 0;"><a href="${receiptUrl}" class="button">Download Receipt</a></div>` : ''}`,
        baseUrl
      ),
      text: `Payment Receipt\n\nAmount: ${formattedAmount}\nDescription: ${description}\nDate: ${new Date(date).toLocaleDateString()}`,
    };
  }

  private getResourceSharedTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, resourceTitle, resourceType, sharedBy, resourceUrl } = data;

    return {
      subject: `New Resource Shared: ${resourceTitle}`,
      html: this.wrapInBaseTemplate(
        `<h2>New Resource Shared</h2>
        <p>Hi ${recipientName},</p>
        <p>${sharedBy} has shared a new resource with you:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${resourceTitle}</h3>
          <p><strong>Type:</strong> ${resourceType}</p>
        </div>
        <div style="margin: 30px 0;">
          <a href="${resourceUrl}" class="button">View Resource</a>
        </div>`,
        baseUrl
      ),
      text: `New Resource Shared\n\n${resourceTitle}\nType: ${resourceType}\nShared by: ${sharedBy}\n\nView: ${resourceUrl}`,
    };
  }

  private getCoachApprovedTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, coachName } = data;

    return {
      subject: 'Congratulations! Your Coach Application Has Been Approved',
      html: this.wrapInBaseTemplate(
        `<h2>🎉 Application Approved!</h2>
        <p>Hi ${recipientName},</p>
        <p>Great news! Your coach application has been approved. You can now start accepting clients and booking sessions on Loom Coaching.</p>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #059669; margin-top: 0;">What's Next?</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Complete your profile if you haven't already</li>
            <li>Set your availability schedule</li>
            <li>Upload resources for your clients</li>
            <li>Start accepting session bookings</li>
          </ul>
        </div>
        <div style="margin: 30px 0;">
          <a href="${baseUrl}/coach/dashboard" class="button">Go to Coach Dashboard</a>
        </div>
        <p>Welcome to the Loom Coaching community!</p>`,
        baseUrl
      ),
      text: `Congratulations! Your Coach Application Has Been Approved\n\nHi ${recipientName},\n\nYour coach application has been approved. You can now start accepting clients on Loom Coaching.\n\nGet started: ${baseUrl}/coach/dashboard`,
    };
  }

  private getCoachRejectedTemplate(data: any, baseUrl: string): EmailTemplate {
    const { recipientName, reason, notes } = data;

    return {
      subject: 'Update on Your Coach Application',
      html: this.wrapInBaseTemplate(
        `<h2>Application Update</h2>
        <p>Hi ${recipientName},</p>
        <p>Thank you for your interest in becoming a coach on Loom Coaching. After careful review, we're unable to approve your application at this time.</p>
        ${reason ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Reason</h3>
          <p style="margin: 0;">${reason}</p>
        </div>
        ` : ''}
        ${notes ? `
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Additional Notes</h3>
          <p style="margin: 0;">${notes}</p>
        </div>
        ` : ''}
        <p>We encourage you to review the requirements and reapply in the future. If you have any questions, please don't hesitate to contact our support team.</p>
        <div style="margin: 30px 0;">
          <a href="${baseUrl}/contact" class="button" style="background: #6b7280;">Contact Support</a>
        </div>`,
        baseUrl
      ),
      text: `Update on Your Coach Application\n\nHi ${recipientName},\n\nThank you for your interest in becoming a coach on Loom Coaching. After careful review, we're unable to approve your application at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}${notes ? `Notes: ${notes}\n\n` : ''}Contact us: ${baseUrl}/contact`,
    };
  }

  private getDefaultTemplate(data: any, baseUrl: string): EmailTemplate {
    return {
      subject: data.subject || 'Notification from Loom Coaching',
      html: this.wrapInBaseTemplate(
        `<h2>${data.title || 'Notification'}</h2>
        <p>${data.message || ''}</p>`,
        baseUrl
      ),
      text: `${data.title || 'Notification'}\n\n${data.message || ''}`,
    };
  }

  /**
   * Wrap content in base email template
   */
  private wrapInBaseTemplate(content: string, baseUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #ea580c;
          }
          .header h1 {
            color: #ea580c;
            margin: 0;
            font-size: 28px;
          }
          .button {
            display: inline-block;
            background: #ea580c;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .footer a {
            color: #ea580c;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Loom Coaching</h1>
          </div>
          ${content}
          <div class="footer">
            <p>© ${new Date().getFullYear()} Loom Coaching. All rights reserved.</p>
            <p><a href="${baseUrl}/settings/notifications">Manage Email Preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get delivery logs for monitoring
   */
  getDeliveryLogs(): EmailDeliveryLog[] {
    return Array.from(this.deliveryLogs.values());
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    successRate: number;
  } {
    const logs = this.getDeliveryLogs();
    const total = logs.length;
    const sent = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const pending = logs.filter(l => l.status === 'pending').length;
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    return { total, sent, failed, pending, successRate };
  }
}

// Export singleton instance
export const enhancedEmailService = new EnhancedEmailService();
