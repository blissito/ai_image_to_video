# Implementation Plan

- [x] 1. Setup Turso connection and schema
  - Install @libsql/client dependency
  - Create src/db/turso.ts with connection singleton
  - Create src/db/schema.sql with users table
  - _Requirements: 1.1, 1.4_

- [x] 2. Create migration script
  - Write src/db/migrate.ts to read current JSON data
  - Insert all existing users into Turso database
  - Create backup of original JSON file
  - _Requirements: 2.1, 2.2_

- [x] 3. Update database functions to use Turso
  - Modify getUser() function to query Turso instead of JSON
  - Update updateUserCredits() to use SQL UPDATE
  - Update sufficientCredits() to work with Turso data
  - Update addBucketLinkToUser() and updateUserLinks() for SQL
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Test the migration
  - Test user login and session functionality
  - Test credit purchase and video generation flow
  - Verify all existing functionality works identically
  - _Requirements: 2.3, 2.4_
