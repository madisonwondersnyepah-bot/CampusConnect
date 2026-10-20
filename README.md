# 🎓 CampusConnect

A full-stack student life platform for universities in Rwanda. Students manage timetables, assignment deadlines and reminders, follow campus announcements and events, and collaborate in study groups with shared notes. Lecturers, student representatives and admins get role-based tools to run it all.

> Built to demonstrate full-stack development, authentication, relational database design and role-based access control.

<!-- Add 3-4 screenshots here: dashboard, timetable, admin users page -->

## Features

- **Authentication**: sign-up and login with short-lived access tokens and rotating, hashed refresh tokens (httpOnly cookie)
- **Courses and enrollment**: admins manage courses, students enroll themselves
- **Timetables**: weekly view per role, with double-booking detection (same course or same room)
- **Assignments**: lecturers post deadlines, students track progress (To do / In progress / Done), lecturers see class-wide progress
- **Reminders**: students schedule reminders before deadlines; a background job triggers them, and they shift automatically if the due date moves
- **Announcements and events**: campus-wide or per-course feeds, pinning, pagination
- **Study groups and shared notes**: public or private groups, invite by email, member-only notes, personal notes
- **Admin dashboard**: platform stats, user management (create, change roles, deactivate, reset passwords)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Axios, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL (Neon) with Prisma ORM |
| Auth | JWT access tokens, rotating refresh tokens, bcrypt (bcryptjs) |
| Validation and security | Zod, Helmet, CORS, express-rate-limit |
| Jobs | node-cron |

## Roles and permissions

| Action | STUDENT | REP | LECTURER | ADMIN |
|---|:-:|:-:|:-:|:-:|
| View timetable, assignments, announcements (own courses) | ✅ | ✅ | ✅ | ✅ |
| Enroll in courses, track progress, set reminders | ✅ | ✅ | ❌ | ❌ |
| Create study groups and notes | ✅ | ✅ | ✅ | ✅ |
| Post campus-wide announcements | ❌ | ✅ | ❌ | ✅ |
| Post course announcements | ❌ | ✅ (enrolled) | ✅ (own courses) | ✅ |
| Pin announcements | ❌ | ❌ | ✅ | ✅ |
| Create events | ❌ | ✅ | ✅ | ✅ |
| Create assignments, manage timetable slots, view rosters | ❌ | ❌ | ✅ (own courses) | ✅ |
| Create and delete courses | ❌ | ❌ | ❌ | ✅ |
| Manage users and roles | ❌ | ❌ | ❌ | ✅ |

## Security and design decisions

- **Self-registration always creates a STUDENT.** Higher roles are granted only by an admin.
- **Roles are re-read from the database on every request**, so demoting or deactivating a user takes effect immediately, not when their token expires.
- **Refresh tokens are hashed at rest, single-use and rotated.** They live in an httpOnly cookie; the short-lived access token is held in memory on the client, never in localStorage.
- **Multi-tenant isolation**: every query is scoped to the caller's university.
- **Hidden means 404**: private study groups and other people's notes respond "not found" instead of "forbidden", so their existence isn't leaked.
- **Admin safety rails**: admins can't demote or deactivate themselves, and the last active admin can never be removed. Demoting a lecturer unassigns their courses. Users are deactivated rather than deleted, to preserve history.
- **Validation everywhere** with Zod, plus rate limiting on login and register.
- **Reminder delivery is atomic**: a reminder is claimed with a conditional update, so it can never fire twice, even with overlapping runs.

## Data model

`University` → `User` (role enum) → `Enrollment` ← `Course` → `TimetableSlot`, `Assignment` → `AssignmentProgress`, `Reminder`.
`Announcement` (campus or course scoped), `Event`, `StudyGroup` → `GroupMember`, `Note` (personal or group), `RefreshToken`.
The full schema is in [`server/prisma/schema.prisma`](server/prisma/schema.prisma).

## API overview

All routes are under `/api`. Everything except the first four auth routes requires `Authorization: Bearer <accessToken>`.

| Area | Endpoints |
|---|---|
| Auth | `GET /auth/universities`, `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Courses | `GET/POST /courses`, `GET/PATCH/DELETE /courses/:id`, `POST/DELETE /courses/:id/enroll`, `GET /courses/:id/students`, `DELETE /courses/:id/students/:userId` |
| Timetable | `GET /timetable`, `GET/POST /courses/:id/slots`, `PATCH/DELETE /courses/:id/slots/:slotId` |
| Assignments | `GET /assignments`, `GET/POST /courses/:id/assignments`, `GET/PATCH/DELETE /assignments/:id`, `PUT/GET /assignments/:id/progress` |
| Reminders | `POST /assignments/:id/reminders`, `GET /reminders`, `DELETE /reminders/:id` |
| Announcements | `GET/POST /announcements`, `GET/PATCH/DELETE /announcements/:id` |
| Events | `GET/POST /events`, `GET/PATCH/DELETE /events/:id` |
| Study groups | `GET/POST /study-groups`, `GET/PATCH/DELETE /study-groups/:id`, `POST /study-groups/:id/join`, `DELETE /study-groups/:id/members/me`, `POST /study-groups/:id/members`, `DELETE /study-groups/:id/members/:userId`, `GET/POST /study-groups/:id/notes` |
| Notes | `GET/POST /notes`, `GET/PATCH/DELETE /notes/:id` |
| Admin | `GET /admin/stats`, `GET/POST /admin/users`, `GET/PATCH /admin/users/:id`, `POST /admin/users/:id/reset-password` |

## Getting started

**Prerequisites:** Node.js 20+, and a PostgreSQL database (a free [Neon](https://neon.com) project works well).

```bash
git clone https://github.com/YOUR-USERNAME/campusconnect.git
cd campusconnect
```

### Backend

```bash
cd server
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Edit `server/.env` with your database URL and a random secret (generate one with
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`), then:

```bash
npx prisma migrate dev      # creates the tables
node prisma/seed.js         # creates a university plus demo accounts
npm run dev                 # http://localhost:5000
```

### Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to the backend)
```

### Demo accounts (local development only)

The seed script creates these, all with the password `Password123!`:

| Email | Role |
|---|---|
| admin@campusconnect.test | ADMIN |
| lecturer@campusconnect.test | LECTURER |

Create student accounts through the sign-up page. **Delete or change the seed accounts before any public deployment.**

## Project structure

```
CampusConnect/
├── client/                 React app (Vite)
│   └── src/
│       ├── api/            Axios instance with silent token refresh
│       ├── context/        AuthContext (session restore, login, logout)
│       ├── routes/         ProtectedRoute, RoleRoute, route table
│       ├── components/     layout, ui and feature components
│       └── pages/          one file per screen (admin/ for admin screens)
└── server/                 Express API
    ├── prisma/             schema.prisma, migrations, seed
    └── src/
        ├── config/         env validation, Prisma client
        ├── middleware/     authenticate, requireRole, validation, errors
        ├── routes/         thin route definitions
        ├── controllers/    request handlers
        ├── services/       token and reminder logic
        ├── jobs/           node-cron reminder job
        └── validators/     Zod schemas
```

## Deployment notes

- **Database:** Neon (free tier).
- **API:** any Node host (for example Render). Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CLIENT_URL` (your frontend's exact origin) and `NODE_ENV=production`. Cookies then use `Secure` and `SameSite=None`, which requires HTTPS.
- **Frontend:** Vercel or similar. Set `VITE_API_URL` to `https://your-api-host/api`.
- Free hosts put idle servers to sleep, so the reminder job only runs while the API is awake. A paid always-on instance or an external scheduler fixes that.

## Roadmap

- Automated tests (Jest and Supertest) and a CI workflow
- Email delivery for reminders (the hook is in `reminder.service.js`)
- Audit log of admin actions
- File attachments for notes and assignments