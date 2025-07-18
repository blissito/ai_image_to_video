# Design Document

## Overview

This design addresses the issue where authenticated users cannot see their personal data (email, credits, video history) in the dashboard despite having valid session cookies. The problem appears to be in the `/session` endpoint which is not properly awaiting database queries, causing the frontend to receive incomplete user data.

## Architecture

The solution involves fixing the data flow between three main components:

1. **Session Management Layer**: Validates session tokens and extracts user email
2. **Database Layer**: Retrieves user data from Turso database using the email
3. **Frontend Display Layer**: Renders user data in the dashboard UI

```mermaid
graph TD
    A[Frontend Dashboard] --> B[/session Endpoint]
    B --> C[Token Verification]
    C --> D[Database Query]
    D --> E[User Data Response]
    E --> A

    F[User Actions] --> G[Credit Updates]
    G --> H[Database Write]
    H --> I[Real-time Update]
    I --> A
```

## Components and Interfaces

### 1. Session Endpoint Enhancement

**Current Issue**: The `/session` endpoint calls `getUser(decoded.email)` but doesn't await the Promise, causing undefined user data.

**Solution**:

- Add proper async/await handling
- Implement error handling for database failures
- Return structured user data format

```typescript
interface SessionResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    credits: number;
    videoIds: string[];
    bucketLinks: string[];
  };
  error?: string;
}
```

### 2. Frontend Data Display Components

**Dashboard User Info Section**:

- Email display component
- Credit balance component with visual indicators
- Video history list component
- Error state components for each section

**Real-time Updates**:

- Implement polling or WebSocket connection for live updates
- Update local state after user actions (video generation, credit purchase)

### 3. Database Query Optimization

**Current State**: Database queries are properly implemented in `db_setters.ts`
**Enhancement**: Add connection pooling and query caching for better performance

## Data Models

### User Data Structure

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  credits: number;
  videoIds: string[];
  bucketLinks: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

### Frontend State Management

```typescript
interface DashboardState {
  user: User | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
}
```

### Database Optimization

- Implement query result caching for frequently accessed data
- Add database indexes for user email lookups

## Implementation Phases

### Phase 1: Fix Session Endpoint

- Add async/await to `/session` endpoint
- Implement proper error handling
- Test with existing frontend
