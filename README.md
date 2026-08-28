# Bolahh — Futsal Booking Platform

A futsal match booking and player progression platform for Malaysia. Find open games near you, book a slot, and show up and play — no group chats needed. Live at **[bolahh.com](https://bolahh.com)**.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7 |
| Routing | React Router 7 |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Styling | Custom CSS — dark theme, CSS variables |
| Fonts | Bebas Neue, DM Sans, Space Mono |
| Analytics | @vercel/analytics |
| Hosting | Vercel (auto-deploy on push to `main`) |
| Domain | bolahh.com (Cloudflare) |
| Email | Resend SMTP via Cloudflare Email Routing |
| Payments | ToyyibPay (Supabase Edge Functions) |

---

## Features

### Game Booking
- Browse games with search, area filter, format filter, and 14-day date strip
- Join a game → wallet deducted → slot reserved instantly
- Games lock (unclickable) 10 minutes before start
- Games with too few players are auto-deleted at start time
- Player list visible on game detail page

### Bolahh Card (FIFA-style)
- Every player has a card with 6 stats: **PAC / SHO / PAS / DRI / DEF / PHY**
- OVR (0–99) = average of the 6 stats
- Card theme upgrades automatically across 4 tiers: **Novis → Gangsa → Perak → Emas**
- Stats are rated per-game by an admin with Bayesian smoothing to prevent wild swings
- Download or share your card as an image (rendered client-side via `html2canvas` / Canvas2D)

### Card Borders
- Cosmetic border overlays, separate from the rank-based card theme
- Unlocked automatically via a DB trigger when a player crosses a threshold (`games_played`, `mvp_count`, or `podium_count`)
- 7 built-in borders (common → legendary rarity) plus admin-uploadable custom border art — new borders need no code deploy, just a catalog row
- Equipped border renders on the profile card, leaderboard row, and game roster

### Progression
- Personal growth chart tracking OVR / rank history over time (`/progression`)

### Rank System (10 tiers, OVR-based)

| Rank | OVR | Colour |
|------|-----|--------|
| Novis | 0–30 | Steel blue-grey |
| Gangsa III / II / I | 31–60 | Bronze |
| Perak III / II / I | 61–79 | Bright icy silver |
| Emas III / II / I | 80–99 | Gold |

### Leaderboard
- Global ranking of all players sorted by OVR, highest first
- Top 3 earn gold / silver / bronze medals
- Filterable by area and position

### Post-Match Rating (Admin)
4-step flow: session setup → team assignment → match schedule → per-player stat rating. Progress is auto-saved to `localStorage` so a phone screen-off or browser refresh does not lose work.

### Game Feedback (Player)
After a game, players rate teammates and the venue via tagged feedback (positive/negative player tags, venue tags) at `/game/:id/feedback`.

### Baller Info
A reference page (`/baller-info`) explaining how each stat (PAC/SHO/PAS/DRI/DEF/PHY) is earned during a match.

### Friends System
Send / accept / reject friend requests and view friends' Bolahh Cards.

### Wallet
Top-up via ToyyibPay (RM 5 – RM 100). Balance deducted on game join; all transactions logged.

### Verified Badge
Players with an active Bolahh subscription get a blue verified badge next to their name across the leaderboard, game player list, and friends page.

### Manager Dashboard
Create and delete fields (with image uploads) and games. View/manage players joined per game (`/manager/game/:id/players`) and navigate to the rating page per game. A guided walkthrough (`/manager/walkthrough`) onboards new managers.

### Admin Panel (Super Admin)
Manage homepage banners, fields, card backgrounds, and a custom FIFA-card maker with downloadable output.

---

## Pages & Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing | Public |
| `/login` | Login | Public |
| `/signup` | Sign Up | Public |
| `/reset-password` | Reset Password | Public |
| `/terms` | Terms & Conditions | Public |
| `/home` | Home (game browser) | Public |
| `/game/:id` | Game Detail | Public |
| `/wallet/topup` | Wallet Top-Up | Auth required |
| `/game/:id/checkout` | Checkout | Auth required |
| `/game/:id/cancel` | Cancel Booking | Auth required |
| `/game/:id/feedback` | Post-Game Feedback | Auth required |
| `/profile` | Profile & Bolahh Card | Auth required |
| `/progression` | Progression (growth chart) | Auth required |
| `/friends` | Friends | Auth required |
| `/leaderboard` | Leaderboard | Auth required |
| `/guide` | Guide & Help | Auth required |
| `/baller-info` | Baller Info | Auth required |
| `/subscription` | Subscription | Auth required |
| `/game/:id/rate` | Post-Match Rating | Admin only |
| `/manager` | Manager Dashboard | Admin only |
| `/manager/walkthrough` | Manager Walkthrough | Admin only |
| `/manager/game/:id/players` | Game Player Manager | Admin only |
| `/admin` | Admin Panel | Super admin only |

---

## Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/amirchoo/bolahh.git
cd bolahh
```

### 2. Install dependencies
```bash
cd client
npm install
```

### 3. Set up environment variables

Create a `.env` file inside the `client` folder:
```bash
cp .env.example .env
```

Fill in your values:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Email of the super admin account — gates access to /admin
VITE_SUPER_ADMIN_EMAIL=youremail@example.com

# ToyyibPay — use https://dev.toyyibpay.com for sandbox testing
VITE_TOYYIBPAY_BASE_URL=https://toyyibpay.com
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in Supabase → **Project Settings → API**.

### 4. Run locally
```bash
npm run dev
```

App runs at `http://localhost:5173`

---

## Deployment

Hosted on [Vercel](https://vercel.com). To deploy your own:

1. Import the repo on Vercel
2. Set **Root Directory** to `client`
3. Add all environment variables from `.env` above in Vercel → **Project Settings → Environment Variables**
4. Deploy

After deploying, update Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://your-domain.com`
- **Redirect URLs:** `https://your-domain.com/reset-password`

---

## Admin SQL

### Make a user admin (can create games and rate matches)
```sql
UPDATE public.profiles
SET is_admin = true
WHERE email = 'youremail@example.com';
```

### Make a user super admin (access to /admin panel)
Super admin access requires two things:
1. The profile `name` column must be set to `bolahhadmin`
2. The account email must match `VITE_SUPER_ADMIN_EMAIL` in your `.env`

```sql
UPDATE public.profiles
SET name = 'bolahhadmin'
WHERE email = 'youremail@example.com';
```

### Fix fields table RLS (allow admins to edit any field)
```sql
CREATE POLICY "Admins can update any field" ON fields
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

### Reset a player's stats
```sql
UPDATE profiles SET total_points = 0, games_played = 0 WHERE email = 'player@example.com';
```

---

## Security

Bolahh uses Supabase with the public anon key on the client — all data access is controlled by **Row Level Security (RLS)** policies. Key points:

- **`/admin` is double-gated**: the React route requires `isSuperAdmin`, which cross-checks both the profile `name` field *and* the Supabase auth email (`VITE_SUPER_ADMIN_EMAIL`). Changing your display name alone is not enough.
- **`/manager` and `/game/:id/rate`** require `is_admin = true` in the `profiles` table, set only via SQL.
- **Wallet balance** must not be directly updatable by users via RLS. Ensure your `profiles` update policy restricts the `wallet_balance` column to server-side operations only.
- The anon key is intentionally public (standard Supabase pattern). Security relies entirely on RLS being correctly configured.

---

## Roadmap

- [ ] Edit games from manager panel
- [ ] Notifications (game full, game reminders)
- [ ] Mobile app

---

## TODO (Personal)

- [ ] Change overall text description
- [ ] Make a description for each rank
- [ ] Check the logic
- [ ] Check all changes and if it affects anything before this
- [ ] Re test system

---

## License

MIT
