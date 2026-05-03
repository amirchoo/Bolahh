# Bolahh — Project Summary

Bolahh is a futsal match booking and player progression platform for Malaysia, live at **bolahh.com**.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7 |
| Routing | React Router 7 |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Icons | react-icons, Lucide React |
| Styling | Custom CSS — dark theme, CSS variables |
| Fonts | Bebas Neue, DM Sans, Space Mono |
| Analytics | @vercel/analytics |
| Hosting | Vercel (auto-deploy on push to `main`) |
| Domain | bolahh.com (Cloudflare) |
| Email (outgoing) | Resend SMTP — admin@bolahh.com |
| Email (incoming) | Cloudflare Email Routing → personal inbox |
| Payments | ToyyibPay (Supabase Edge Functions) |

---

## Design System

### Colour Palette

| Variable | Hex | Usage |
|----------|-----|-------|
| `--bg` | `#111213` | Page background |
| `--card` | `#1a1b1d` | Card / surface background |
| `--card2` | `#222426` | Elevated card, secondary surface |
| `--border` | `#2e3032` | All borders and dividers |
| `--text` | `#e8e9eb` | Primary text |
| `--muted` | `#6b6d6f` | Secondary / hint text |
| `--accent` | `#F09D51` | Primary orange — CTAs, highlights, active states |
| `--accent-dim` | `#e08a3a` | Hover state for accent |
| `--tomato` | `#F06543` | Destructive actions, gradient pair with accent |
| `--red` | `#e03e1a` | Error states |

The background is a near-black gunmetal (`#111213`) with a subtle SVG pitch-pattern overlay at 7% opacity, fixed to the viewport. The accent orange (`#F09D51`) is the single brand colour used for buttons, active states, rank highlights, and all interactive feedback.

### Typography

| Font | Weight | Role |
|------|--------|------|
| **Bebas Neue** | Regular | Display headings, section titles, card numbers, rank names |
| **DM Sans** | 300 / 400 / 500 / 600 | Body text, descriptions, UI copy |
| **Space Mono** | 400 / 700 | Labels, stat keys, metadata, monospaced data |

Bebas Neue is used exclusively for anything bold and decorative (headings, OVR numbers, rank names). DM Sans handles all readable body copy. Space Mono handles anything data-like — stat abbreviations (PAC, SHO, etc.), OVR ranges, timestamps, and small-caps labels.

### Rank Tier Themes

Rank tier controls the visual theme of a player's Bolahh Card and any rank-related UI elements:

| Tier | OVR Range | Card Background | Border / Accent | Text |
|------|-----------|-----------------|-----------------|------|
| **Novis** | 0–30 | `linear-gradient(145deg, #2a2d30, #3d4144)` | `#555` | `#e8e9eb` |
| **Gangsa** (III–I) | 31–60 | `linear-gradient(145deg, #7c4a1a, #cd7f32)` | `#cd7f32` | `#2a1400` |
| **Perak** (III–I) | 61–79 | `linear-gradient(145deg, #6e7275, #c0c0c0)` | `#c0c0c0` | `#1a1a1a` |
| **Emas** (III–I) | 80–99 | `linear-gradient(145deg, #b8860b, #ffd700)` | `#ffd700` | `#3a2a00` |

- **Novis** — dark grey, muted. Card stats are hidden with `—` until the first rated game.
- **Gangsa** — warm bronze gradient. Dark text on a copper-brown background.
- **Perak** — silver gradient. Dark text on a steel/chrome background.
- **Emas** — gold gradient. Dark amber text on a rich gold background. Glow effects applied.

Cards also carry a `linear-gradient(135deg, rgba(255,255,255,0.12), transparent 55%)` shine overlay on all tiers except Novis.

### Animations

| Class / Keyframe | Effect |
|------------------|--------|
| `fadeUp` | `opacity 0→1` + `translateY(18px→0)` — used on page load |
| `fade-up-1` … `fade-up-4` | Staggered `fadeUp` variants (100ms steps) |
| `reveal` + `visible` | Intersection-observer triggered `fadeUp` for scroll sections |
| `reveal-delay-1/2/3` | 150ms / 300ms / 450ms stagger on `reveal` |
| `bolahh-spin` | Continuous rotation for the logo icon |
| `shimmer-text` | Animated gradient sweep for hero text highlights |
| `rank-pill` | Hover lift + border glow on rank selector pills |
| `cta-btn` | Scale + glow on hover for primary CTA buttons |

---

## Infrastructure

### Hosting & Deployment
- GitHub repo: **amirchoo/Bolahh**
- Deployed on **Vercel**, connected to bolahh.com
- `main` branch = production, `dev` branch = active development
- Auto-deploys on push to `main`

### Supabase Settings
- Site URL: https://bolahh.com
- Redirect URL: https://bolahh.com/reset-password
- Custom SMTP via Resend (smtp.resend.com, port 465)
- All email templates styled to match Bolahh dark theme

### ToyyibPay (Payments)
Three Supabase Edge Functions handle the wallet top-up flow:
- `create-toyyibpay-bill` — creates a payment bill
- `toyyibpay-callback` — receives payment confirmation webhook
- `verify-toyyibpay-payment` — verifies payment status

---

## Pages & Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/signup` | SignupPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/home` | HomePage | Auth required |
| `/game/:id` | GameDetailPage | Auth required |
| `/game/:id/checkout` | GameCheckoutPage | Auth required |
| `/profile` | ProfilePage | Auth required |
| `/friends` | FriendsPage | Auth required |
| `/wallet/topup` | WalletTopupPage | Auth required |
| `/guide` | GuidePage | Auth required |
| `/subscription` | SubscriptionPage | Auth required |
| `/game/:id/rate` | GameRatingPage | Admin only |
| `/manager` | ManagerPage | Admin only |
| `/admin` | AdminPage | Super admin only |

---

## App Features

### Game Booking
- Browse games with search, area filter, format filter, 14-day date strip
- Game cards lock (unclickable, show "Game Filled") 10 minutes before start
- Join game → wallet deducted → slot reserved
- Games with fewer than the minimum players are auto-deleted at start time

### Bolahh Card (FIFA-style)
- Every player has a card with 6 stats: **PAC / SHO / PAS / DRI / DEF / PHY**
- OVR = average of the 6 stats (0–99)
- OVR determines rank tier (see rank table below)
- Individual stats are rated per-game by the admin; Bayesian smoothing prevents wild swings from single games
- With no game history, all 6 stats default to 30 (Novis baseline)
- Card theme (Novis / Gangsa / Perak / Emas) upgrades automatically when OVR crosses a tier threshold

### Stat Mappings

| Card Stat | Tracks |
|-----------|--------|
| PAC | good_chance (runs / space creation) |
| SHO | goals |
| PAS | assists |
| DRI | successful_dribble |
| DEF | good_defending |
| PHY | good_keeping |

### Rank System (OVR-based, 10 tiers)

| Rank | OVR Range |
|------|-----------|
| Novis | 0–30 |
| Gangsa III | 31–39 |
| Gangsa II | 40–49 |
| Gangsa I | 50–60 |
| Perak III | 61–69 |
| Perak II | 70–74 |
| Perak I | 75–79 |
| Emas III | 80–85 |
| Emas II | 86–94 |
| Emas I | 95–99 |

A player must have played at least 1 rated game to move out of Novis regardless of OVR.

### Post-Match Rating (Admin)
4-step flow on `/game/:id/rate`:
1. **Setup** — pick session duration (1h / 1.5h / 2h) and team format (2 or 3 teams)
2. **Assign Teams** — drag players into Team A / B / C
3. **Schedule** — auto-generated match rotation shown with times
4. **Rate Players** — per-player stat counters (SHO / PAS / DRI / DEF / PHY / PAC + bonus)

### Friends System
- Send / accept / reject friend requests
- View friends' Bolahh Cards

### Wallet
- Balance shown on profile
- Top-up via ToyyibPay (RM 5 – RM 100)
- Deducted on game join; all transactions logged

### Manager Dashboard (Admin)
- Create / delete fields (with image uploads)
- Create / delete games
- Navigate to rating page per game

### Admin Panel (Super Admin)
- Platform-level management at `/admin`

---

## Database Tables

| Table | Key Columns |
|-------|-------------|
| `profiles` | id, email, username, position, avatar_url, is_admin, wallet_balance, total_points (OVR 0–99), games_played, card_stats (JSON) |
| `fields` | id, created_by, name, area, address, field_rules, images (JSON), facilities (booleans) |
| `games` | id, field_id, created_by, title, area, format (5v5/6v6/7v7), date, time, slots, price, description, game_rules, shoes_type |
| `game_players` | id, game_id, user_id, joined_at, team_assignment (A/B/C) |
| `game_ratings` | game_id, user_id, rated_by, goals, assists, good_defending, good_keeping, successful_dribble, good_chance, good_manner, admin_bonus |
| `friend_requests` | sender_id, receiver_id, status (pending/accepted/rejected) |
| `wallet_transactions` | user_id, type, amount, description, balance_after |

## Storage Buckets

| Bucket | Access |
|--------|--------|
| `field-images` | Public |
| `avatars` | Public |

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
- [ ] Notifications
- [ ] Mobile app
