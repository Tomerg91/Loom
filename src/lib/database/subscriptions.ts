import { createAdminClient, createServerClient } from '@/lib/supabase/server';

export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents
  currency: string;
  features: Record<string, boolean>;
  maxClients?: number;
  maxSessionsPerMonth?: number;
  maxResources?: number;
  trialDays: number;
}

export interface UpdateSubscriptionInput {
  userId: string;
  tier: SubscriptionTier;
  billingInterval: 'monthly' | 'yearly';
  startDate?: Date;
  paymentId?: string;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  expiresAt: Date | null;
  startedAt: Date | null;
  isActive: boolean;
  isPaid: boolean;
  daysRemaining: number | null;
}

export class SubscriptionService {
  private supabase = createServerClient();
  private admin = createAdminClient();

  /**
   * Get all available subscription plans
   */
  async getPublicPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await this.supabase.rpc('get_public_plans');

    if (error) {
      console.error('Error fetching public plans:', error);
      throw error;
    }

    return (data || []).map((plan: any) => ({
      id: plan.id,
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.price_monthly_cents,
      priceYearly: plan.price_yearly_cents,
      currency: plan.currency,
      features: plan.features,
      maxClients: plan.max_clients,
      maxSessionsPerMonth: plan.max_sessions_per_month,
      maxResources: plan.max_resources,
      trialDays: plan.trial_days,
    }));
  }

  /**
   * Get plan details by tier
   */
  async getPlanByTier(tier: SubscriptionTier): Promise<SubscriptionPlan | null> {
    const { data, error } = await this.supabase.rpc('get_plan_by_tier', {
      p_tier: tier,
    });

    if (error) {
      console.error('Error fetching plan:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const plan = data[0];
    return {
      id: plan.id,
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.price_monthly_cents,
      priceYearly: plan.price_yearly_cents,
      currency: plan.currency,
      features: plan.features,
      maxClients: plan.max_clients,
      maxSessionsPerMonth: plan.max_sessions_per_month,
      maxResources: plan.max_resources,
      trialDays: 0, // Not included in this RPC
    };
  }

  /**
   * Get user's current subscription status
   */
  async getUserSubscription(userId: string): Promise<SubscriptionStatus> {
    const { data, error } = await this.admin
      .from('users')
      .select('subscription_tier, subscription_expires_at, subscription_started_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user subscription:', error);
      throw error;
    }

    const tier = data.subscription_tier || 'free';
    const expiresAt = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
    const startedAt = data.subscription_started_at ? new Date(data.subscription_started_at) : null;
    const now = new Date();

    const isActive = tier === 'free' || (expiresAt !== null && expiresAt > now);
    const isPaid = tier !== 'free' && isActive;
    const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      tier,
      expiresAt,
      startedAt,
      isActive,
      isPaid,
      daysRemaining,
    };
  }

  /**
   * Update user subscription (upgrade, downgrade, or renew)
   */
  async updateSubscription(input: UpdateSubscriptionInput): Promise<void> {
    const plan = await this.getPlanByTier(input.tier);
    if (!plan) {
      throw new Error(`Plan not found for tier: ${input.tier}`);
    }

    const startDate = input.startDate || new Date();
    const durationMonths = input.billingInterval === 'yearly' ? 12 : 1;
    const expiresAt = new Date(startDate);
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const { error } = await this.admin
      .from('users')
      .update({
        subscription_tier: input.tier,
        subscription_started_at: startDate.toISOString(),
        subscription_expires_at: input.tier === 'free' ? null : expiresAt.toISOString(),
        subscription_metadata: {
          billing_interval: input.billingInterval,
          payment_id: input.paymentId,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.userId);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log(`Subscription updated for user ${input.userId}: ${input.tier} (${input.billingInterval})`);
  }

  /**
   * Process successful payment and update subscription
   */
  async processSuccessfulPayment(paymentId: string): Promise<void> {
    // Get payment details
    const { data: payment, error: paymentError } = await this.admin
      .from('payments')
      .select('user_id, amount_cents, metadata')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      throw new Error('Payment not found');
    }

    const metadata = payment.metadata as any;
    const tier = metadata?.subscription_tier as SubscriptionTier;
    const billingInterval = metadata?.billing_interval as 'monthly' | 'yearly';

    if (!tier || !billingInterval) {
      console.warn(`Payment ${paymentId} has no subscription metadata, skipping subscription update`);
      return;
    }

    // Update subscription
    await this.updateSubscription({
      userId: payment.user_id,
      tier,
      billingInterval,
      paymentId,
    });

    // Create invoice
    const { error: invoiceError } = await this.admin.rpc('create_invoice_from_payment', {
      p_payment_id: paymentId,
      p_description: `${tier} subscription (${billingInterval})`,
    });

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      // Don't throw - invoice creation is not critical for subscription activation
    }
  }

  /**
   * Cancel subscription (downgrade to free at end of period)
   */
  async cancelSubscription(userId: string): Promise<void> {
    const { error } = await this.admin
      .from('users')
      .update({
        subscription_metadata: {
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }

    console.log(`Subscription canceled for user ${userId} (will downgrade at period end)`);
  }

  /**
   * Check if user has access to a feature
   */
  async userHasFeature(userId: string, featureName: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('user_has_feature', {
      user_uuid: userId,
      feature_name: featureName,
    });

    if (error) {
      console.error('Error checking feature access:', error);
      return false;
    }

    return data as boolean;
  }

  /**
   * Check if user is within plan limits
   */
  async checkPlanLimit(
    userId: string,
    limitType: 'clients' | 'sessions' | 'resources' | 'storage'
  ): Promise<{
    limit: number | null;
    current: number;
    isWithinLimit: boolean;
    remaining: number | null;
  }> {
    const { data, error } = await this.supabase.rpc('check_plan_limit', {
      user_uuid: userId,
      limit_type: limitType,
    });

    if (error) {
      console.error('Error checking plan limit:', error);
      throw error;
    }

    return data as any;
  }

  /**
   * Get subscription analytics for admin/finance
   */
  async getSubscriptionAnalytics(): Promise<{
    totalSubscribers: number;
    byTier: Record<SubscriptionTier, number>;
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
  }> {
    const { data, error } = await this.admin
      .from('users')
      .select('subscription_tier, subscription_expires_at')
      .not('subscription_tier', 'eq', 'free')
      .gte('subscription_expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching subscription analytics:', error);
      throw error;
    }

    const byTier: Record<SubscriptionTier, number> = {
      free: 0,
      basic: 0,
      professional: 0,
      enterprise: 0,
    };

    (data || []).forEach((user: any) => {
      byTier[user.subscription_tier as SubscriptionTier]++;
    });

    // Get plan prices for MRR/ARR calculation
    const plans = await this.getPublicPlans();
    const planPrices = plans.reduce((acc, plan) => {
      acc[plan.tier] = plan.priceMonthly;
      return acc;
    }, {} as Record<SubscriptionTier, number>);

    let mrr = 0;
    Object.entries(byTier).forEach(([tier, count]) => {
      mrr += (planPrices[tier as SubscriptionTier] || 0) * count;
    });

    return {
      totalSubscribers: data?.length || 0,
      byTier,
      monthlyRecurringRevenue: mrr,
      annualRecurringRevenue: mrr * 12,
    };
  }
}

export const createSubscriptionService = () => new SubscriptionService();
