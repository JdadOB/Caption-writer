# Caption Writer — Creator Dashboard

A creator dashboard where managers share Instagram & TikTok content as inspiration for their creators, with threaded comments, a `Posted → In Progress → Complete` workflow, "seen by" tracking, in-app + email notifications, and an admin panel for managing accounts and assignments.

## Features

- **Three roles**: Admin, Manager, Creator — each with their own login and views.
- **Inspiration posts**: Paste an Instagram or TikTok link and the app fetches a thumbnail/preview automatically.
- **Threaded comments**: Discuss each post with replies.
- **Status workflow**: `Posted → In Progress → Complete`, with automatic timestamps. Only the assigned creator (or an admin) can advance it.
- **Seen by**: Every viewer is recorded so managers can see who has acknowledged a post.
- **Notifications**: In-app bell (with unread badge) and optional email delivery via Resend.
- **Admin panel**: Create/delete users, assign creators to one or more managers, full activity log.
- **Search & filter**: Filter the dashboard by status, creator, and date range, and search posts by title/link/description.
- **Themes**: Toggle between light (white + blue) and dark (black + purple) — and it remembers your choice.
- **Mobile-first**: Designed for the phone first; lays out well on tablets and desktops.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit NEXTAUTH_SECRET (generate one with `openssl rand -base64 32`)
# Optional: set RESEND_API_KEY + EMAIL_FROM to enable email notifications

# 3. Initialize the database (SQLite by default)
npm run db:push
npm run db:seed

# 4. Run the dev server
npm run dev
```

Then open <http://localhost:3000> and sign in with one of the seeded accounts:

| Role    | Email                  | Password    |
| ------- | ---------------------- | ----------- |
| Admin   | admin@example.com      | changeme    |
| Manager | manager@example.com    | manager123  |
| Creator | creator@example.com    | creator123  |

> Change the admin password immediately in production by editing `.env` (`SEED_ADMIN_*`) before seeding, or by deleting the seeded user and creating a new admin through the API.

## Tech stack

- **Next.js 14** (App Router) — full-stack React framework
- **Prisma** with **SQLite** by default (swap to PostgreSQL by changing the `datasource` in `prisma/schema.prisma`)
- **NextAuth** with credentials provider (email + password)
- **Tailwind CSS** for styling, **next-themes** for dark/light toggling
- **Resend** for transactional email (optional)
- **Zod** for request validation
- **bcryptjs** for password hashing

## Project layout

```
src/
  app/
    (app)/                  # authenticated app routes (dashboard, admin, posts)
    api/                    # route handlers (REST-style API)
    login/                  # public login page
  components/               # shared UI (post card, comment thread, theme toggle…)
  lib/                      # prisma client, auth, oembed, notifications, permissions
  types/                    # NextAuth module augmentation
prisma/
  schema.prisma             # database schema
  seed.ts                   # initial users
```

## Scripts

```
npm run dev          # local development
npm run build        # production build
npm run start        # serve the production build
npm run db:push      # apply schema to the database
npm run db:migrate   # create a migration during development
npm run db:seed      # create the bootstrap admin/manager/creator
npm run db:studio    # open Prisma Studio in the browser
```

## Notes

- **Email notifications** are sent through Resend. Leave `RESEND_API_KEY` empty during development and only in-app notifications will fire (no email side effects).
- **Instagram previews** are fetched via the public Open Graph metadata since Instagram's official oEmbed requires a Facebook app token. TikTok uses its public oEmbed endpoint.
- **Postgres in production**: change `provider = "postgresql"` in `prisma/schema.prisma` and set `DATABASE_URL` to a Postgres connection string. No application code changes are required.
