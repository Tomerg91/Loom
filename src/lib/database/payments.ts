import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled';

export interface CreatePaymentInput {
  userId: string | null;
  amount: number; // major units, e.g., 100.50
  currency?: 'ILS' | 'USD';
  description?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface UpsertProviderPaymentInput {
  provider: 'tranzila';
  providerTransactionId: string;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
  rawPayload?: any;
}

export class PaymentService {
  private supabase = createServerClient();
  private admin = createAdminClient();

  async createPending(input: CreatePaymentInput) {
    const amount_cents = Math.round(input.amount * 100);
    const { data, error } = await this.supabase
      .from('payments' as unknown as keyof Database['public']['Tables'])
      .insert({
        user_id: input.userId,
        amount_cents,
        currency: input.currency || 'ILS',
        description: input.description,
        status: 'pending',
        provider: 'tranzila',
        idempotency_key: input.idempotencyKey || null,
        metadata: input.metadata || {},
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  }

  async upsertByProviderTxn(input: UpsertProviderPaymentInput) {
    // Use admin client because webhook context has no user
    const { data, error } = await this.admin
      .from('payments' as any)
      .upsert({
        provider: input.provider,
        provider_transaction_id: input.providerTransactionId,
        status: input.status,
        amount_cents: input.amount ? Math.round(input.amount * 100) : undefined,
        currency: input.currency,
        raw_payload: input.rawPayload || {},
        updated_at: new Date().toISOString(),
      } as any, { onConflict: 'provider,provider_transaction_id' })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  }
}

export const createPaymentService = () => new PaymentService();

