/**
 * Cancellation policy configuration for session management
 * These policies define the rules for session cancellations including fees and refunds
 */

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  freeUntilHours: number; // Hours before session when cancellation is free
  partialRefundUntilHours: number; // Hours before session when partial refund applies
  feeAmount: number; // Fee amount (percentage or fixed amount)
  feeType: 'percentage' | 'fixed'; // Whether fee is percentage of session cost or fixed amount
  allowLateCancellation: boolean; // Whether to allow cancellation after partial refund period
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CancellationResult {
  type: 'free' | 'partial' | 'late';
  feeAmount: number;
  refundPercentage: number;
  message: string;
  isAllowed: boolean;
}

/**
 * Default cancellation policies for different session types or coach preferences
 */
export const DEFAULT_CANCELLATION_POLICIES: Record<string, CancellationPolicy> = {
  standard: {
    id: 'standard',
    name: 'Standard Policy',
    description: 'Standard 24-hour cancellation policy with partial refund window',
    freeUntilHours: 24,
    partialRefundUntilHours: 2,
    feeAmount: 25,
    feeType: 'percentage',
    allowLateCancellation: true,
    isActive: true,
  },
  
  flexible: {
    id: 'flexible',
    name: 'Flexible Policy',
    description: 'More lenient cancellation policy with longer free cancellation window',
    freeUntilHours: 48,
    partialRefundUntilHours: 4,
    feeAmount: 15,
    feeType: 'percentage',
    allowLateCancellation: true,
    isActive: true,
  },
  
  strict: {
    id: 'strict',
    name: 'Strict Policy',
    description: 'Strict cancellation policy with shorter windows and higher fees',
    freeUntilHours: 12,
    partialRefundUntilHours: 1,
    feeAmount: 50,
    feeType: 'percentage',
    allowLateCancellation: false,
    isActive: true,
  },
  
  premium: {
    id: 'premium',
    name: 'Premium Policy',
    description: 'Premium sessions with fixed fee structure',
    freeUntilHours: 48,
    partialRefundUntilHours: 6,
    feeAmount: 50, // $50 fixed fee
    feeType: 'fixed',
    allowLateCancellation: true,
    isActive: true,
  }
};

/**
 * Calculate cancellation result based on policy and timing
 */
export function calculateCancellationResult(
  scheduledAt: string | Date,
  policy: CancellationPolicy,
  sessionCost: number = 150, // Default session cost
  isPrivileged: boolean = false
): CancellationResult {
  const scheduledTime = new Date(scheduledAt);
  const now = new Date();
  const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Privileged cancellations (admin/system) are always free
  if (isPrivileged) {
    return {
      type: 'free',
      feeAmount: 0,
      refundPercentage: 100,
      message: 'Administrative cancellation',
      isAllowed: true,
    };
  }
  
  // Free cancellation window
  if (hoursUntilSession >= policy.freeUntilHours) {
    return {
      type: 'free',
      feeAmount: 0,
      refundPercentage: 100,
      message: 'Free cancellation available',
      isAllowed: true,
    };
  }
  
  // Partial refund window
  if (hoursUntilSession >= policy.partialRefundUntilHours) {
    const feeAmount = policy.feeType === 'fixed' 
      ? policy.feeAmount 
      : (sessionCost * policy.feeAmount / 100);
    
    const refundPercentage = policy.feeType === 'fixed'
      ? Math.max(0, ((sessionCost - policy.feeAmount) / sessionCost) * 100)
      : 100 - policy.feeAmount;
    
    return {
      type: 'partial',
      feeAmount,
      refundPercentage: Math.round(refundPercentage),
      message: policy.feeType === 'fixed' 
        ? `Cancellation fee applies ($${policy.feeAmount})`
        : `Cancellation fee applies (${policy.feeAmount}%)`,
      isAllowed: true,
    };
  }
  
  // Late cancellation
  if (policy.allowLateCancellation) {
    return {
      type: 'late',
      feeAmount: policy.feeType === 'fixed' ? sessionCost : sessionCost,
      refundPercentage: 0,
      message: 'Late cancellation - no refund available',
      isAllowed: true,
    };
  } else {
    return {
      type: 'late',
      feeAmount: 0,
      refundPercentage: 0,
      message: 'Cancellation not allowed - session starts too soon',
      isAllowed: false,
    };
  }
}

/**
 * Get the appropriate cancellation policy for a session
 * This could be extended to check coach preferences, session type, etc.
 */
export function getCancellationPolicy(
  sessionType?: string,
  coachId?: string,
  sessionCost?: number
): CancellationPolicy {
  // For now, return the standard policy
  // In the future, this could query the database for coach-specific policies
  return DEFAULT_CANCELLATION_POLICIES.standard;
}

/**
 * Validate if a cancellation request meets policy requirements
 */
export function validateCancellationRequest(
  scheduledAt: string | Date,
  policy: CancellationPolicy,
  userRole: string = 'client',
  sessionCost: number = 150
): {
  isValid: boolean;
  result: CancellationResult;
  errors: string[];
} {
  const errors: string[] = [];
  const isPrivileged = ['admin', 'system'].includes(userRole);
  
  const result = calculateCancellationResult(scheduledAt, policy, sessionCost, isPrivileged);
  
  if (!result.isAllowed) {
    errors.push('Cancellation is not allowed at this time according to the cancellation policy');
  }
  
  return {
    isValid: errors.length === 0,
    result,
    errors,
  };
}

/**
 * Format cancellation policy details for display
 */
export function formatPolicyDisplay(policy: CancellationPolicy): string {
  const freeWindow = policy.freeUntilHours > 24 
    ? `${Math.round(policy.freeUntilHours / 24)} days`
    : `${policy.freeUntilHours} hours`;
    
  const partialWindow = policy.partialRefundUntilHours > 24
    ? `${Math.round(policy.partialRefundUntilHours / 24)} days`
    : `${policy.partialRefundUntilHours} hours`;
    
  const feeDisplay = policy.feeType === 'fixed' 
    ? `$${policy.feeAmount}`
    : `${policy.feeAmount}%`;
  
  return `Free cancellation until ${freeWindow} before session. ` +
         `Partial refund (${feeDisplay} fee) until ${partialWindow} before session. ` +
         (policy.allowLateCancellation 
           ? 'Late cancellations incur full fee.'
           : 'No cancellations allowed within final window.');
}