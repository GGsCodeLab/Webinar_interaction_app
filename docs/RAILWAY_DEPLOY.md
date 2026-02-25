# Deploy MyPoll to Railway

This app uses **Next.js (custom server)**, **Socket.IO**, **SQLite (Drizzle)**, and **NextAuth**. Below is a minimal checklist and step-by-step plan.

---

## 1. What’s already in the repo

- **`railway.toml`** – Nixpacks build, `npm run build` / `npm run start`, healthcheck `/`, restart policy, and a note about the SQLite volume.
- **`.railwayignore`** – Excludes `.env.local`, `.git`, `.next`, `node_modules`, logs.

You only need to create the project on Railway, set env vars, and attach a volume if you want persistent SQLite.

---

## 2. Build and run on Railway

| Item | Value |
|------|--------|
| **Build** | `npm run build` (Next.js) |
| **Start** | `npm run start` → `NODE_ENV=production tsx server.ts` |
| **Port** | Set by Railway via `PORT` (server already reads `process.env.PORT`) |

**Note:** `tsx` is in `devDependencies`. Nixpacks usually installs devDependencies at build time and reuses that install for `start`, so `tsx` should be available. If you ever see “tsx: command not found” in production, add `tsx` to `dependencies` in `package.json`.

---

## 3. Environment variables (Railway dashboard)

Set these in the Railway service → **Variables**:

| Variable | Required | Example / notes |
|----------|----------|------------------|
| `AUTH_SECRET` | Yes | e.g. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Your app URL, e.g. `https://your-app.up.railway.app` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `NEXTAUTH_URL` (used for Socket.IO client and API calls) |
| `DATABASE_PATH` | If using volume | e.g. `/data/mypoll.db` (see section 4) |
| `AUTH_GOOGLE_ID` | If using Google | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | If using Google | Google OAuth client secret |

**Set automatically by Railway (do not add):** `PORT`, `NODE_ENV`, `RAILWAY_PUBLIC_DOMAIN`.

Do **not** commit `.env.local`; configure the variables above only in the Railway dashboard.

---

## 4. SQLite persistence (recommended)

Railway’s filesystem is ephemeral. Without a volume, `mypoll.db` is lost on every deploy.

1. In Railway: your service → **Volumes** → **Add Volume**.
2. Set **Mount path** to: `/data`
3. In **Variables**, set:  
   `DATABASE_PATH=/data/mypoll.db`

The app already uses `DATABASE_PATH` in `lib/db/index.ts` and `drizzle.config.ts`, so no code change is needed.

---

## 5. Deploy steps (high level)

1. **Railway**
   - Sign in at [railway.app](https://railway.app).
   - **New Project** → **Deploy from GitHub repo** and select `GGsCodeLab/Webinar_interaction_app` (or your fork).  
   - Or: **Empty Project** → **Add GitHub repo** and connect the same repo.

2. **Configure**
   - Open the deployed service → **Variables** and add the variables from section 3 (at least `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`; add `DATABASE_PATH` if you added a volume).
   - (Optional) Add a volume as in section 4 and set `DATABASE_PATH=/data/mypoll.db`.

3. **Domain**
   - Service → **Settings** → **Networking** → **Generate domain** (e.g. `your-app.up.railway.app`).
   - Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to that URL (with `https://`).

4. **Deploy**
   - Push to the connected branch; Railway will run `npm run build` and then `npm run start` using `railway.toml`.  
   - Or trigger a redeploy from the Railway dashboard.

5. **Post-deploy**
   - Open `https://your-app.up.railway.app` and check health (e.g. `/`).
   - If you use a volume and the DB is new, run migrations once (e.g. via a one-off run or a small script):  
     `npx drizzle-kit push` (or your usual migrate command) with `DATABASE_PATH` set to `/data/mypoll.db`.  
   - For SQLite, the app will create the DB file on first write if it doesn’t exist; ensure the volume is mounted and the process can write to `/data`.

---

## 6. Optional: run migrations on deploy

If you prefer migrations to run automatically on each deploy:

- Use **Railway** → **Settings** → add a **Deploy** or **Build** command that runs after `npm run build`, e.g.  
  `npm run build && npx drizzle-kit push`  
  and set `DATABASE_PATH` so it points at the volume path (`/data/mypoll.db`).  
- Or add a small script (e.g. `scripts/migrate-and-start.sh`) that runs `npx drizzle-kit push` then `npm run start`, and in `railway.toml` set `startCommand` to that script.  
- Ensure the start command still starts the Node process (e.g. `tsx server.ts` or the script that runs it).

---

## 7. Summary

- **Already done:** `railway.toml` and `.railwayignore` are set for build, start, healthcheck, and ignore rules.
- **You do:** Create project from repo → set env vars (especially `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`) → add volume and `DATABASE_PATH` for SQLite → generate domain and point the URLs to it.
- **Result:** App runs on Railway with persistent SQLite (if volume is configured) and Socket.IO/NextAuth working against the public URL.
