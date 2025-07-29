/**
 * Test helpers index
 * Exports all test utilities for easy importing
 */

// Data fixtures and types
export * from './test-data';

// Environment configuration
export * from './test-env';

// Database management
export * from './database-manager';

// User management
export * from './user-manager';

// Authentication helpers
export * from './auth-helpers';

// Utility functions
export { setupTestEnvironment, validateTestEnvironment } from './test-env';
export { getTestUserByRole, getTestUserByEmail, getTestCoaches, getTestClients } from './test-data';
export { createAuthHelper, authHelpers } from './auth-helpers';

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Wait for a specific amount of time
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random string for test data
   */
  randomString: (length: number = 8): string => {
    return Math.random().toString(36).substring(2, 2 + length);
  },

  /**
   * Generate a random email for testing
   */
  randomEmail: (): string => {
    return `test-${testUtils.randomString()}@example.com`;
  },

  /**
   * Generate a future timestamp
   */
  futureTimestamp: (daysFromNow: number = 1): Date => {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  },

  /**
   * Generate a past timestamp
   */
  pastTimestamp: (daysAgo: number = 1): Date => {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  },

  /**
   * Format date for display
   */
  formatDate: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },

  /**
   * Format time for display
   */
  formatTime: (date: Date): string => {
    return date.toTimeString().split(' ')[0].substring(0, 5);
  },
};

/**
 * Test constants
 */
export const testConstants = {
  // Default test timeouts
  DEFAULT_TIMEOUT: 30000,
  LONG_TIMEOUT: 60000,
  SHORT_TIMEOUT: 10000,

  // Test user credentials
  DEFAULT_PASSWORD: 'password123',

  // Test data limits
  MAX_SESSIONS_PER_USER: 10,
  MAX_NOTES_PER_SESSION: 5,
  MAX_REFLECTIONS_PER_USER: 20,

  // UI selectors
  selectors: {
    // Authentication
    emailInput: '[data-testid="email-input"]',
    passwordInput: '[data-testid="password-input"]',
    signInButton: '[data-testid="signin-button"]',
    signUpButton: '[data-testid="signup-button"]',
    userMenu: '[data-testid="user-menu"]',

    // Navigation
    dashboardLink: '[data-testid="dashboard-link"]',
    sessionsLink: '[data-testid="sessions-link"]',
    clientsLink: '[data-testid="clients-link"]',
    coachesLink: '[data-testid="coaches-link"]',

    // Forms
    submitButton: '[data-testid="submit-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    saveButton: '[data-testid="save-button"]',
    deleteButton: '[data-testid="delete-button"]',

    // Loading states
    loadingSpinner: '[data-testid="loading-spinner"]',
    loadingState: '[data-testid="loading-state"]',

    // Error states
    errorMessage: '[data-testid="error-message"]',
    successMessage: '[data-testid="success-message"]',

    // Session related
    sessionCard: '[data-testid="session-card"]',
    sessionTitle: '[data-testid="session-title"]',
    sessionDate: '[data-testid="session-date"]',
    sessionStatus: '[data-testid="session-status"]',

    // User related
    userCard: '[data-testid="user-card"]',
    userName: '[data-testid="user-name"]',
    userRole: '[data-testid="user-role"]',
    userEmail: '[data-testid="user-email"]',
  },

  // API endpoints
  apiEndpoints: {
    auth: {
      signin: '/api/auth/signin',
      signup: '/api/auth/signup',
      signout: '/api/auth/signout',
      me: '/api/auth/me',
    },
    users: '/api/users',
    sessions: '/api/sessions',
    coaches: '/api/coaches',
    notes: '/api/notes',
    reflections: '/api/reflections',
  },

  // Error messages
  errorMessages: {
    required: 'This field is required',
    invalidEmail: 'Invalid email format',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordMismatch: 'Passwords do not match',
    invalidCredentials: 'Invalid login credentials',
    unauthorized: 'You are not authorized to access this resource',
    notFound: 'Resource not found',
    serverError: 'An unexpected error occurred',
  },

  // Success messages
  successMessages: {
    accountCreated: 'Account created successfully',
    signedIn: 'Signed in successfully',
    signedOut: 'Signed out successfully',
    profileUpdated: 'Profile updated successfully',
    sessionCreated: 'Session created successfully',
    sessionUpdated: 'Session updated successfully',
    sessionCancelled: 'Session cancelled successfully',
    passwordReset: 'Password reset email sent',
  },
};

/**
 * Test environment checks
 */
export const testChecks = {
  /**
   * Check if we're running in CI environment
   */
  isCI: (): boolean => !!process.env.CI,

  /**
   * Check if we're running locally
   */
  isLocal: (): boolean => !testChecks.isCI(),

  /**
   * Check if debug mode is enabled
   */
  isDebug: (): boolean => process.env.TEST_DEBUG === 'true',

  /**
   * Check if we're using local Supabase
   */
  isLocalSupabase: (): boolean => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return url.includes('127.0.0.1') || url.includes('localhost');
  },

  /**
   * Check if all required environment variables are set
   */
  hasRequiredEnvVars: (): boolean => {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    return required.every(varName => !!process.env[varName]);
  },
};

export default {
  testUtils,
  testConstants,
  testChecks,
};