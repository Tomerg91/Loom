/**
 * Payment Failure Alerting System
 * Sends notifications when payments fail or require attention
 */

import { createAdminClient } from '@/lib/supabase/server';
import { createLogger } from '@/modules/platform/logging/logger';

export interface PaymentAlert {
  type: 'payment_failed' | 'payment_pending' | 'subscription_expiring' | 'payment_disputed';
  userId: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AlertRecipient {
  email?: string;
  phone?: string;
  name?: string;
}

const logger = createLogger({ context: 'PaymentAlerts' });

export class PaymentAlertService {
  private admin = createAdminClient();

  /**
   * Send payment failure alert to user
   */
  async sendPaymentFailureAlert(alert: PaymentAlert): Promise<void> {
    try {
      // Get user details
      const { data: user, error: userError } = await this.admin
        .from('users')
        .select('email, full_name, phone')
        .eq('id', alert.userId)
        .single();

      if (userError || !user) {
        logger.error('User not found for payment alert', {
          userId: alert.userId,
          error: userError,
        });
        return;
      }

      // Send email notification
      if (user.email) {
        await this.sendEmailAlert({
          email: user.email,
          name: user.full_name,
        }, alert);
      }

      // Send SMS notification for critical alerts
      if (user.phone && alert.type === 'payment_failed') {
        await this.sendSMSAlert({
          phone: user.phone,
          name: user.full_name,
        }, alert);
      }

      // Log alert
      await this.logAlert(alert);

      // Notify admin for high-value failures
      if (alert.amount && alert.amount > 100000) { // > 1000 ILS
        await this.notifyAdmins(alert, user);
      }
    } catch (error) {
      logger.error('Error sending payment alert', {
        error,
        alertType: alert.type,
        userId: alert.userId,
      });
      // Don't throw - we don't want to fail payment processing due to notification errors
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(recipient: AlertRecipient, alert: PaymentAlert): Promise<void> {
    const subject = this.getEmailSubject(alert.type);
    const body = this.getEmailBody(alert, recipient.name);

    logger.info('Sending email alert', {
      email: recipient.email, // Will be auto-sanitized by logger
      subject,
      alertType: alert.type,
    });

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // Example:
    // await emailService.send({
    //   to: recipient.email,
    //   subject,
    //   html: body,
    // });
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(recipient: AlertRecipient, alert: PaymentAlert): Promise<void> {
    const message = this.getSMSMessage(alert);

    logger.info('Sending SMS alert', {
      phone: recipient.phone, // Will be auto-sanitized by logger
      alertType: alert.type,
    });

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // Example:
    // await smsService.send({
    //   to: recipient.phone,
    //   message,
    // });
  }

  /**
   * Notify admins of critical payment issues
   */
  private async notifyAdmins(alert: PaymentAlert, user: any): Promise<void> {
    const { data: admins } = await this.admin
      .from('users')
      .select('email, full_name')
      .eq('role', 'admin');

    logger.warn('High-value payment failure - notifying admins', {
      userEmail: user.email, // Will be auto-sanitized by logger
      userName: user.full_name,
      amount: (alert.amount || 0) / 100,
      currency: alert.currency || 'ILS',
      alertType: alert.type,
      reason: alert.reason,
      paymentId: alert.paymentId,
      adminCount: (admins || []).length,
    });

    // TODO: Send actual emails to admins
  }

  /**
   * Log alert to database for audit trail
   */
  private async logAlert(alert: PaymentAlert): Promise<void> {
    try {
      await this.admin.from('payment_alerts').insert({
        type: alert.type,
        user_id: alert.userId,
        payment_id: alert.paymentId,
        amount_cents: alert.amount,
        currency: alert.currency,
        reason: alert.reason,
        metadata: alert.metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error logging payment alert to database', {
        error,
        alertType: alert.type,
        userId: alert.userId,
      });
      // Don't throw - logging failure shouldn't stop the alert
    }
  }

  /**
   * Get email subject based on alert type
   */
  private getEmailSubject(type: PaymentAlert['type']): string {
    const subjects = {
      payment_failed: 'Payment Failed - Action Required',
      payment_pending: 'Payment Pending',
      subscription_expiring: 'Your Subscription is Expiring Soon',
      payment_disputed: 'Payment Disputed - Please Contact Support',
    };
    return subjects[type] || 'Payment Notification';
  }

  /**
   * Get email body based on alert
   */
  private getEmailBody(alert: PaymentAlert, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hello,';

    const templates = {
      payment_failed: `
        ${greeting}
        <p>We encountered an issue processing your payment.</p>
        <p><strong>Amount:</strong> ${(alert.amount || 0) / 100} ${alert.currency || 'ILS'}</p>
        <p><strong>Reason:</strong> ${alert.reason || 'Payment processing error'}</p>
        <p>Please update your payment method or try again.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/billing">Update Payment Method</a></p>
      `,
      payment_pending: `
        ${greeting}
        <p>Your payment is being processed.</p>
        <p>We'll notify you once it's complete.</p>
      `,
      subscription_expiring: `
        ${greeting}
        <p>Your subscription is expiring soon.</p>
        <p>Renew now to continue enjoying premium features.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/billing">Renew Subscription</a></p>
      `,
      payment_disputed: `
        ${greeting}
        <p>There's a dispute regarding your recent payment.</p>
        <p>Please contact our support team for assistance.</p>
      `,
    };

    return templates[alert.type] || '<p>Payment notification</p>';
  }

  /**
   * Get SMS message based on alert
   */
  private getSMSMessage(alert: PaymentAlert): string {
    const templates = {
      payment_failed: `Loom: Payment failed (${(alert.amount || 0) / 100} ${alert.currency || 'ILS'}). Please update your payment method.`,
      payment_pending: 'Loom: Your payment is being processed.',
      subscription_expiring: 'Loom: Your subscription expires soon. Renew now to keep access.',
      payment_disputed: 'Loom: Payment disputed. Please contact support.',
    };

    return templates[alert.type] || 'Loom: Payment notification';
  }

  /**
   * Check for expiring subscriptions and send alerts
   */
  async checkExpiringSubscriptions(): Promise<void> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: expiringUsers } = await this.admin
      .from('users')
      .select('id, email, full_name, subscription_tier, subscription_expires_at')
      .not('subscription_tier', 'eq', 'free')
      .lte('subscription_expires_at', threeDaysFromNow.toISOString())
      .gt('subscription_expires_at', new Date().toISOString());

    (expiringUsers || []).forEach(async (user) => {
      await this.sendPaymentFailureAlert({
        type: 'subscription_expiring',
        userId: user.id,
      });
    });
  }
}

export const createPaymentAlertService = () => new PaymentAlertService();
