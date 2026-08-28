# Learning Notes — Understanding Your Own Stack

You're building Bolahh by vibe coding (describing what you want, letting AI write it), which is
totally fine for shipping — but it means there are gaps in *why* things work. This file explains
the concepts behind what's actually in this repo, using your real files as examples, so you can
read your own code and follow along instead of just trusting it.

Treat this as a reference to re-read, not something to memorize in one sitting.

---

## 1. The Big Picture: What Kind of App Is This?

Bolahh is a **client-only web app talking directly to a hosted database**. There is no custom
backend server that you wrote (no Express, no Django, no custom API routes). Instead:

```
Your browser (React app)  <-- HTTPS -->  Supabase (hosted Postgres + Auth + Storage)
```

This is sometimes called a **"backend-as-a-service" (BaaS)** architecture. Compare it to the more
"traditional" setup:

| Traditional 3-tier | Bolahh |
|---|---|
| React frontend | React frontend ✅ same |
| Your own backend (Node/Express, auth logic, etc.) | **Doesn't exist** — Supabase provides this |
| Your own database (Postgres, MySQL) you manage | Supabase-hosted Postgres |

The tradeoff: you write way less code (no server to build/deploy/scale), but the browser now needs
**direct, safe permission to talk to the database**. That's what Row Level Security (section 3)
exists for — it's doing the job your backend's `if (user.owns(this))` checks would normally do.

---

## 2. The Tech Stack, Piece by Piece

Look at [client/package.json](client/package.json) — every dependency there is a tool solving one
job. Here's what each layer does and *why* it's the tool for that job:

- **React 19** — a JavaScript library for building UI out of reusable, self-updating pieces
  ("components"). Instead of manually finding a `<div>` and changing its text when data changes
  (old-school "DOM manipulation"), you write `<PlayerAvatar player={p} />` and React re-renders it
  automatically whenever `p` changes. This is called **declarative UI** — you describe *what* the
  UI should look like for a given state, not *how* to mutate it step by step.

- **Vite** — the *build tool*. In development it serves your code instantly with almost no
  compile wait ("hot module reload"). For production it bundles everything (JS, CSS, images) into
  optimized static files. Look at [client/vite.config.js](client/vite.config.js) — it's nearly
  empty, which tells you Vite's defaults are doing almost all the work; you haven't needed to
  customize it.

- **React Router 7** — handles client-side routing. Normally, navigating to a new URL means the
  browser makes a fresh request to a server. React Router intercepts that and swaps components
  in-place instead, which is why your app feels instant when you click between pages — it's a
  **single-page app (SPA)**: one HTML page ([client/index.html](client/index.html)), JavaScript
  swaps the content. This is *why* [client/vercel.json](client/vercel.json) has a rewrite rule
  sending every path back to `/index.html` — otherwise refreshing `/profile` directly would 404 on
  Vercel's server, since there's no real `/profile` file to serve.

- **Supabase JS client** (`@supabase/supabase-js`) — a library that lets your frontend talk to
  Postgres, Auth, and file storage directly over HTTPS, without you writing API endpoints.

- **framer-motion / lenis** — animation libraries (page transitions, smooth scroll).

- **i18next / react-i18next** — internationalization (i18n = "i" + 18 letters + "n"). Swaps text
  between English/Bahasa Malaysia based on a language toggle, without duplicating your components.

- **html2canvas** — screenshots a DOM element into an image client-side. This is almost certainly
  how the FIFA-style player cards get exported as shareable images.

---

## 3. The Database: Supabase, Postgres, and How the Connection Actually Works

### What Supabase *is*
Supabase = a hosted **PostgreSQL database** + an **Auth service** + **file storage** + a generated
**REST/realtime API layer** sitting in front of your Postgres tables, all managed for you. You
never SSH into a server or run `CREATE TABLE` by hand in production — you write migration files
(more on that below) and Supabase applies them.

### How your app connects
Open [client/src/lib/supabaseClient.js](client/src/lib/supabaseClient.js):

```js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey, { ... });
```

Two things worth understanding:

1. **`import.meta.env.VITE_*`** — Vite injects environment variables at build time from a `.env`
   file. The `VITE_` prefix is required — Vite only exposes env vars to browser code if they start
   with that prefix (this is a *safety feature*: it stops you from accidentally leaking a secret
   server-only key into the browser bundle just by defining it).

2. **The "anon key" is meant to be public.** Unlike a typical backend API key, the Supabase anon
   key is designed to be shipped inside your browser JS bundle — anyone can view it in devtools.
   That's safe *only because* of Row Level Security (next section). The anon key by itself grants
   nothing; the database's own rules decide what each request is allowed to touch.

### Row Level Security (RLS) — the concept that makes this whole architecture safe
Since the browser talks to Postgres directly, something has to stop User A from reading or editing
User B's wallet balance. In a traditional backend, you'd write that check in your server code
(`if (req.user.id !== row.user_id) reject()`). Here, there's no server code — so the *database
itself* enforces it, per row, via policies attached to each table. Conceptually:

```sql
-- (illustrative — check your actual policies in the Supabase dashboard)
create policy "users can only update their own profile"
on profiles for update
using (auth.uid() = id);
```

This is the single most important security concept in this whole stack: **without RLS turned on
and configured correctly, any signed-in user's browser could read or write any row in any table**,
because the anon key has no built-in per-user restriction. If a table ever "leaks" data across
users, RLS misconfiguration is the first thing to check.

### Migrations — how your schema changes over time
Look in [supabase/migrations/](supabase/migrations/) — filenames like
`20260821020000_backfill_border_grants.sql`. Each file is a **timestamped, one-way SQL script**
that changes the database schema (add a column, create a table, backfill data). This is called
**schema migration**, and the pattern solves a real problem: if you just edited tables by hand in
the Supabase dashboard, you'd have no record of *what changed and why*, and your local dev database
could drift out of sync with production. Instead:

- Each migration is a small, named, ordered step (the timestamp prefix enforces order).
- They're checked into git, so `git log` on the `supabase/migrations/` folder *is* your schema
  history.
- Running them in order, top to bottom, on any empty database reproduces the exact current schema.

Notice the comments inside your own migration file — e.g. *"Safe to re-run: both statements are
idempotent."* **Idempotent** means running it twice has the same effect as running it once (here,
via `on conflict ... do nothing`). This matters because migrations sometimes need to be re-applied
(e.g., syncing a fresh local dev database), and a non-idempotent script would double-insert data or
error out.

### Local vs. hosted database
Your [SUPABASE_LOCAL_SETUP.md](SUPABASE_LOCAL_SETUP.md) and
[supabase/config.toml](supabase/config.toml) point at the **Supabase CLI**, which can spin up a
full local copy of Postgres + Auth in Docker. The point: you can test destructive migrations
locally before they touch real user data in production. This mirrors a general engineering habit —
**never test schema changes directly on production data.**

---

## 4. Auth: How "Being Logged In" Actually Works

Open [client/src/context/AuthContext.jsx](client/src/context/AuthContext.jsx). A few concepts to
unpack:

- **Session tokens, not passwords, are what gets stored.** After you log in, Supabase Auth gives
  the browser a **JWT (JSON Web Token)** — a signed token proving "this browser is user X until
  time Y" — not your password. That token is what gets attached to every subsequent database
  request so RLS policies can check `auth.uid()`.

- **Where the token lives** — your code has a `dynamicStorage` object switching between
  `localStorage` (persists after closing the browser) and `sessionStorage` (cleared on tab close),
  based on a "remember me" checkbox. This is a real, common security/UX tradeoff: `localStorage` is
  more convenient (stay logged in) but a token sitting there longer is a slightly bigger risk if the
  device is compromised.

- **React Context (`createContext`/`useContext`)** — this is a React feature for sharing data (like
  "who's logged in") across many components *without* manually passing it down as props through
  every layer in between ("prop drilling"). `AuthProvider` wraps your whole app in
  [client/src/App.jsx](client/src/App.jsx) so any page can call `useAuth()` and instantly get
  `{ user, isAdmin, ... }`.

- **`onAuthStateChange`** — this is a **subscription/listener pattern**: instead of your app
  repeatedly asking "am I still logged in?", Supabase pushes an event whenever the login state
  changes (login, logout, token refresh), and your code reacts to it. This is the same underlying
  idea as addEventListener in plain JS — you register a callback once, it fires whenever relevant.

- **Client-side admin checks are a UX convenience, not real security.** `checkAdmin()` reads
  `is_admin` from the `profiles` table to decide whether to show admin UI. But *hiding a button in
  React doesn't stop someone from calling the Supabase API directly.* The real enforcement has to
  be an RLS policy on the server side (e.g., "only rows where `is_admin = true` may update
  `games`"). Client-side checks control what's *shown*; RLS controls what's *allowed*. Worth
  double-checking this distinction exists for every admin-only action in your schema.

---

## 5. Deployment: What "Pushing to Main" Actually Triggers

- **Vercel** watches your GitHub repo. When `main` gets a new commit, Vercel automatically: runs
  `vite build` (turns your React source into optimized static HTML/JS/CSS), then serves those
  static files from a global CDN (a network of servers around the world, so users load the site
  from a nearby location instead of one distant server). This is called **CI/CD** (Continuous
  Integration / Continuous Deployment) — the "deploy on every push to main" automation.

- Your two-branch setup (`dev` for active work, `main` = production) is a lightweight version of
  a **git branching strategy**: you can break things on `dev` freely, and `main` only gets updated
  (via merge) once you're confident. This is *why* it matters to never push straight to `main` —
  it's the live site.

- **Environment variables differ per environment.** Vercel has its own copy of `VITE_SUPABASE_URL`
  etc. configured in its dashboard (separate from your local `.env` file), pointing at your
  production Supabase project instead of local/dev.

---

## 6. Playwright — What It Is and Why It's in `.mcp.json`

Check [.mcp.json](.mcp.json):

```json
"playwright": { "command": "npx", "args": ["@playwright/mcp@latest", "--device", "iPhone 15"] }
```

Important distinction: **this isn't a testing framework you've written tests in** — there's no
`tests/` folder with Playwright test files in this repo. What's configured here is the **Playwright
MCP server**, a tool that lets an AI assistant (me) drive a real, actual Chromium browser: navigate
to a page, click buttons, fill forms, read what's on screen, take screenshots — the same actions a
human tester would do, but scriptable and inspectable. The `--device "iPhone 15"` flag means it's
simulating a real iPhone's screen size/viewport, which matters since your site (a booking app
people use on the go) needs to work on mobile.

The general concept, though, is worth knowing regardless of the MCP wrapper: **browser automation /
end-to-end (E2E) testing**. The idea is that unit tests check individual functions in isolation,
but E2E tests check *the whole system working together* — does clicking "Join Game" on the real
rendered page actually deduct wallet balance and update the UI? Playwright (and tools like it,
e.g. Cypress, Selenium) automate a real browser to answer that question. If you ever want *repeatable,
committed* tests (not just me poking at the live app), that would mean adding Playwright as a dev
dependency in `client/package.json` and writing `.spec.ts` test files — a good next step once the
app's core flows stabilize.

---

## 7. Vocabulary Cheat Sheet

A quick-reference for terms that show up across this stack:

| Term | Plain-English meaning |
|---|---|
| **API** | A defined way for one piece of software to ask another for data/actions. Supabase auto-generates one over your Postgres tables. |
| **REST** | A common style of API where you GET/POST/PATCH/DELETE to URLs representing "resources" (e.g. `/games/5`). |
| **JWT** | A signed token proving identity/claims without needing to re-check a password every request. |
| **RLS (Row Level Security)** | Postgres feature: per-row rules on who can read/write, enforced by the database itself. |
| **Migration** | A versioned, ordered SQL script that changes the database schema over time. |
| **Idempotent** | Running an operation twice has the same effect as running it once. |
| **SPA (Single-Page App)** | One HTML page; JS swaps content in-place instead of full page reloads. |
| **CDN** | A network of geographically distributed servers caching your static files close to users. |
| **CI/CD** | Automatically building/testing/deploying code on every push. |
| **Hooks (React)** | Functions like `useState`/`useEffect`/`useContext` that let you "hook into" React's rendering/lifecycle from function components. |
| **Environment variable** | A config value (URL, key) injected at build/run time instead of hardcoded, so the same code can point at different environments (dev/prod). |
| **E2E test** | A test that drives the real, fully-assembled app (often via a real browser) rather than an isolated function. |
| **MCP (Model Context Protocol)** | The standard letting an AI assistant call external tools (like a real browser via Playwright) in a structured way. |

---

## How to Use This File

When you hit code you don't understand, don't just accept the AI's output — come back here, or ask
"explain this like the notes file, but for X." Good follow-up questions as you keep building:
- "Show me the actual RLS policy on `wallet_transactions` and explain what it blocks."
- "Walk me through what happens, request by request, when I click 'Join Game'."
- "Why does `game_players` exist as a separate table instead of a column on `games`?" (this one's
  about **relational database normalization** — worth a dedicated read when you're ready.)
