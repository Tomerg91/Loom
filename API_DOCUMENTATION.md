# Loom Coaching App - API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Authentication APIs](#authentication-apis)
  - [Multi-Factor Authentication](#multi-factor-authentication)
  - [Session Management](#session-management)
  - [File Management](#file-management)
  - [Notifications](#notifications)
  - [Coach Management](#coach-management)
  - [Client Management](#client-management)
  - [Admin Management](#admin-management)
  - [Dashboard Widgets](#dashboard-widgets)
- [Code Examples](#code-examples)
- [Webhook Events](#webhook-events)
- [SDK and Libraries](#sdk-and-libraries)

## Overview

The Loom Coaching App API is a comprehensive REST API that provides secure endpoints for managing coaching relationships, sessions, files, and real-time communication between coaches and clients.

### Base URLs
- **Production**: `https://loom-app.vercel.app/api`
- **Development**: `http://localhost:3000/api`

### API Version
Current version: **v1.0.0**

### Content Type
All API endpoints accept and return JSON data with content type `application/json`, except for file uploads which use `multipart/form-data`.

## Authentication

The Loom API uses JWT (JSON Web Tokens) for authentication. Most endpoints require authentication via Bearer tokens.

### Getting Started

1. **Sign Up**: Create an account using `/api/auth/signup`
2. **Sign In**: Authenticate using `/api/auth/signin`
3. **Use Token**: Include the JWT token in the Authorization header for subsequent requests

### Authorization Header Format

```http
Authorization: Bearer <your-jwt-token>
```

### Token Lifecycle

- **Expiration**: Tokens expire after 24 hours (can be extended with `rememberMe`)
- **Refresh**: Use `/api/auth/session` to check token validity
- **Logout**: Use `/api/auth/signout` to invalidate tokens

### Multi-Factor Authentication (MFA)

The API supports optional MFA using TOTP (Time-based One-Time Passwords):

1. **Setup**: Use `/api/auth/mfa/setup` to generate QR code and backup codes
2. **Enable**: Verify setup with `/api/auth/mfa/verify`
3. **Login**: Provide MFA code during signin when enabled

## Rate Limiting

All endpoints implement rate limiting for security and performance:

| Endpoint Category | Limit | Window | Block Duration |
|------------------|-------|--------|----------------|
| Authentication | 10 requests | 1 minute | 30 minutes |
| File Upload | 20 requests | 1 hour | 15 minutes |
| Session Booking | 10 requests | 1 minute | 10 minutes |
| General API | 100 requests | 1 minute | 5 minutes |

### Rate Limit Headers

Successful responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642678800
```

### Rate Limit Exceeded

When limits are exceeded, the API returns:

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Error Handling

The API uses consistent error response format across all endpoints:

### Error Response Structure

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error context"
  }
}
```

### HTTP Status Codes

| Status Code | Description | Example |
|-------------|-------------|---------|
| 200 | Success | Operation completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict or business rule violation |
| 422 | Unprocessable Entity | Request format is valid but data is invalid |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists or business rule violation
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Unexpected server error

## API Endpoints

## Authentication APIs

### Sign Up

Create a new user account.

**Endpoint**: `POST /api/auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client",
  "phone": "+1234567890",
  "language": "en",
  "acceptedTerms": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "user@example.com",
      "role": "client",
      "firstName": "John",
      "lastName": "Doe",
      "status": "active",
      "language": "en"
    },
    "message": "Account created successfully. Please check your email for verification."
  }
}
```

### Sign In

Authenticate a user with email and password.

**Endpoint**: `POST /api/auth/signin`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": false
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "user@example.com",
      "role": "client",
      "firstName": "John",
      "lastName": "Doe",
      "status": "active",
      "mfaEnabled": false
    },
    "message": "Successfully signed in"
  }
}
```

**MFA Required Response**:
```json
{
  "success": true,
  "data": {
    "requiresMFA": true,
    "userId": "12345678-1234-1234-1234-123456789012",
    "email": "user@example.com",
    "message": "MFA verification required to complete signin"
  }
}
```

### Get Current User

Retrieve the authenticated user's profile.

**Endpoint**: `GET /api/auth/me`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "12345678-1234-1234-1234-123456789012",
    "email": "user@example.com",
    "role": "client",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "status": "active",
    "mfaEnabled": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Sign Out

Sign out the current user and invalidate the token.

**Endpoint**: `POST /api/auth/signout`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully signed out"
}
```

## Multi-Factor Authentication

### Setup MFA

Initialize MFA setup for the authenticated user.

**Endpoint**: `POST /api/auth/mfa/setup`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "manualEntryKey": "JBSW Y3DP EHPK 3PXP",
    "backupCodes": ["123456", "789012", "345678"],
    "appName": "Loom App",
    "accountName": "user@example.com"
  }
}
```

### Verify MFA

Verify MFA code during setup or login.

**Endpoint**: `POST /api/auth/mfa/verify`

**Request Body**:
```json
{
  "code": "123456",
  "userId": "12345678-1234-1234-1234-123456789012"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "verified": true,
    "user": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "user@example.com",
      "role": "client",
      "mfaEnabled": true
    }
  }
}
```

## Session Management

### List Sessions

Retrieve sessions based on user role and permissions.

**Endpoint**: `GET /api/sessions`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (`scheduled`, `in_progress`, `completed`, `cancelled`)
- `from`: Filter sessions from date (ISO 8601)
- `to`: Filter sessions to date (ISO 8601)
- `coachId`: Filter by coach ID (admin only)
- `clientId`: Filter by client ID (admin/coach only)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "title": "Career Planning Session",
      "description": "Discussion about career goals",
      "scheduledAt": "2024-01-15T14:30:00Z",
      "duration": 60,
      "status": "scheduled",
      "coach": {
        "id": "87654321-4321-4321-4321-210987654321",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "client": {
        "id": "11111111-2222-3333-4444-555555555555",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Book Session (Client)

Allow clients to book sessions with available coaches.

**Endpoint**: `POST /api/sessions/book`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "coachId": "87654321-4321-4321-4321-210987654321",
  "title": "Career Planning Session",
  "description": "Discussion about career goals and development plan",
  "scheduledAt": "2024-01-15T14:30:00Z",
  "durationMinutes": 60
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "12345678-1234-1234-1234-123456789012",
    "coachId": "87654321-4321-4321-4321-210987654321",
    "clientId": "11111111-2222-3333-4444-555555555555",
    "title": "Career Planning Session",
    "description": "Discussion about career goals and development plan",
    "scheduledAt": "2024-01-15T14:30:00Z",
    "duration": 60,
    "status": "scheduled",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "message": "Session booked successfully"
}
```

### Get Session Details

Retrieve detailed information about a specific session.

**Endpoint**: `GET /api/sessions/{id}`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "12345678-1234-1234-1234-123456789012",
    "title": "Career Planning Session",
    "description": "Discussion about career goals",
    "scheduledAt": "2024-01-15T14:30:00Z",
    "duration": 60,
    "status": "completed",
    "meetingUrl": "https://meet.example.com/session123",
    "notes": "Client showed great progress on goals",
    "rating": 5,
    "coach": {
      "id": "87654321-4321-4321-4321-210987654321",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "coach@example.com"
    },
    "client": {
      "id": "11111111-2222-3333-4444-555555555555",
      "firstName": "John",
      "lastName": "Doe",
      "email": "client@example.com"
    },
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T15:30:00Z"
  }
}
```

### Cancel Session

Cancel a scheduled session.

**Endpoint**: `POST /api/sessions/{id}/cancel`

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "reason": "Emergency meeting conflict",
  "notifyParticipants": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "12345678-1234-1234-1234-123456789012",
    "status": "cancelled",
    "cancellationReason": "Emergency meeting conflict",
    "cancelledAt": "2024-01-15T13:00:00Z"
  },
  "message": "Session cancelled successfully"
}
```

## File Management

### Upload File

Upload files with validation and security scanning.

**Endpoint**: `POST /api/files/upload`

**Headers**: `Authorization: Bearer <token>`

**Request Body** (multipart/form-data):
```
file: [binary file data]
metadata: {
  "directory": "documents",
  "sessionId": "12345678-1234-1234-1234-123456789012",
  "description": "Session notes",
  "category": "notes",
  "isShared": false,
  "tags": ["career", "planning"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "file": {
    "id": "12345678-1234-1234-1234-123456789012",
    "filename": "session-notes.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "url": "https://storage.example.com/files/session-notes.pdf",
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

### List Files

Retrieve files accessible to the current user.

**Endpoint**: `GET /api/files`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `directory`: Filter by directory (`avatars`, `documents`, `uploads`, `sessions`)
- `category`: Filter by category (`preparation`, `notes`, `recording`, `resource`, `personal`, `avatar`, `document`)
- `sessionId`: Filter by session ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "filename": "session-notes.pdf",
      "originalFilename": "My Session Notes.pdf",
      "fileType": "application/pdf",
      "fileSize": 1048576,
      "fileCategory": "notes",
      "url": "https://storage.example.com/files/session-notes.pdf",
      "description": "Notes from career planning session",
      "tags": ["career", "planning", "goals"],
      "isShared": false,
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Download File

Download the actual file content.

**Endpoint**: `GET /api/files/{id}/download`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
Returns the file content with appropriate Content-Type header.

## Notifications

### List Notifications

Retrieve notifications for the current user.

**Endpoint**: `GET /api/notifications`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `isRead`: Filter by read status (true/false)
- `type`: Filter by type (`session_reminder`, `new_message`, `session_confirmation`, `system_update`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "type": "session_reminder",
      "title": "Session Reminder",
      "content": "Your session with Jane Smith starts in 30 minutes",
      "isRead": false,
      "isArchived": false,
      "scheduledFor": "2024-01-15T14:00:00Z",
      "metadata": {
        "sessionId": "87654321-4321-4321-4321-210987654321",
        "coachName": "Jane Smith"
      },
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Mark Notification as Read

Mark a specific notification as read.

**Endpoint**: `POST /api/notifications/{id}/read`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Mark All Notifications as Read

Mark all user notifications as read.

**Endpoint**: `POST /api/notifications/mark-all-read`

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

## Coach Management

### List Coach's Clients

Retrieve the list of clients for the authenticated coach.

**Endpoint**: `GET /api/coach/clients`

**Headers**: `Authorization: Bearer <token>` (Coach role required)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (`active`, `inactive`, `pending`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "client@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastSeenAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get Client Details

Retrieve detailed information about a specific client.

**Endpoint**: `GET /api/coach/clients/{id}`

**Headers**: `Authorization: Bearer <token>` (Coach role required)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "email": "client@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z",
    "sessions": [
      {
        "id": "12345678-1234-1234-1234-123456789012",
        "title": "Career Planning Session",
        "scheduledAt": "2024-01-15T14:30:00Z",
        "status": "completed",
        "rating": 5
      }
    ],
    "recentReflections": [
      {
        "id": "98765432-8765-4321-8765-432187654321",
        "content": "Today's session was very insightful...",
        "moodRating": 8,
        "createdAt": "2024-01-15T16:00:00Z"
      }
    ]
  }
}
```

### Get Coach Statistics

Retrieve performance statistics for the authenticated coach.

**Endpoint**: `GET /api/coach/stats`

**Headers**: `Authorization: Bearer <token>` (Coach role required)

**Query Parameters**:
- `period`: Statistics period (`week`, `month`, `quarter`, `year`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalSessions": 150,
    "completedSessions": 142,
    "averageRating": 4.7,
    "totalClients": 25,
    "activeClients": 18,
    "revenueGenerated": 15000.00,
    "period": "month"
  }
}
```

## Client Management

### List Client Reflections

Retrieve reflections created by the authenticated client.

**Endpoint**: `GET /api/client/reflections`

**Headers**: `Authorization: Bearer <token>` (Client role required)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sessionId`: Filter by session ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "sessionId": "87654321-4321-4321-4321-210987654321",
      "content": "Today's session helped me understand my communication patterns better...",
      "moodRating": 8,
      "insights": "I need to work on active listening skills",
      "nextSessionGoals": "Practice the communication techniques we discussed",
      "createdAt": "2024-01-15T16:00:00Z",
      "updatedAt": "2024-01-15T16:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Create Reflection

Create a new reflection entry.

**Endpoint**: `POST /api/client/reflections`

**Headers**: `Authorization: Bearer <token>` (Client role required)

**Request Body**:
```json
{
  "sessionId": "87654321-4321-4321-4321-210987654321",
  "content": "Today's session was very insightful. I learned about my communication patterns and how they affect my relationships.",
  "moodRating": 8,
  "insights": "I need to work on active listening skills and being more present in conversations.",
  "nextSessionGoals": "Practice the communication techniques we discussed, especially active listening."
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "12345678-1234-1234-1234-123456789012",
    "sessionId": "87654321-4321-4321-4321-210987654321",
    "content": "Today's session was very insightful...",
    "moodRating": 8,
    "insights": "I need to work on active listening skills...",
    "nextSessionGoals": "Practice the communication techniques we discussed...",
    "createdAt": "2024-01-15T16:00:00Z",
    "updatedAt": "2024-01-15T16:00:00Z"
  },
  "message": "Reflection created successfully"
}
```

### Get Client Statistics

Retrieve progress statistics for the authenticated client.

**Endpoint**: `GET /api/client/stats`

**Headers**: `Authorization: Bearer <token>` (Client role required)

**Query Parameters**:
- `period`: Statistics period (`week`, `month`, `quarter`, `year`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalSessions": 12,
    "completedSessions": 10,
    "averageMoodRating": 7.5,
    "totalReflections": 15,
    "goalsAchieved": 8,
    "progressScore": 85.5,
    "period": "month"
  }
}
```

## Admin Management

### List All Users

Retrieve all users in the system (admin only).

**Endpoint**: `GET /api/admin/users`

**Headers**: `Authorization: Bearer <token>` (Admin role required)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `role`: Filter by role (`client`, `coach`, `admin`)
- `status`: Filter by status (`active`, `inactive`, `pending`, `suspended`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "user@example.com",
      "role": "client",
      "firstName": "John",
      "lastName": "Doe",
      "status": "active",
      "mfaEnabled": true,
      "lastSeenAt": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Get System Health

Retrieve system health and performance metrics.

**Endpoint**: `GET /api/admin/system-health`

**Headers**: `Authorization: Bearer <token>` (Admin role required)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 1234567,
    "database": {
      "status": "connected",
      "responseTime": 45
    },
    "storage": {
      "status": "available",
      "usedSpace": "45.2GB",
      "freeSpace": "154.8GB"
    },
    "api": {
      "requestsPerMinute": 245,
      "averageResponseTime": 120,
      "errorRate": 0.02
    },
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

## Dashboard Widgets

### Get Analytics Widget Data

Retrieve aggregated analytics data for dashboard widgets.

**Endpoint**: `GET /api/widgets/analytics`

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `widget`: Widget type (`sessions_overview`, `user_growth`, `performance_metrics`, `engagement`)
- `period`: Data period (`day`, `week`, `month`, `quarter`, `year`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "widget": "sessions_overview",
    "period": "month",
    "data": {
      "totalSessions": 450,
      "completedSessions": 425,
      "cancelledSessions": 15,
      "noShowSessions": 10,
      "trends": [
        {
          "date": "2024-01-01",
          "value": 45
        },
        {
          "date": "2024-01-02",
          "value": 52
        }
      ]
    }
  }
}
```

## Code Examples

### JavaScript/TypeScript

#### Authentication

```typescript
// Sign up
const signUpResponse = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'client',
    language: 'en',
    acceptedTerms: true
  })
});

const signUpData = await signUpResponse.json();

// Sign in
const signInResponse = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  })
});

const { data: { user } } = await signInResponse.json();
const token = signInResponse.headers.get('Authorization')?.split(' ')[1];

// Store token for subsequent requests
localStorage.setItem('authToken', token);
```

#### Making Authenticated Requests

```typescript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/sessions', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

if (response.status === 401) {
  // Token expired, redirect to login
  window.location.href = '/auth/signin';
}

const { data: sessions } = await response.json();
```

#### File Upload

```typescript
const uploadFile = async (file: File, metadata: object) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};

// Usage
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const file = fileInput.files[0];

const result = await uploadFile(file, {
  directory: 'documents',
  category: 'notes',
  description: 'Session notes',
  isShared: false
});
```

### Python

```python
import requests
import json

class LoomAPIClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        
    def set_token(self, token):
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})
    
    def sign_in(self, email, password):
        response = self.session.post(f'{self.base_url}/auth/signin', json={
            'email': email,
            'password': password
        })
        
        if response.status_code == 200:
            data = response.json()
            if 'requiresMFA' in data['data']:
                return {'requires_mfa': True, 'user_id': data['data']['userId']}
            else:
                # Extract token from response headers or body
                token = response.headers.get('Authorization', '').replace('Bearer ', '')
                self.set_token(token)
                return {'success': True, 'user': data['data']['user']}
        
        return {'error': response.json()}
    
    def get_sessions(self, **params):
        response = self.session.get(f'{self.base_url}/sessions', params=params)
        return response.json()
    
    def book_session(self, coach_id, title, scheduled_at, duration_minutes, description=None):
        data = {
            'coachId': coach_id,
            'title': title,
            'scheduledAt': scheduled_at,
            'durationMinutes': duration_minutes
        }
        if description:
            data['description'] = description
            
        response = self.session.post(f'{self.base_url}/sessions/book', json=data)
        return response.json()

# Usage
client = LoomAPIClient('https://loom-app.vercel.app/api')

# Sign in
result = client.sign_in('user@example.com', 'password')

if result.get('success'):
    # Get sessions
    sessions = client.get_sessions(status='scheduled', limit=10)
    
    # Book a session
    booking = client.book_session(
        coach_id='87654321-4321-4321-4321-210987654321',
        title='Career Planning Session',
        scheduled_at='2024-01-15T14:30:00Z',
        duration_minutes=60,
        description='Discussion about career goals'
    )
```

### cURL Examples

```bash
# Sign up
curl -X POST https://loom-app.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client",
    "language": "en",
    "acceptedTerms": true
  }'

# Sign in
curl -X POST https://loom-app.vercel.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# List sessions
curl -X GET "https://loom-app.vercel.app/api/sessions?status=scheduled&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Book session
curl -X POST https://loom-app.vercel.app/api/sessions/book \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "87654321-4321-4321-4321-210987654321",
    "title": "Career Planning Session",
    "scheduledAt": "2024-01-15T14:30:00Z",
    "durationMinutes": 60,
    "description": "Discussion about career goals"
  }'

# Upload file
curl -X POST https://loom-app.vercel.app/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@session-notes.pdf" \
  -F 'metadata={"directory":"documents","category":"notes","description":"Session notes"}'
```

## Webhook Events

The Loom API supports webhooks for real-time event notifications. Configure webhook endpoints in your admin dashboard to receive events.

### Supported Events

| Event | Description | Payload |
|-------|-------------|---------|
| `session.booked` | New session booked | Session object |
| `session.cancelled` | Session cancelled | Session object + cancellation details |
| `session.completed` | Session marked as completed | Session object + completion details |
| `file.uploaded` | New file uploaded | File object |
| `user.created` | New user registered | User object |
| `reflection.created` | New reflection created | Reflection object |

### Webhook Security

Webhooks are secured using HMAC-SHA256 signatures. Verify the signature using the webhook secret provided in your admin dashboard.

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDK and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@loom/api-client` (npm)
- **Python**: `loom-api-client` (PyPI)
- **React Hooks**: `@loom/react-hooks` (npm)

### Installation

```bash
# JavaScript/TypeScript
npm install @loom/api-client

# Python
pip install loom-api-client

# React Hooks
npm install @loom/react-hooks
```

### Usage Examples

```typescript
// JavaScript/TypeScript SDK
import { LoomClient } from '@loom/api-client';

const client = new LoomClient({
  baseUrl: 'https://loom-app.vercel.app/api',
  token: 'your-jwt-token'
});

const sessions = await client.sessions.list({ status: 'scheduled' });
const session = await client.sessions.book({
  coachId: 'coach-id',
  title: 'Career Planning',
  scheduledAt: '2024-01-15T14:30:00Z',
  durationMinutes: 60
});
```

```jsx
// React Hooks
import { useSessions, useSession } from '@loom/react-hooks';

function SessionsList() {
  const { sessions, loading, error } = useSessions({ status: 'scheduled' });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {sessions.map(session => (
        <li key={session.id}>{session.title}</li>
      ))}
    </ul>
  );
}

function SessionBooking() {
  const { bookSession, booking } = useSession();
  
  const handleBooking = async () => {
    await bookSession({
      coachId: 'coach-id',
      title: 'Career Planning',
      scheduledAt: '2024-01-15T14:30:00Z',
      durationMinutes: 60
    });
  };
  
  return (
    <button onClick={handleBooking} disabled={booking}>
      {booking ? 'Booking...' : 'Book Session'}
    </button>
  );
}
```

## Support and Resources

- **API Status**: [status.loom-app.com](https://status.loom-app.com)
- **Documentation**: [docs.loom-app.com](https://docs.loom-app.com)
- **Support**: [support@loom-app.com](mailto:support@loom-app.com)
- **Community**: [Discord Server](https://discord.gg/loom-app)
- **GitHub**: [github.com/loom-app/api](https://github.com/loom-app/api)

---

*This documentation is version 1.0.0. For the latest updates, please refer to the online documentation.*