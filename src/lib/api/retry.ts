/**
 * API Retry Logic with Exponential Backoff
 *
 * Provides automatic retry capability for failed API requests with:
 * - Exponential backoff with jitter
 * - Configurable retry attempts
 * - Smart retry decision (only retry on network errors and 5xx)
 * - Abort signal support
 * - Request timeout handling
 */

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number; // Base delay in ms
  maxDelay?: number; // Maximum delay in ms
  timeout?: number; // Request timeout in ms
  retryOn?: (error: Error, response?: Response) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeout: 30000, // 30 seconds
  retryOn: (error: Error, response?: Response) => {
    // Don't retry on client errors (4xx) except 408, 429
    if (response) {
      const status = response.status;

      // Retry on server errors (5xx)
      if (status >= 500) return true;

      // Retry on specific client errors
      if (status === 408 || status === 429) return true;

      // Don't retry on other client errors
      if (status >= 400 && status < 500) return false;
    }

    // Retry on network errors
    if (
      error.name === 'TypeError' ||
      error.name === 'NetworkError' ||
      error.message.includes('fetch') ||
      error.message.includes('network')
    ) {
      return true;
    }

    // Retry on timeout
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return true;
    }

    return false;
  },
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Add jitter (random 0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * Math.random();

  const delay = Math.min(exponentialDelay + jitter, maxDelay);

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout, ...fetchOptions } = init;

  if (!timeout) {
    return fetch(input, fetchOptions);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Merge abort signals if one exists
    const signal = fetchOptions.signal
      ? combineAbortSignals(fetchOptions.signal, controller.signal)
      : controller.signal;

    const response = await fetch(input, {
      ...fetchOptions,
      signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Convert abort error to timeout error for clarity
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
}

/**
 * Combine multiple abort signals
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Retry wrapper for fetch with exponential backoff
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryConfig?: RetryConfig
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Attempt the fetch
      const response = await fetchWithTimeout(input, {
        ...init,
        timeout: config.timeout,
      });

      // Clone response for retry decision (body can only be read once)
      lastResponse = response.clone();

      // Check if response is ok or should not be retried
      if (response.ok || !config.retryOn(new Error('HTTP Error'), response)) {
        return response;
      }

      // Response indicates failure, prepare for retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error should be retried
      if (!config.retryOn(lastError, lastResponse)) {
        throw lastError;
      }
    }

    // If we've exhausted retries, throw the last error
    if (attempt >= config.maxRetries) {
      break;
    }

    // Calculate delay and wait before next retry
    const delay = calculateDelay(attempt, config.baseDelay!, config.maxDelay!);

    // Notify about retry
    if (config.onRetry) {
      config.onRetry(attempt + 1, lastError!, delay);
    }

    console.warn(
      `[RETRY] Attempt ${attempt + 1}/${config.maxRetries} failed. Retrying in ${delay}ms...`,
      {
        url: typeof input === 'string' ? input : input.toString(),
        error: lastError?.message,
        status: lastResponse?.status,
      }
    );

    await sleep(delay);
  }

  // All retries exhausted
  throw lastError || new Error('Request failed after all retry attempts');
}

/**
 * Retry configuration presets
 */
export const RETRY_PRESETS = {
  // Default: 3 retries, exponential backoff (1s, 2s, 4s)
  default: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },

  // Aggressive: 5 retries, fast backoff (500ms, 1s, 2s, 4s, 8s)
  aggressive: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 10000,
  },

  // Conservative: 2 retries, slow backoff (2s, 4s)
  conservative: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 10000,
  },

  // Quick: 2 retries, fast backoff (300ms, 600ms)
  quick: {
    maxRetries: 2,
    baseDelay: 300,
    maxDelay: 1000,
  },

  // None: No retries
  none: {
    maxRetries: 0,
    baseDelay: 0,
    maxDelay: 0,
  },
} as const;

/**
 * Retry helper with preset configurations
 */
export function createRetryFetch(preset: keyof typeof RETRY_PRESETS = 'default') {
  const config = RETRY_PRESETS[preset];

  return (input: RequestInfo | URL, init?: RequestInit) =>
    fetchWithRetry(input, init, config);
}
