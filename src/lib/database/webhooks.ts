import { createAdminClient } from '@/lib/supabase/server';

export interface RecordWebhookEventInput {
  provider: 'tranzila' | string;
  idempotencyKey: string;
  eventType?: string;
  transactionId?: string;
  payload?: unknown;
}

export class WebhookService {
  private admin = createAdminClient();

  /**
   * Check if a webhook event has already been processed
   */
  async isProcessed(provider: string, idempotencyKey: string): Promise<boolean> {
    const { data, error } = await this.admin.rpc('is_webhook_processed', {
      p_provider: provider,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      console.error('Error checking webhook idempotency:', error);
      throw error;
    }

    return data as boolean;
  }

  /**
   * Record a webhook event for idempotency tracking
   * Returns true if successfully recorded, false if already exists (duplicate)
   */
  async recordEvent(input: RecordWebhookEventInput): Promise<boolean> {
    const { data, error } = await this.admin.rpc('record_webhook_event', {
      p_provider: input.provider,
      p_idempotency_key: input.idempotencyKey,
      p_event_type: input.eventType || null,
      p_transaction_id: input.transactionId || null,
      p_payload: input.payload || null,
    });

    if (error) {
      // If it's a unique violation, it means the event was already processed
      if (error.code === '23505') {
        return false;
      }
      console.error('Error recording webhook event:', error);
      throw error;
    }

    return data as boolean;
  }

  /**
   * Clean up old webhook events (older than specified days)
   */
  async cleanupOldEvents(daysToKeep = 90): Promise<number> {
    const { data, error } = await this.admin.rpc('cleanup_old_webhook_events', {
      days_to_keep: daysToKeep,
    });

    if (error) {
      console.error('Error cleaning up webhook events:', error);
      throw error;
    }

    return data as number;
  }
}

export const createWebhookService = () => new WebhookService();
