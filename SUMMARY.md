# Bolahh — Project Summary

## Overview
Bolahh is a futsal match booking and player progression platform for Malaysia, live at **bolahh.com**.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7 |
| Routing | React Router 7 |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Icons | react-icons, Lucide React |
| Styling | Custom CSS — dark theme |
| Fonts | Bebas Neue, DM Sans, Space Mono |
| Hosting | Vercel (auto-deploy on push to `main`) |
| Domain | bolahh.com (Cloudflare) |
| Email (outgoing) | Resend SMTP — admin@bolahh.com |
| Email (incoming) | Cloudflare Email Routing → personal inbox |
| Payments | ToyyibPay (Supabase Edge Functions) |

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
- **Overall** = `30 + round((totalPoints / 900) × 69)` → 30 at 0 pts, 99 at 900 pts
- Individual stats anchor to the overall and drift ±10 (up to +20 for exceptional performers) based on in-game performance using Bayesian confidence
- With no game history, all 6 stats equal the overall

### Stat Mappings
| Card Stat | Tracks |
|-----------|--------|
| PAC | good_chance (runs / space creation) |
| SHO | goals |
| PAS | assists |
| DRI | successful_dribble |
| DEF | good_defending |
| PHY | good_keeping |

### Rank System (10 tiers)
| Rank | Points |
|------|--------|
| Novis | 0 |
| Gangsa III | 1 – 100 |
| Gangsa II | 101 – 200 |
| Gangsa I | 201 – 300 |
| Perak III | 301 – 400 |
| Perak II | 401 – 500 |
| Perak I | 501 – 600 |
| Emas III | 601 – 700 |
| Emas II | 701 – 800 |
| Emas I | 801 – 900 |

### Points Per Game
| Event | Points |
|-------|--------|
| Attendance | +5 (automatic) |
| Goal | +3 |
| Assist | +2 |
| Good defending | +2 |
| Good keeping | +2 |
| Successful dribble | +2 |
| Good chance | +2 |
| Good manner | +2 |
| Admin bonus | −5 to +5 |

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

| Table | Purpose |
|-------|---------|
| `profiles` | id, email, username, position, avatar_url, is_admin, wallet_balance, total_points, games_played, card_stats |
| `fields` | id, created_by, name, area, address, field_rules, images (JSON), facilities (booleans) |
| `games` | id, field_id, created_by, title, area, format (5v5/6v6/7v7), date, time, slots, price, description, game_rules, shoes_type |
| `game_players` | id, game_id, user_id, joined_at, team_assignment (A/B/C) |
| `game_ratings` | game_id, user_id, rated_by, goals, assists, good_defending, good_keeping, successful_dribble, good_chance, good_manner, admin_bonus, total_points |
| `player_cards` | user_id, pac, sho, pas, dri, def, phy, overall (cached card stats) |
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

### Reset all players to Novis
```sql
UPDATE profiles SET total_points = 0, games_played = 0;
DELETE FROM game_ratings;
DELETE FROM player_cards;
```

---

## Roadmap
- [ ] Game summary screen after rating submission
- [ ] Player list visible on game detail page
- [ ] Edit games from manager panel
- [ ] Notifications
- [ ] Mobile app
