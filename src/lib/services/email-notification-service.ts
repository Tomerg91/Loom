import type { NotificationType } from '@/types';

export interface EmailNotificationPayload {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  category?: string;
  tags?: string[];
}

export interface EmailTemplate {
  id: string;
  type: NotificationType;
  language: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: Record<string, any>;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

interface EmailProviderConfig {
  provider: 'resend' | 'sendgrid' | 'ses' | 'postmark';
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class EmailNotificationService {
  private supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>;
  private config: EmailProviderConfig | null = null;

  constructor(isServer = true) {
    if (isServer) {
      const { createServerClient } = require('@/lib/supabase/server');
      this.supabase = createServerClient();
    } else {
      const { createClient } = require('@/lib/supabase/client');
      this.supabase = createClient();
    }
    this.initializeConfig();
  }

  private initializeConfig() {
    const provider = (process.env.EMAIL_PROVIDER || 'resend') as EmailProviderConfig['provider'];
    
    this.config = {
      provider,
      apiKey: this.getProviderApiKey(provider),
      fromEmail: process.env.EMAIL_FROM || 'notifications@loom-coaching.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Loom Coaching',
    };
  }

  private getProviderApiKey(provider: EmailProviderConfig['provider']): string {
    switch (provider) {
      case 'resend':
        return process.env.RESEND_API_KEY || '';
      case 'sendgrid':
        return process.env.SENDGRID_API_KEY || '';
      case 'ses':
        return process.env.AWS_SES_ACCESS_KEY || '';
      case 'postmark':
        return process.env.POSTMARK_SERVER_TOKEN || '';
      default:
        return '';
    }
  }

  /**
   * Send email notification using configured provider
   */
  async sendEmailNotification(payload: EmailNotificationPayload): Promise<EmailDeliveryResult> {
    try {
      if (!this.config || !this.config.apiKey) {
        throw new Error('Email service not configured');
      }

      const result = await this.sendWithProvider(payload);
      
      // Log the delivery attempt
      if (payload.templateId) {
        await this.logEmailDelivery(
          payload.templateId,
          payload.to,
          result.success ? 'sent' : 'failed',
          result.messageId,
          result.error
        );
      }

      return result;
    } catch (error) {
      console.error('Error sending email notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (payload.templateId) {
        await this.logEmailDelivery(
          payload.templateId,
          payload.to,
          'failed',
          undefined,
          errorMessage
        );
      }

      return {
        success: false,
        error: errorMessage,
        provider: this.config?.provider,
      };
    }
  }

  /**
   * Send email using template
   */
  async sendEmailFromTemplate(
    userId: string,
    userEmail: string,
    notificationType: NotificationType,
    templateVariables: Record<string, any> = {},
    userLanguage: string = 'en'
  ): Promise<EmailDeliveryResult> {
    try {
      // Get the email template
      const template = await this.getEmailTemplate(notificationType, userLanguage);
      
      if (!template) {
        throw new Error(`No email template found for type: ${notificationType}, language: ${userLanguage}`);
      }

      // Process template variables
      const processedSubject = this.processTemplateVariables(template.subject, templateVariables);
      const processedHtmlContent = this.processTemplateVariables(template.htmlBody, templateVariables);
      const processedTextContent = template.textBody 
        ? this.processTemplateVariables(template.textBody, templateVariables)
        : this.htmlToText(processedHtmlContent);

      // Get user's name for personalization
      const { data: userData } = await this.supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const userName = userData 
        ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
        : undefined;

      // Send the email
      return await this.sendEmailNotification({
        to: userEmail,
        toName: userName,
        subject: processedSubject,
        htmlContent: processedHtmlContent,
        textContent: processedTextContent,
        templateId: template.id,
        templateVariables,
        category: notificationType,
        tags: ['notification', notificationType, userLanguage],
      });
    } catch (error) {
      console.error('Error sending email from template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk email notifications
   */
  async sendBulkEmails(
    recipients: Array<{
      userId: string;
      email: string;
      name?: string;
      templateVariables?: Record<string, any>;
    }>,
    notificationType: NotificationType,
    globalTemplateVariables: Record<string, any> = {}
  ): Promise<{ sent: number; failed: number; results: EmailDeliveryResult[] }> {
    let sent = 0;
    let failed = 0;
    const results: EmailDeliveryResult[] = [];

    for (const recipient of recipients) {
      try {
        // Get user's language preference
        const { data: userData } = await this.supabase
          .from('users')
          .select('language')
          .eq('id', recipient.userId)
          .single();

        const userLanguage = userData?.language || 'en';
        const mergedVariables = {
          ...globalTemplateVariables,
          ...recipient.templateVariables,
          user_name: recipient.name,
        };

        const result = await this.sendEmailFromTemplate(
          recipient.userId,
          recipient.email,
          notificationType,
          mergedVariables,
          userLanguage
        );

        results.push(result);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { sent, failed, results };
  }

  /**
   * Get email template from database
   */
  private async getEmailTemplate(
    type: NotificationType,
    language: string = 'en'
  ): Promise<EmailTemplate | null> {
    try {
      // Try to get template in requested language first
      let { data, error } = await this.supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('language', language)
        .eq('channel', 'email')
        .eq('is_active', true)
        .single();

      // Fallback to English if not found
      if (error && language !== 'en') {
        ({ data, error } = await this.supabase
          .from('notification_templates')
          .select('*')
          .eq('type', type)
          .eq('language', 'en')
          .eq('channel', 'email')
          .eq('is_active', true)
          .single());
      }

      if (error || !data) {
        console.error('Error fetching email template:', error);
        return null;
      }

      return {
        id: data.id,
        type: data.type,
        language: data.language,
        subject: data.subject || '',
        htmlBody: data.html_body || data.body,
        textBody: data.body,
        variables: data.variables || {},
      };
    } catch (error) {
      console.error('Error getting email template:', error);
      return null;
    }
  }

  /**
   * Process template variables in text
   */
  private processTemplateVariables(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });

    return processed;
  }

  /**
   * Convert HTML to plain text (simple implementation)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Send email using configured provider
   */
  private async sendWithProvider(payload: EmailNotificationPayload): Promise<EmailDeliveryResult> {
    if (!this.config) {
      throw new Error('Email service not configured');
    }

    switch (this.config.provider) {
      case 'resend':
        return await this.sendWithResend(payload);
      case 'sendgrid':
        return await this.sendWithSendGrid(payload);
      case 'ses':
        return await this.sendWithSES(payload);
      case 'postmark':
        return await this.sendWithPostmark(payload);
      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(payload: EmailNotificationPayload): Promise<EmailDeliveryResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.config!.fromName} <${this.config!.fromEmail}>`,
          to: payload.toName ? `${payload.toName} <${payload.to}>` : payload.to,
          subject: payload.subject,
          html: payload.htmlContent,
          text: payload.textContent,
          tags: payload.tags || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return {
        success: true,
        messageId: data.id,
        provider: 'resend',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'resend',
      };
    }
  }

  /**
   * Send email using SendGrid (placeholder implementation)
   */
  private async sendWithSendGrid(payload: EmailNotificationPayload): Promise<EmailDeliveryResult> {
    // Implement SendGrid API integration
    console.log('SendGrid integration not implemented yet');
    return {
      success: false,
      error: 'SendGrid integration not implemented',
      provider: 'sendgrid',
    };
  }

  /**
   * Send email using AWS SES (placeholder implementation)
   */
  private async sendWithSES(payload: EmailNotificationPayload): Promise<EmailDeliveryResult> {
    // Implement AWS SES integration
    console.log('AWS SES integration not implemented yet');
    return {
      success: false,
      error: 'AWS SES integration not implemented',
      provider: 'ses',
    };
  }

  /**
   * Send email using Postmark (placeholder implementation)
   */
  private async sendWithPostmark(payload: EmailNotificationPayload): Promise<EmailDeliveryResult> {
    // Implement Postmark API integration
    console.log('Postmark integration not implemented yet');
    return {
      success: false,
      error: 'Postmark integration not implemented',
      provider: 'postmark',
    };
  }

  /**
   * Log email delivery attempt
   */
  private async logEmailDelivery(
    notificationId: string,
    recipientEmail: string,
    status: 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked',
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const logData: any = {
        notification_id: notificationId,
        channel: 'email',
        status,
        error_message: errorMessage,
        provider_id: messageId,
        provider_response: messageId ? { messageId, recipient: recipientEmail } : null,
      };

      switch (status) {
        case 'sent':
          logData.sent_at = new Date().toISOString();
          break;
        case 'delivered':
          logData.delivered_at = new Date().toISOString();
          break;
        case 'failed':
          logData.failed_at = new Date().toISOString();
          break;
        case 'opened':
          logData.opened_at = new Date().toISOString();
          break;
        case 'clicked':
          logData.clicked_at = new Date().toISOString();
          break;
      }

      await this.supabase
        .from('notification_delivery_logs')
        .insert([logData]);
    } catch (error) {
      console.error('Error logging email delivery:', error);
    }
  }

  /**
   * Get email delivery statistics
   */
  async getEmailDeliveryStats(
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    try {
      let query = this.supabase
        .from('notification_delivery_logs')
        .select('status')
        .eq('channel', 'email');

      if (userId) {
        query = query.eq('notification_id', userId); // This would need a join with notifications table
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching email delivery stats:', error);
        return { total: 0, sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, bounced: 0 };
      }

      const stats = data.reduce((acc, log) => {
        acc.total++;
        switch (log.status) {
          case 'sent':
            acc.sent++;
            break;
          case 'delivered':
            acc.delivered++;
            break;
          case 'failed':
            acc.failed++;
            break;
          case 'opened':
            acc.opened++;
            break;
          case 'clicked':
            acc.clicked++;
            break;
          case 'bounced':
            acc.bounced++;
            break;
        }
        return acc;
      }, { total: 0, sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, bounced: 0 });

      return stats;
    } catch (error) {
      console.error('Error calculating email delivery stats:', error);
      return { total: 0, sent: 0, delivered: 0, failed: 0, opened: 0, clicked: 0, bounced: 0 };
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<EmailDeliveryResult> {
    return await this.sendEmailNotification({
      to: testEmail,
      subject: 'Loom Coaching - Email Configuration Test',
      htmlContent: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify that your email configuration is working correctly.</p>
        <p>If you received this email, your email service is properly configured!</p>
        <p>Test sent at: ${new Date().toISOString()}</p>
      `,
      textContent: `
Email Configuration Test

This is a test email to verify that your email configuration is working correctly.
If you received this email, your email service is properly configured!

Test sent at: ${new Date().toISOString()}
      `,
      category: 'test',
      tags: ['test', 'configuration'],
    });
  }
}