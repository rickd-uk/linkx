# LinkX Project Notes

Last reviewed: 2026-07-05

## Overview

LinkX is a Next.js link-sharing and bookmarking app. Users can submit links, categorize them, vote on them, and browse feeds sorted by hot score or newest first. Links can be private to the user or public. Admin users have a separate dashboard for managing links, categories, authors, users, signup settings, CSV imports, and test data.

The public app is centered on `src/components/LinkX.tsx`, rendered by `src/app/page.tsx`.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite database
- JWT user auth
- Separate admin auth token
- Anthropic API for AI metadata lookup
- Browser extension for submitting links to `linkx.best`

## Important Files

- `src/app/page.tsx` - homepage entry point
- `src/components/LinkX.tsx` - main link feed UI
- `src/app/[secretPath]/dashboard/page.tsx` - admin dashboard
- `src/app/api/links/route.ts` - main link fetch endpoint
- `src/app/api/links/create/route.ts` - create links
- `src/app/api/links/[id]/route.ts` - update/delete links
- `src/app/api/votes/route.ts` - voting API
- `src/app/api/fetch-title/route.ts` - URL metadata extraction
- `src/app/api/ai-lookup/route.ts` - Claude-powered metadata suggestions
- `src/lib/userAuth.ts` - user JWT helpers
- `src/lib/auth.ts` - admin auth helper
- `src/lib/votingConfig.ts` - vote limits and hot-score calculation
- `prisma/schema.prisma` - database schema
- `server.js` - custom production server with Tokyo-time request logging
- `browser-extension/` - browser extension source

## Data Model

Main Prisma models:

- `User` - registered user accounts, password hash, preferences, ban/force-logout state
- `Link` - title, URL, category, author, description, publication date fields, visibility, owner, soft-delete timestamp
- `Vote` - authenticated user votes on links
- `Category` - public admin categories and private user categories
- `Setting` - app settings such as `signups_enabled`

SQLite is configured in `prisma/schema.prisma`. The example environment uses:

```bash
DATABASE_URL="file:./prisma/dev.db"
```

## Auth

The app has two auth paths:

- User auth uses JWTs stored client-side as `user_token`.
- Admin auth uses `admin_token` and checks credentials through environment-backed admin settings.

Important environment variables:

```bash
ADMIN_USERNAME=
ADMIN_PASSWORD=
DATABASE_URL=
ANTHROPIC_API_KEY=
JWT_SECRET=
```

Do not commit real `.env` files. This repo ignores `.env*`.

## Main User Features

- Submit a link
- Fetch metadata from a URL
- Use AI lookup to suggest title, description, author, and category
- Filter by category
- Search title, description, category, and author
- Sort by hot score or newest
- Switch between my links, public feed, or both
- Vote with a daily vote budget
- Edit own links
- Soft-delete own links into a recycle bin
- Keep uncategorized private links in a triage area

## Admin Features

- Admin dashboard at the secret-path route
- Add/edit/delete links
- Bulk upload and CSV upload
- Manage categories and authors
- Manage users
- Ban users or force logout
- Enable/disable signups
- View stats
- Change admin password
- Seed/manage test data

Admin delete is a hard delete. User delete is a soft delete using `deletedAt`.

## Voting

Voting settings live in `src/lib/votingConfig.ts`.

- `MAX_VOTES_PER_LINK = 5`
- `DAILY_VOTE_BUDGET = 30`
- Hot score is based on total votes, admin boost, and time decay.

## Browser Extension

The extension lives in `browser-extension/`.

Its manifest allows requests to:

```text
https://linkx.best/*
```

API CORS support for browser extensions is handled by `src/middleware.ts`.

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment:

```bash
cp .env.example .env.local
```

Edit `.env.local` with local credentials and API keys.

Prepare the database:

```bash
npm run db:push
npm run db:seed
```

Run the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Production-style local start:

```bash
npm run build
npm run start:port
```

`start:port` runs `server.js` on port `5000`.

## Updating The Project With Git

Check local status:

```bash
git status
```

Review changes:

```bash
git diff
```

Stage intended files:

```bash
git add path/to/file
```

Commit:

```bash
git commit -m "Describe the change"
```

Push to GitHub:

```bash
git push origin main
```

If the active branch is not `main`, check it with:

```bash
git branch --show-current
```

Then push that branch:

```bash
git push origin BRANCH_NAME
```

Remote currently configured:

```text
origin git@github.com:rickd-uk/futureIsNear.git
```

## Updating On The VPS

Use this flow after pushing changes to GitHub.

SSH into the VPS:

```bash
ssh USER@VPS_HOST
```

Go to the production project directory:

```bash
cd /path/to/linkx
```

Check the current branch and local changes:

```bash
git status
git branch --show-current
```

Pull the latest code:

```bash
git pull origin main
```

If production uses another branch, replace `main` with that branch name.

Install dependency changes:

```bash
npm install
```

Apply Prisma schema changes to the SQLite database:

```bash
npm run db:push
```

Build the app:

```bash
npm run build
```

Restart the production process. Use the command that matches how the VPS runs the app.

If using PM2:

```bash
pm2 restart linkx
```

If using a systemd service:

```bash
sudo systemctl restart linkx
sudo systemctl status linkx
```

If running manually:

```bash
npm run start:port
```

Verify the app:

```bash
curl -I https://linkx.best
```

Also check recent logs using the VPS process manager.

For PM2:

```bash
pm2 logs linkx --lines 100
```

For systemd:

```bash
journalctl -u linkx -n 100 --no-pager
```

## VPS Update Checklist

1. Commit and push local changes.
2. SSH to VPS.
3. `cd` into the production project directory.
4. `git pull origin main`.
5. Run `npm install` if dependencies changed.
6. Run `npm run db:push` if `prisma/schema.prisma` changed.
7. Run `npm run build`.
8. Restart the production process.
9. Check the site and logs.

## Notes And Cautions

- Back up `prisma/dev.db` before schema or production data changes.
- Do not overwrite production `.env` files.
- Do not commit `prisma/dev.db`, `.env.local`, `.next`, or `node_modules`.
- The root `README.md` is still mostly the generated Next.js README. This file is the current project-specific overview.
- `src/app/api/links.ts` appears to be an older or legacy API file. The main App Router endpoint is `src/app/api/links/route.ts`.
