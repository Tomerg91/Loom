// src/lib/performance.ts
export const performanceMarks = {
  SIGNIN_START: 'signin-start',
  AUTH_COMPLETE: 'auth-complete',
  DASHBOARD_SHELL_RENDER: 'dashboard-shell-render',
  DASHBOARD_INTERACTIVE: 'dashboard-interactive',
  PROFILE_LOADED: 'profile-loaded',
  SUMMARY_LOADED: 'summary-loaded',
};

export function markPerformance(mark: string) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      window.performance.mark(mark);
    } catch (e) {
      console.debug('Performance mark not supported:', e);
    }
  }
}

export function measurePerformance(
  name: string,
  startMark: string,
  endMark: string
) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      window.performance.measure(name, startMark, endMark);
      const measure = window.performance.getEntriesByName(name)[0];
      if (measure) {
        console.debug(`${name}: ${measure.duration.toFixed(2)}ms`);
        return measure.duration;
      }
    } catch (e) {
      console.debug('Performance measure not supported:', e);
    }
  }
}
