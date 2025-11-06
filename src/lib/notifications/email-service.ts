import type { Notification } from '@/types';

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private apiKey: string | undefined;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@loom-coach.com';
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    notification: Notification,
    recipientEmail: string,
    recipientName: string
  ): Promise<boolean> {
    if (!this.apiKey) {
      logger.warn('Email service not configured - RESEND_API_KEY missing');
      return false;
    }

    try {
      const template = this.getEmailTemplate(notification, recipientName);
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: recipientEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('Failed to send email:', error);
        return false;
      }

      logger.debug('Email sent successfully for notification:', notification.id);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Generate email template based on notification type
   */
  private getEmailTemplate(notification: Notification, recipientName: string): EmailTemplate {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    switch (notification.type) {
      case 'session_reminder':
        return this.getSessionReminderTemplate(notification, recipientName, baseUrl);
      case 'session_confirmation':
        return this.getSessionConfirmationTemplate(notification, recipientName, baseUrl);
      case 'new_message':
        return this.getNewMessageTemplate(notification, recipientName, baseUrl);
      case 'system_update':
        return this.getSystemUpdateTemplate(notification, recipientName, baseUrl);
      default:
        return this.getDefaultTemplate(notification, recipientName, baseUrl);
    }
  }

  private getSessionReminderTemplate(notification: Notification, recipientName: string, baseUrl: string): EmailTemplate {
    const sessionData = notification.data as Record<string, unknown>;
    
    return {
      subject: `Reminder: Your coaching session is tomorrow`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Session Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Session Reminder</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Hi ${recipientName},</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            ${sessionData?.sessionTitle ? `
              <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #495057;">Session Details:</h3>
                <p><strong>Title:</strong> ${sessionData.sessionTitle}</p>
                ${sessionData.coachName ? `<p><strong>Coach:</strong> ${sessionData.coachName}</p>` : ''}
                ${sessionData.scheduledAt ? `<p><strong>Time:</strong> ${new Date(String(sessionData.scheduledAt)).toLocaleString()}</p>` : ''}
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/sessions" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Session Details</a>
          </div>
          
          <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p>This is an automated message from Loom Coach. If you have any questions, please contact support.</p>
          </div>
        </body>
        </html>
      `,
      text: `${notification.title}\n\nHi ${recipientName},\n\n${notification.message}\n\nView your sessions: ${baseUrl}/sessions`
    };
  }

  private getSessionConfirmationTemplate(notification: Notification, recipientName: string, baseUrl: string): EmailTemplate {
    const sessionData = notification.data as Record<string, unknown>;
    
    return {
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">${notification.title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Hi ${recipientName},</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            ${sessionData?.sessionTitle ? `
              <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745;">
                <h3 style="margin-top: 0; color: #495057;">Session Information:</h3>
                <p><strong>Title:</strong> ${sessionData.sessionTitle}</p>
                ${sessionData.coachName ? `<p><strong>Coach:</strong> ${sessionData.coachName}</p>` : ''}
                ${sessionData.clientName ? `<p><strong>Client:</strong> ${sessionData.clientName}</p>` : ''}
                ${sessionData.scheduledAt ? `<p><strong>Scheduled:</strong> ${new Date(String(sessionData.scheduledAt)).toLocaleString()}</p>` : ''}
                ${sessionData.newScheduledAt ? `<p><strong>New Time:</strong> ${new Date(String(sessionData.newScheduledAt)).toLocaleString()}</p>` : ''}
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/sessions" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Sessions</a>
          </div>
          
          <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p>This is an automated message from Loom Coach.</p>
          </div>
        </body>
        </html>
      `,
      text: `${notification.title}\n\nHi ${recipientName},\n\n${notification.message}\n\nView your sessions: ${baseUrl}/sessions`
    };
  }

  private getNewMessageTemplate(notification: Notification, recipientName: string, baseUrl: string): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">${notification.title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Hi ${recipientName},</h2>
            <p style="font-size: 16px;">${notification.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/dashboard" style="background: #6f42c1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Message</a>
          </div>
          
          <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p>This is an automated message from Loom Coach.</p>
          </div>
        </body>
        </html>
      `,
      text: `${notification.title}\n\nHi ${recipientName},\n\n${notification.message}\n\nView messages: ${baseUrl}/dashboard`
    };
  }

  private getSystemUpdateTemplate(notification: Notification, recipientName: string, baseUrl: string): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">${notification.title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Hi ${recipientName},</h2>
            <p style="font-size: 16px;">${notification.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}" style="background: #fd7e14; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Visit Loom Coach</a>
          </div>
          
          <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p>This is an automated message from Loom Coach.</p>
          </div>
        </body>
        </html>
      `,
      text: `${notification.title}\n\nHi ${recipientName},\n\n${notification.message}\n\nVisit: ${baseUrl}`
    };
  }

  private getDefaultTemplate(notification: Notification, recipientName: string, baseUrl: string): EmailTemplate {
    return {
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #495057 0%, #6c757d 100%); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">${notification.title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0;">Hi ${recipientName},</h2>
            <p style="font-size: 16px;">${notification.message}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}" style="background: #495057; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Visit Loom Coach</a>
          </div>
          
          <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p>This is an automated message from Loom Coach.</p>
          </div>
        </body>
        </html>
      `,
      text: `${notification.title}\n\nHi ${recipientName},\n\n${notification.message}\n\nVisit: ${baseUrl}`
    };
  }

  /**
   * Send session reminder email directly
   */
  async sendSessionReminderEmail(
    recipientEmail: string,
    recipientName: string,
    sessionTitle: string,
    coachName: string,
    scheduledAt: string
  ): Promise<boolean> {
    const mockNotification: Notification = {
      id: 'email-reminder',
      userId: 'temp',
      type: 'session_reminder',
      title: 'Session Reminder',
      message: `Don't forget about your session "${sessionTitle}" tomorrow at ${new Date(scheduledAt).toLocaleTimeString()}`,
      data: { sessionTitle, coachName, scheduledAt },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.sendNotificationEmail(mockNotification, recipientEmail, recipientName);
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string,
    userRole: 'client' | 'coach'
  ): Promise<boolean> {
    if (!this.apiKey) {
      logger.warn('Email service not configured - RESEND_API_KEY missing');
      return false;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const roleSpecificContent = userRole === 'coach' 
      ? 'Start building meaningful relationships with your clients and track their progress.'
      : 'Begin your coaching journey and discover new insights about yourself.';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: recipientEmail,
          subject: 'Welcome to Loom Coach!',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Loom Coach</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 32px;">Welcome to Loom Coach!</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your coaching journey starts here</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #495057; margin-top: 0;">Hi ${recipientName},</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">Welcome to Loom Coach! We're excited to have you join our community.</p>
                <p style="font-size: 16px; margin-bottom: 20px;">${roleSpecificContent}</p>
                
                <div style="background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #495057;">Getting Started:</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    ${userRole === 'coach' 
                      ? `
                        <li>Set up your availability schedule</li>
                        <li>Create your coach profile</li>
                        <li>Start accepting session bookings</li>
                      `
                      : `
                        <li>Complete your profile</li>
                        <li>Browse available coaches</li>
                        <li>Book your first coaching session</li>
                      `
                    }
                  </ul>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/dashboard" style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Get Started</a>
              </div>
              
              <div style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <p>Welcome aboard!</p>
              </div>
            </body>
            </html>
          `,
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();