# MyPoll — Live Polling & Quiz Platform

A real-time polling and quiz platform for AI Bootcamp sessions, featuring WebSocket-powered live updates, a Chrome Dino game during breaks, and an admin panel protected by Google OAuth.

---

## Tech Stack

- **Next.js 16** (App Router, custom server)
- **Supabase PostgreSQL** via **Drizzle ORM**
- **Socket.io** for real-time WebSocket events
- **NextAuth.js v5** for Google OAuth (admin only)
- **Shadcn UI** (New York theme)
- **TipTap** rich text editor
- **Recharts** for pie charts
---

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
AUTH_SECRET="run: openssl rand -base64 32"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Migration

Push the schema to Supabase:

```bash
npm run db:push
```

Or generate & run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
4. Copy Client ID and Secret to `.env.local`

### 5. Run

```bash
npm run dev
```

---

## Usage

### Admin Panel (`/admin`)

- First sign-in with Google creates the admin account (subsequent logins with other accounts are rejected)
- **Topics** → create topics → create poll questions (rich text, 4–6 options, timer)
- **Quizzes** → same flow but each question has a "correct answer" marked
- **Start Now** → broadcasts the poll/quiz to all attendees in real time with a countdown timer; shows a pie chart after time expires
- **Take a Break** → starts a 5-minute countdown and broadcasts the Dino game to attendees
- **Settings** → shows the attendee QR code and allows resetting admin password

### Attendee Screen (`/`)

- Register with just your name (session saved in cookie forever)
- See the AI Bootcamp banner with date
- **Idle** — waits for the next poll/quiz
- **Break** — play the Chrome Dino game; high score is saved and shown to everyone
- **Poll/Quiz** — a modal appears with the question and options; vote with one click, then see live progress bars; poll locks after your vote

---

## Project Structure

```
app/
  (admin)/          Admin layout + all admin pages
  (attendee)/       Attendee page (root /)
  api/              REST API routes
components/
  admin/            Sidebar, forms, StartNowDialog, RichTextEditor
  attendee/         DinoGame, PollModal, banner
  ui/               Shadcn components
lib/
  db/schema.ts      Drizzle schema (9 tables)
  db/index.ts       Drizzle client (lazy)
  auth.ts           NextAuth config
  socket.ts         Socket.io client singleton
server.ts           Custom Node server (Next.js + Socket.io)
```

---

## Deployment — Railway

> This app uses a custom Node.js server for Socket.io and **cannot run on Vercel** (serverless). Railway is the recommended host.

### Steps

#### 1. Push code to GitHub
```bash
git init
git add .
git commit -m "initial commit"
gh repo create mypoll --private --push --source=.
```

#### 2. Create a Railway project
1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select your repo — Railway auto-detects the `railway.toml` and runs `npm run build` then `npm run start`

#### 3. Set environment variables in Railway dashboard
Go to your service → **Variables** tab and add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` output |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_APP_URL` | Your Railway public URL (e.g. `https://mypoll.up.railway.app`) |
| `NODE_ENV` | `production` |

#### 4. Update Google OAuth redirect URI
In Google Cloud Console → OAuth credentials → add:
```
https://your-app.up.railway.app/api/auth/callback/google
```

#### 5. Run DB migration (one-time)
```bash
# From your local machine with DATABASE_URL set:
npm run db:push
```

#### 6. Done
Railway redeploys automatically on every `git push`.
