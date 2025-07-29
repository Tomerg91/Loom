# Configuration Refactoring Examples

This document provides before/after examples showing how to refactor hardcoded values throughout the codebase to use the centralized configuration system.

## 1. API Endpoints Refactoring

### Before: Hardcoded API URLs

```typescript
// src/components/auth/reset-password-form.tsx
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const updateResponse = await fetch('/api/auth/update-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: data.password,
    token,
  }),
});
```

### After: Using Configuration

```typescript
// src/components/auth/reset-password-form.tsx
import { config } from '@/lib/config';

const response = await fetch(config.endpoints.auth.RESET_PASSWORD, {
  method: config.http.methods.POST,
  headers: { 'Content-Type': config.http.contentTypes.JSON },
  body: JSON.stringify(data),
});

const updateResponse = await fetch(config.endpoints.auth.UPDATE_PASSWORD, {
  method: config.http.methods.POST,
  headers: { 'Content-Type': config.http.contentTypes.JSON },
  body: JSON.stringify({
    password: data.password,
    token,
  }),
});
```

## 2. Rate Limiting Cleanup Intervals

### Before: Hardcoded Timeout Values

```typescript
// src/lib/security/rate-limit.ts
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Hardcoded 1 hour
```

### After: Using Configuration

```typescript
// src/lib/security/rate-limit.ts
import { RATE_LIMIT_CONFIG } from '@/lib/config';

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);
```

## 3. Real-time Polling Intervals

### Before: Hardcoded Intervals

```typescript
// src/lib/realtime/hooks.ts
// Poll for presence state changes
const interval = setInterval(() => {
  const state = realtimeClient.getPresenceState(channelName);
  setPresenceState(state);
}, 1000); // Hardcoded 1 second

const checkConnection = () => {
  setIsConnected(realtimeClient.getConnectionStatus());
};

const interval2 = setInterval(checkConnection, 1000); // Another hardcoded interval
```

### After: Using Configuration

```typescript
// src/lib/realtime/hooks.ts
import { REALTIME_CONFIG } from '@/lib/config';

// Poll for presence state changes
const interval = setInterval(() => {
  const state = realtimeClient.getPresenceState(channelName);
  setPresenceState(state);
}, REALTIME_CONFIG.PRESENCE_STATE_POLLING);

const checkConnection = () => {
  setIsConnected(realtimeClient.getConnectionStatus());
};

const interval2 = setInterval(checkConnection, REALTIME_CONFIG.CONNECTION_STATUS_INTERVAL);
```

## 4. CRUD Route Configuration

### Before: Hardcoded Values

```typescript
// src/lib/api/crud-routes.ts
// Extract pagination parameters
const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
const offset = (page - 1) * limit;
```

### After: Using Configuration

```typescript
// src/lib/api/crud-routes.ts
import { API_CONFIG } from '@/lib/config';

// Extract pagination parameters
const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
const limit = Math.min(
  API_CONFIG.MAX_PAGE_SIZE, 
  Math.max(API_CONFIG.MIN_PAGE_SIZE, parseInt(searchParams.get('limit') || API_CONFIG.DEFAULT_PAGE_SIZE.toString()))
);
const offset = (page - 1) * limit;
```

## 5. Authentication Client Base URL

### Before: Environment Variable Direct Access

```typescript
// src/lib/api/auth-client.ts
class AuthApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api/auth${endpoint}`;
    // ...
  }
}
```

### After: Using Configuration with Better URL Handling

```typescript
// src/lib/api/auth-client.ts
import { config, EXTERNAL_URLS } from '@/lib/config';

class AuthApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 
      (config.isDevelopment ? EXTERNAL_URLS.LOCALHOST : EXTERNAL_URLS.PRODUCTION_SITE);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`; // endpoint already includes /api/auth
    // ...
  }
}
```

## 6. Debounce Function Configuration

### Before: Magic Number

```typescript
// src/lib/utils.ts
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = 300 // Magic number
): (...args: Parameters<T>) => void {
  // ...
}
```

### After: Using Configuration

```typescript
// src/lib/utils.ts
import { config } from '@/lib/config';

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = config.defaults.DEBOUNCE_DELAY
): (...args: Parameters<T>) => void {
  // ...
}
```

## 7. File Size Validation

### Before: Hardcoded File Size Limits

```typescript
// src/components/ui/file-upload.tsx
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB hardcoded

if (file.size > MAX_FILE_SIZE) {
  setError('File size must be less than 5MB');
  return;
}
```

### After: Using Configuration

```typescript
// src/components/ui/file-upload.tsx
import { FILE_CONFIG } from '@/lib/config';
import { formatFileSize } from '@/lib/utils';

if (file.size > FILE_CONFIG.AVATAR_MAX_SIZE) {
  setError(`File size must be less than ${formatFileSize(FILE_CONFIG.AVATAR_MAX_SIZE)}`);
  return;
}
```

## 8. Session Duration Validation

### Before: Magic Numbers

```typescript
// src/components/sessions/session-form.tsx
const MIN_DURATION = 15; // Magic number
const MAX_DURATION = 480; // 8 hours, magic number
const DEFAULT_DURATION = 60; // Magic number

if (duration < MIN_DURATION || duration > MAX_DURATION) {
  setError(`Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes`);
  return;
}
```

### After: Using Configuration

```typescript
// src/components/sessions/session-form.tsx
import { SESSION_CONFIG } from '@/lib/config';

if (duration < SESSION_CONFIG.MIN_DURATION_MINUTES || duration > SESSION_CONFIG.MAX_DURATION_MINUTES) {
  setError(`Duration must be between ${SESSION_CONFIG.MIN_DURATION_MINUTES} and ${SESSION_CONFIG.MAX_DURATION_MINUTES} minutes`);
  return;
}
```

## 9. Color Values for Avatar Generation

### Before: Hardcoded HSL Values

```typescript
// src/lib/utils.ts
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`; // Hardcoded saturation and lightness
}
```

### After: Using Configuration

```typescript
// src/lib/config/constants.ts - Add to existing config
export const UI_CONFIG = {
  // Avatar colors
  AVATAR_COLOR_SATURATION: 70,
  AVATAR_COLOR_LIGHTNESS: 50,
  
  // Default colors
  PRIMARY_HUE: 240,
  SUCCESS_HUE: 120,
  WARNING_HUE: 60,
  DANGER_HUE: 0,
} as const;

// src/lib/utils.ts
import { UI_CONFIG } from '@/lib/config';

export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, ${UI_CONFIG.AVATAR_COLOR_SATURATION}%, ${UI_CONFIG.AVATAR_COLOR_LIGHTNESS}%)`;
}
```

## 10. Redirect URLs for Authentication

### Before: Direct Hardcoded URLs

```typescript
// src/components/auth/reset-password-form.tsx
<Button
  onClick={() => window.location.href = '/auth/signin'}
  className="w-full"
>
  {t('signIn')}
</Button>
```

### After: Using Configuration

```typescript
// src/components/auth/reset-password-form.tsx
import { AUTH_ENDPOINTS } from '@/lib/config';
import { useRouter } from 'next/navigation';

const router = useRouter();

<Button
  onClick={() => router.push('/auth/signin')} // Or use AUTH_ENDPOINTS if needed
  className="w-full"
>
  {t('signIn')}
</Button>
```

## Benefits of This Refactoring

1. **Centralized Management**: All configuration values are in one place
2. **Environment-Specific Values**: Easy to change values based on environment
3. **Type Safety**: TypeScript types prevent configuration errors
4. **Maintainability**: Changes to timeouts, URLs, or limits only need to be made in one place
5. **Testing**: Easy to mock configuration values for testing
6. **Documentation**: Configuration values are self-documenting with comments
7. **Validation**: Built-in validation ensures configuration values are reasonable

## Usage Patterns

### Import the entire config object:
```typescript
import { config } from '@/lib/config';

// Use config.endpoints.auth.SIGN_IN
// Use config.api.DEFAULT_PAGE_SIZE
// Use config.realtime.POLLING_INTERVAL
```

### Import specific configurations:
```typescript
import { API_CONFIG, AUTH_ENDPOINTS, REALTIME_CONFIG } from '@/lib/config';

// Direct access to specific config sections
```

### Feature flags:
```typescript
import { config } from '@/lib/config';

if (config.features.ENABLE_ANALYTICS) {
  // Analytics code
}
```

This centralized approach makes the codebase more maintainable and reduces the risk of configuration-related bugs.