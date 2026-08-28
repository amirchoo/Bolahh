# Bolahh — Local Supabase Setup (Full Tutorial)

## Why local Supabase?

The app talks to Supabase for everything (auth, database, storage). Instead of
pointing your local dev server at the **live production database** (real
users, real wallet balances, real ToyyibPay payments), you'll run a full copy
of Supabase **on your own machine** using the Supabase CLI + Docker.

This gives you:
- Your own isolated Postgres database, seeded from the same migrations that built production
- A local Auth system — sign up fake test accounts freely
- A local Storage system — upload test images without touching real buckets
- Supabase Studio (the dashboard UI) running locally at `localhost:54323`
- A fake email inbox so password resets / notification emails don't hit real inboxes

You can break things, reset the database, and test payment flows without any
risk to bolahh.com or real users.

---

## 1. Prerequisites

Install these once:

1. **Git** — [git-scm.com](https://git-scm.com)
2. **Node.js** (v20+) — [nodejs.org](https://nodejs.org)
3. **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - This is required. The Supabase CLI runs Postgres, Auth, Storage, etc. as Docker containers.
   - After installing, **open Docker Desktop and leave it running** in the background whenever you work on Bolahh.
4. **Supabase CLI**
   ```bash
   npm install -g supabase
   ```
   Verify it worked:
   ```bash
   supabase --version
   ```

---

## 2. GitHub access

Amir needs to add you as a collaborator first:
**GitHub repo → Settings → Collaborators → Add people**

Once you accept the invite:
```bash
git clone https://github.com/amirchoo/Bolahh.git
cd Bolahh
git checkout dev
```
(See `GIT_GUIDE.md` for the full daily git workflow — branching, commits, PRs.)

---

## 3. Install app dependencies

```bash
cd client
npm install
```

---

## 4. Start local Supabase

From the **repo root** (not `client/`):

```bash
supabase start
```

First run will download several Docker images — this can take 5–10 minutes.
Every run after that takes ~30 seconds.

This automatically:
- Spins up a local Postgres database on port `54322`
- Applies **every migration** in `supabase/migrations/` in order, so your
  local schema matches production exactly
- Creates the storage buckets defined via migration (e.g. `avatar-presets`, `card-borders`)
- Starts Studio (dashboard) on port `54323`
- Starts Inbucket (fake email inbox) on port `54324`

When it finishes, it prints something like:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: ...
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Keep this output** — you need the `API URL` and `anon key` in the next step.

> Lost the output? Run `supabase status` any time to reprint it.

⚠️ Two manual buckets don't live in migrations yet (`avatars`, `field-images`
were created by hand in the production dashboard). After `supabase start`,
open Studio → **Storage** and create these two buckets manually (mark both
**Public**). Ask Amir if you hit a missing-bucket error for anything else.

---

## 5. Configure the app to use your local Supabase

Create `client/.env`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=paste_your_local_anon_key_here

VITE_SUPER_ADMIN_EMAIL=your-test-email@example.com
VITE_TOYYIBPAY_BASE_URL=https://dev.toyyibpay.com
```

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from the `supabase start` output above (**local** values, not production's)
- `VITE_SUPER_ADMIN_EMAIL` — whatever email you'll sign up locally to test `/admin`
- `VITE_TOYYIBPAY_BASE_URL` — use the sandbox URL locally; real payment testing needs sandbox credentials from Amir (only needed if you're working on the payment flow — not required for most feature work)

`client/.env` is gitignored — never commit it, and never put production keys in it.

---

## 6. Run the app

```bash
cd client
npm run dev
```

App runs at `http://localhost:5173`, now talking to your local database.

---

## 7. Make yourself an admin locally

1. Sign up a normal account through the app at `localhost:5173/signup`
2. Open Studio → `http://127.0.0.1:54323` → **Table Editor → profiles**
3. Find your row, or run this in **SQL Editor**:
   ```sql
   UPDATE public.profiles SET is_admin = true WHERE email = 'your-test-email@example.com';
   ```
4. For super admin (`/admin` panel), also set:
   ```sql
   UPDATE public.profiles SET name = 'bolahhadmin' WHERE email = 'your-test-email@example.com';
   ```
   (must match `VITE_SUPER_ADMIN_EMAIL` in your `.env`)

Password reset / verification emails sent locally never leave your machine —
check them at `http://127.0.0.1:54324` (Inbucket).

---

## 8. Daily workflow

**Start of every session:**
```bash
git checkout dev
git pull
supabase start          # if not already running
```

**If teammates added new migrations** (new files appear in `supabase/migrations/`
after your `git pull`), apply them to your local DB:
```bash
supabase db reset
```
This wipes your local DB and rebuilds it from scratch (all migrations + seed).
Since it's your local copy only, this is safe and normal to do often — it's
the easiest way to guarantee your local schema exactly matches everyone else's.

**When you need a schema change** (new column, new table, new policy):
```bash
supabase migration new describe_your_change
```
This creates an empty timestamped `.sql` file in `supabase/migrations/`. Write
your SQL there, run `supabase db reset` to apply it locally, test it, then
commit the migration file like any other code change — your teammates will
pick it up next time they `git pull` + `supabase db reset`.

**Never** hand-edit the schema through Studio's UI and skip writing a
migration — it'll only exist on your machine and nobody else's local DB (or
production) will have it.

**Stop Supabase when you're done for the day** (optional, saves battery/RAM):
```bash
supabase stop
```
Your data persists — `supabase start` next time picks up where you left off.
Only `supabase db reset` wipes local data.

---

## 9. Edge Functions (only if you're working on payments/emails)

The functions in `supabase/functions/` (ToyyibPay billing, Resend emails,
notifications) need secrets to run locally. Ask Amir for sandbox values, then:

```bash
supabase functions serve --env-file supabase/functions/.env.local
```
where `supabase/functions/.env.local` (gitignored, ask Amir or create your own
sandbox accounts) contains things like:
```
TOYYIBPAY_SECRET_KEY=...
TOYYIBPAY_CATEGORY_CODE=...
TOYYIBPAY_BASE_URL=https://dev.toyyibpay.com
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Bolahh <admin@bolahh.com>
CRON_SECRET=...
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
the CLI locally — you don't need to set those yourself.

Most day-to-day feature work (pages, UI, game logic) doesn't touch edge
functions at all — skip this section unless you're specifically working on
payments or transactional emails.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `supabase start` hangs or errors | Make sure Docker Desktop is open and running |
| Port already in use | Another `supabase start` is already running (maybe from another project) — run `supabase stop` first |
| Missing storage bucket error | Create it manually in Studio → Storage (see step 4 note), or ask Amir if it should be a migration |
| Local DB looks out of date after pulling | `supabase db reset` |
| Signup/reset emails never arrive | They're not really sent locally — check Inbucket at `localhost:54324` |
