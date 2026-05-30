# Video Lesson Platform

A server-rendered Node.js/Express application for managing video-based courses, lessons, users, enrollments, and administrative monitoring.

The app uses EJS views, SQLite through `better-sqlite3`, session authentication, CSRF protection, role-based authorization, audit logging, and optional Redis-backed session storage.

## Features

- User registration, login, logout, password hashing, login lockout, and password strength checks.
- Roles for `student`, `instructor`, and `admin`.
- Course CRUD for instructors/admins, including publish/unpublish controls.
- Lesson CRUD for course owners/admins, with HTTPS-only video URL validation.
- Published course browsing and enrollment/unenrollment.
- Lesson access rules based on publication state, ownership, role, and active enrollment.
- User profile viewing/editing, with admin role and activation controls.
- Admin monitor with audit log filters, access/error log tailing, user lookup, and server uptime.
- Centralized error handling, rotating log files, and database-backed audit events.

## Tech Stack

- Node.js and Express 4
- EJS with `express-ejs-layouts`
- SQLite via `better-sqlite3`
- `express-session`, optional Redis session store via `connect-redis`
- `bcrypt` for password hashing
- `csurf` for CSRF protection
- `express-rate-limit` for auth rate limiting
- `morgan` and `rotating-file-stream` for access/error logs

## Requirements

- Node.js 20 or newer is recommended.
- npm
- Redis is optional for local development. If Redis is unavailable, the app falls back to Express MemoryStore unless `NODE_ENV=production`.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a local environment file:

   ```sh
   cp .env.example .env
   ```

3. Adjust `.env` as needed. Useful variables:

   ```env
   NODE_ENV=development
   PORT=3000
   DB_PATH=./data/app.db
   SESSION_SECRET=replace-me-with-a-secure-random-string
   REDIS_URL=redis://127.0.0.1:6379
   LOG_DIR=./logs
   LOG_ROTATE_SIZE=1M
   LOG_ROTATE_INTERVAL=1d
   LOG_MAX_FILES=7
   ```

4. Initialize the database:

   ```sh
   npm run db:init
   ```

5. Seed demo data:

   ```sh
   npm run db:seed
   ```

6. Start the app:

   ```sh
   npm start
   ```

7. Open:

   ```text
   http://localhost:3000
   ```

## Demo Accounts

After running `npm run db:seed`, these accounts are available unless overridden by seed password environment variables:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin` |
| Instructor | `instructor@example.com` | `instructor` |
| Student | `student@example.com` | `student` |
| Admin | `admin2@example.com` | `admin2` |
| Instructor | `instructor2@example.com` | `instructor2` |
| Student | `student2@example.com` | `student2` |

Seed password overrides:

- `SEED_ADMIN_PASSWORD`
- `SEED_INSTRUCTOR_PASSWORD`
- `SEED_STUDENT_PASSWORD`
- `SEED_ADMIN_PASSWORD2`
- `SEED_INSTRUCTOR_PASSWORD2`
- `SEED_STUDENT_PASSWORD2`

## npm Scripts

| Command | Description |
| --- | --- |
| `npm start` | Starts the Express server with `nodemon ./bin/www`. |
| `npm run db:init` | Creates the SQLite schema from `db/schema.sql`. |
| `npm run db:seed` | Inserts demo users, courses, lessons, enrollments, progress, and audit logs. |
| `npm run db:smoke` | Inserts a simple test course and prints course records. |

## Project Structure

```text
app.js                     Express app factory and middleware setup
bin/www                    HTTP server, Redis session store setup, graceful shutdown
routes/                    Route handlers for auth, courses, lessons, users, admin, home
views/                     EJS pages and shared layout
public/                    Stylesheets and static images
db/                        SQLite connection, schema, repositories, seed scripts
services/authService.js    Registration and login logic
utils/authz/               Ability constants, authorization middleware, resource loaders
utils/policies/            Role/resource policy checks
utils/logging/             Access/error log streams, sanitization, rate-limit handler
utils/middleware/          Auth and error middleware
```

## Data Model

The SQLite schema includes:

- `users`
- `courses`
- `lessons`
- `enrollments`
- `lesson_progress`
- `user_tokens`
- `audit_logs`

The default database path is `./data/app.db`. The app creates the parent folder automatically when the database connection is opened.

## Authorization Summary

- Students can browse published courses, enroll, unenroll, and view published lessons for active enrollments.
- Instructors can create courses, manage courses they own, manage lessons for owned courses, and enroll in published courses.
- Admins can manage courses, lessons, users, activation state, and access `/admin/monitor`.
- Inactive users are logged out and redirected to login.

## Security and Logging Notes

- Passwords are hashed with `bcrypt`.
- Registration enforces a minimum 12-character password and `zxcvbn` strength score.
- Login failures are tracked and can temporarily lock an account.
- Auth routes are rate limited.
- All forms use CSRF tokens through `csurf`.
- Sessions use `httpOnly`, `sameSite=lax`, and production-only secure cookies.
- Audit events are stored in SQLite and include request metadata.
- Access and error logs rotate under `LOG_DIR` or `./logs` by default.

## Development Notes

- Keep work off `main`; use feature branches for changes.
- Generated/runtime files such as `node_modules/`, `data/*.db*`, and `logs/` are ignored.
- Do not use the fallback MemoryStore in production. Configure Redis and a strong `SESSION_SECRET`.
- Run `npm run db:init` before starting with a fresh database.
