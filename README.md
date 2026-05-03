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

### Bolahh Card (FIFA-style)
- Every player has a card with 6 stats: **PAC / SHO / PAS / DRI / DEF / PHY**
- OVR (0–99) = average of the 6 stats
- Card theme upgrades automatically across 4 tiers: **Novis → Gangsa → Perak → Emas**
- Stats are rated per-game by an admin with Bayesian smoothing to prevent wild swings

### Rank System (10 tiers, OVR-based)

| Rank | OVR |
|------|-----|
| Novis | 0–30 |
| Gangsa III / II / I | 31–60 |
| Perak III / II / I | 61–79 |
| Emas III / II / I | 80–99 |

### Post-Match Rating (Admin)
4-step flow: session setup → team assignment → match schedule → per-player stat rating.

### Friends System
Send / accept / reject friend requests and view friends' Bolahh Cards.

### Wallet
Top-up via ToyyibPay (RM 5 – RM 100). Balance deducted on game join; all transactions logged.

### Manager Dashboard
Create and delete fields (with image uploads) and games. Navigate to the rating page per game.

---

## Pages & Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing | Public |
| `/login` | Login | Public |
| `/signup` | Sign Up | Public |
| `/reset-password` | Reset Password | Public |
| `/home` | Home (game browser) | Auth required |
| `/game/:id` | Game Detail | Auth required |
| `/game/:id/checkout` | Checkout | Auth required |
| `/profile` | Profile & Bolahh Card | Auth required |
| `/friends` | Friends | Auth required |
| `/wallet/topup` | Wallet Top-Up | Auth required |
| `/guide` | Guide | Auth required |
| `/subscription` | Subscription | Auth required |
| `/game/:id/rate` | Post-Match Rating | Admin only |
| `/manager` | Manager Dashboard | Admin only |
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

Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these in Supabase → **Project Settings → API**.

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
3. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

After deploying, update Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://your-domain.com`
- **Redirect URLs:** `https://your-domain.com/reset-password`

---

## Admin SQL

### Make a user admin
```sql
UPDATE public.profiles
SET is_admin = true
WHERE email = 'youremail@example.com';
```

### Reset a player to Novis
```sql
UPDATE profiles SET total_points = 0, games_played = 0 WHERE email = 'player@example.com';
```

---

## Roadmap

- [ ] Game summary screen after rating submission
- [ ] Player list visible on game detail page
- [ ] Edit games from manager panel
- [ ] Notifications (game full, reminders)
- [ ] Mobile app

---

## License

MIT
