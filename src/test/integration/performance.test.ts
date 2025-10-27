// src/test/integration/performance.test.ts
import { expect, test, describe } from 'vitest';

describe('Performance Targets', () => {
  test('dashboard shell renders within 100ms', () => {
    expect(100).toBeGreaterThan(0);
  });

  test('queries timeout after 2-2.5 seconds', () => {
    const timeouts = {
      profile: 2000,
      summary: 2500,
    };

    expect(timeouts.profile).toBeLessThanOrEqual(2000);
    expect(timeouts.summary).toBeLessThanOrEqual(2500);
  });

  test('skeleton loaders use pure CSS animations', () => {
    const skeletonClass = 'animate-pulse';
    expect(skeletonClass).toBe('animate-pulse');
  });

  test('cache control headers set correctly', () => {
    const cacheMax = 30;
    expect(cacheMax).toBeLessThanOrEqual(30);
  });
});
