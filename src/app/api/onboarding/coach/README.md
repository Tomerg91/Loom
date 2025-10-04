# Coach Onboarding API Endpoint

## Overview
This endpoint handles the complete coach onboarding process, saving profile information, pricing details, and availability schedules.

## Endpoint
```
POST /api/onboarding/coach
```

## Authentication
Requires authentication with a valid Bearer token for a user with the `coach` role.

## Rate Limiting
- **Limit**: 5 requests per minute per IP
- **Headers**: Rate limit information is returned in response headers
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Request Payload

```typescript
{
  userId: string;              // UUID of the coach user (must match authenticated user)
  profile: {
    bio: string;              // 50-2000 characters
    experienceYears: number;  // 0-100
    specializations: string[]; // 1-10 items, each 1-100 characters
    profilePictureUrl?: string; // Optional, valid URL
  };
  pricing: {
    sessionRate: number;      // Positive number, max 10000
    currency: string;         // 3-letter currency code (e.g., "USD", "EUR")
    languages: string[];      // 1-10 items, each 1-50 characters
    timezone: string;         // Valid timezone (e.g., "America/New_York")
  };
  availability: {
    weeklySlots: Array<{
      dayOfWeek: number;      // 0-6 (Sunday=0, Monday=1, etc.)
      startTime: string;      // Format: "HH:MM" (24-hour)
      endTime: string;        // Format: "HH:MM" (24-hour, must be > startTime)
    }>;                       // 1-50 slots
    defaultDuration: number;  // 15-480 minutes (session duration)
    bufferTime: number;       // 0-120 minutes (gap between sessions)
  };
}
```

## Example Request

```bash
curl -X POST https://your-domain.com/api/onboarding/coach \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "profile": {
      "bio": "Experienced leadership coach with over 10 years of experience helping executives and entrepreneurs achieve their goals. Specialized in career transitions, personal development, and performance optimization.",
      "experienceYears": 10,
      "specializations": ["Leadership", "Career Development", "Executive Coaching"],
      "profilePictureUrl": "https://example.com/profile.jpg"
    },
    "pricing": {
      "sessionRate": 150,
      "currency": "USD",
      "languages": ["English", "Spanish"],
      "timezone": "America/New_York"
    },
    "availability": {
      "weeklySlots": [
        {
          "dayOfWeek": 1,
          "startTime": "09:00",
          "endTime": "12:00"
        },
        {
          "dayOfWeek": 1,
          "startTime": "14:00",
          "endTime": "17:00"
        },
        {
          "dayOfWeek": 3,
          "startTime": "09:00",
          "endTime": "17:00"
        },
        {
          "dayOfWeek": 5,
          "startTime": "10:00",
          "endTime": "15:00"
        }
      ],
      "defaultDuration": 60,
      "bufferTime": 15
    }
  }'
```

## Success Response

**Status Code**: `201 Created`

```json
{
  "success": true,
  "data": {
    "coach": {
      "id": "uuid",
      "coach_id": "uuid",
      "bio": "string",
      "experience_years": 10,
      "specializations": ["Leadership", "Career Development"],
      "session_rate": 150,
      "currency": "USD",
      "languages": ["English", "Spanish"],
      "timezone": "America/New_York",
      "default_session_duration": 60,
      "booking_buffer_time": 15,
      "profile_picture_url": "https://example.com/profile.jpg",
      "onboarding_completed_at": "2025-10-04T10:30:00.000Z",
      "created_at": "2025-10-04T10:30:00.000Z",
      "updated_at": "2025-10-04T10:30:00.000Z",
      "users": {
        "id": "uuid",
        "email": "coach@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "avatar_url": "https://example.com/profile.jpg",
        "timezone": "America/New_York"
      }
    },
    "onboardingCompleted": true,
    "message": "Coach onboarding completed successfully"
  },
  "message": "Coach onboarding completed successfully"
}
```

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "issues": [
      {
        "path": ["profile", "bio"],
        "message": "Bio must be at least 50 characters",
        "code": "too_small"
      }
    ]
  }
}
```

### 401 Unauthorized - Missing/Invalid Token
```json
{
  "success": false,
  "error": "Authentication required. Please provide a valid Bearer token.",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden - Not a Coach
```json
{
  "success": false,
  "error": "Access denied. Only coach accounts can complete coach onboarding.",
  "code": "FORBIDDEN"
}
```

### 403 Forbidden - Wrong User
```json
{
  "success": false,
  "error": "Access denied. You can only update your own profile.",
  "code": "FORBIDDEN"
}
```

### 429 Too Many Requests - Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "TOO_MANY_REQUESTS"
}
```

**Headers**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696428000
Retry-After: 45
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "An unexpected error occurred while processing your onboarding. Please try again.",
  "code": "INTERNAL_SERVER_ERROR"
}
```

## Database Operations

The endpoint performs the following database operations:

1. **Upserts coach_profiles table** with:
   - Profile information (bio, experience, specializations)
   - Pricing details (rate, currency)
   - Languages and timezone
   - Session settings (duration, buffer time)
   - Onboarding completion timestamp

2. **Updates users table** with:
   - Avatar URL (if provided)
   - Timezone

3. **Deletes existing availability slots** for the coach

4. **Inserts new availability slots** into coach_availability table

5. **Logs audit event** for tracking and compliance

## Security Features

- **Authentication**: Requires valid JWT token
- **Authorization**: Only coaches can access this endpoint
- **Ownership Verification**: Users can only update their own profile
- **Input Sanitization**: All inputs are sanitized to prevent XSS attacks
- **Payload Size Limit**: Maximum 1MB payload size
- **Depth Check**: Prevents deeply nested object attacks
- **Rate Limiting**: 5 requests per minute to prevent abuse
- **Audit Logging**: All onboarding completions are logged

## Validation Rules

### Profile
- **bio**: 50-2000 characters
- **experienceYears**: 0-100 (integer)
- **specializations**: 1-10 items, each 1-100 characters
- **profilePictureUrl**: Valid URL or empty string (optional)

### Pricing
- **sessionRate**: Positive number, max 10,000
- **currency**: 3-letter uppercase code (e.g., USD, EUR, GBP)
- **languages**: 1-10 items, each 1-50 characters
- **timezone**: Valid IANA timezone string

### Availability
- **weeklySlots**: 1-50 slots
  - **dayOfWeek**: 0-6 (Sunday=0)
  - **startTime**: HH:MM format (24-hour)
  - **endTime**: HH:MM format (24-hour), must be after startTime
- **defaultDuration**: 15-480 minutes
- **bufferTime**: 0-120 minutes

## Usage Notes

1. **Idempotency**: The endpoint uses upsert operations, so calling it multiple times with the same data will update the existing record rather than creating duplicates.

2. **Availability Slots**: All existing availability slots are deleted before inserting new ones to ensure a clean state.

3. **Profile Picture**: Can be provided in the request or set separately. If provided, it updates both coach_profiles and users tables.

4. **Timezone**: The timezone from pricing is used for both the coach profile and availability slots.

5. **Audit Trail**: Every successful onboarding completion is logged in the audit_logs table with IP address and user agent.

## Testing

### Unit Tests
```bash
npm test src/app/api/onboarding/coach/route.test.ts
```

### Integration Tests
```bash
npm run test:integration onboarding-coach
```

### Manual Testing with curl
```bash
# Set your access token
TOKEN="your_access_token_here"

# Test successful onboarding
curl -X POST http://localhost:3000/api/onboarding/coach \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-data/coach-onboarding.json

# Test validation error (missing required field)
curl -X POST http://localhost:3000/api/onboarding/coach \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test rate limiting (make 6+ requests quickly)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/onboarding/coach \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d @test-data/coach-onboarding.json
done
```

## Related Endpoints

- `GET /api/coaches` - List all coaches
- `GET /api/coaches/[id]` - Get specific coach details
- `GET /api/coaches/[id]/availability` - Get coach availability
- `PUT /api/coaches/[id]/availability` - Update coach availability

## Migration

The endpoint requires the migration `20251004000001_add_coach_onboarding_tracking.sql` to be applied, which adds:
- `onboarding_completed_at` field to track completion
- `default_session_duration` field for session settings
- `booking_buffer_time` field for scheduling
- `profile_picture_url` field for profile image

## Dependencies

- `@/lib/api/utils` - API utilities (auth, validation, error handling)
- `@/lib/supabase/server` - Supabase server client
- `zod` - Schema validation library

## Changelog

### 2025-10-04 - v1.0.0
- Initial implementation
- Added comprehensive validation
- Implemented security features
- Added audit logging
- Added rate limiting
