# Requirements Document

## Introduction

This feature ensures that user data (email, credits, video history) is properly displayed in the frontend after successful authentication. Currently, users can log in and receive a session cookie, but their personal information is not being displayed in the dashboard, indicating a disconnect between the authentication system and the data retrieval/display functionality.

## Requirements

### Requirement 1

**User Story:** As a logged-in user, I want to see my email address displayed in the dashboard, so that I can confirm I'm logged into the correct account.

#### Acceptance Criteria

1. WHEN a user has a valid session cookie THEN the system SHALL retrieve and display the user's email address in the dashboard
2. WHEN the session is invalid or expired THEN the system SHALL NOT display any user email and redirect to login
3. WHEN the user data cannot be retrieved THEN the system SHALL display an appropriate error message

### Requirement 2

**User Story:** As a logged-in user, I want to see my current credit balance displayed in the dashboard, so that I know how many video generations I can perform.

#### Acceptance Criteria

1. WHEN a user has a valid session THEN the system SHALL retrieve and display the current credit balance from the database
2. WHEN the credit balance is zero THEN the system SHALL display "0 credits" with appropriate styling or messaging
3. WHEN credit data cannot be retrieved THEN the system SHALL display an error state for the credits section
