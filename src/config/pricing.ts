/**
 * Session pricing configuration
 * Define pricing for different session types and coaches
 */

export const SESSION_PRICING = {
  video: 150,
  phone: 100,
  'in-person': 200,
  default: 100,
} as const;

export type SessionType = keyof typeof SESSION_PRICING;

export function getSessionPrice(sessionType?: string): number {
  const normalized = (sessionType || '').toLowerCase() as SessionType;
  return SESSION_PRICING[normalized] ?? SESSION_PRICING.default;
}
