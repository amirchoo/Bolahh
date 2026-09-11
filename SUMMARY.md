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
| i18n | react-i18next + i18next-browser-languagedetector |
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

Rank tier controls the visual theme of a player's Bolahh Card and any rank-related UI elements. Colors are defined once as `CARD_COLOR_THEMES` in `client/src/components/FifaCard.jsx` and shared by the live card, `cardCanvas.js` (the static PNG generator used for the save/share modal), and the border catalog UI — no per-surface color duplication.

| Tier | OVR Range | Card Background | Border / Accent | Text |
|------|-----------|-----------------|-----------------|------|
| **Novis** | 0–30 | `linear-gradient(145deg, #2a2d30, #3d4144, #2a2d30)` | `#555` | `#e8e9eb` |
| **Gangsa** (III–I) | 31–60 | `linear-gradient(145deg, #7c4a1a, #cd7f32, #7c4a1a)` | `#cd7f32` | `#2a1400` |
| **Perak** (III–I) | 61–79 | `linear-gradient(145deg, #6e7378, #d6d9dc, #6e7378)` | `#b0b4b8` | `#202224` |
| **Emas** (III–I) | 80–99 | `linear-gradient(145deg, #b8860b, #fad40f, #b8860b)` | `#fad40f` | `#3a2a00` |

- **Novis** — dark grey, muted. Card stats are hidden with `—` until the first rated game.
- **Gangsa** — warm bronze gradient. Dark text on a copper-brown background.
- **Perak** — neutral silver/steel gradient. Dark charcoal text on a light-grey background.
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
- `main` branch = production, `dev` branch = active development, feature branches (e.g. `feature/card-redesign`) branched off `dev`
- Auto-deploys on push to `main`

### Supabase Settings
- Site URL: https://bolahh.com
- Redirect URL: https://bolahh.com/reset-password
- Custom SMTP via Resend (smtp.resend.com, port 465)
- All email templates styled to match Bolahh dark theme
- pg_cron jobs scheduled via migrations (e.g. expiring stale pending direct-pay bookings, feedback-notification nudges)

### ToyyibPay (Payments)
Supabase Edge Functions handle the wallet top-up and direct game payment flow, including `create-toyyibpay-bill`, `toyyibpay-callback`, `verify-toyyibpay-payment`, and `expire-pending-game-payments` (verifies a pending bill against ToyyibPay before expiring it, so a late/failed webhook can't wipe a paid booking).

---

## Pages & Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/signup` | SignupPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/terms` | TermsPage | Public |
| `/home` | HomePage | Auth required |
| `/game/:id` | GameDetailPage | Public |
| `/game/:id/checkout` | GameCheckoutPage | Auth required |
| `/game/:id/cancel` | GameCancelPage | Auth required |
| `/game/:id/feedback` | GameFeedbackPage | Auth required |
| `/profile` | ProfilePage | Auth required |
| `/progression` | ProgressionPage | Auth required |
| `/friends` | FriendsPage | Auth required |
| `/leaderboard` | LeaderboardPage | Auth required |
| `/wallet` | WalletHistoryPage | Auth required |
| `/wallet/topup` | WalletTopupPage | Auth required |
| `/guide` | GuidePage | Auth required |
| `/baller-info` | BallerInfoPage | Auth required |
| `/subscription` | SubscriptionPage | Auth required |
| `/game/:id/rate` | GameRatingPage | Admin only |
| `/manager` | ManagerPage | Admin only |
| `/manager/walkthrough` | ManagerWalkthroughPage | Admin only |
| `/manager/game/:id/players` | GameManagerPlayersPage | Admin only |
| `/admin` | AdminPage | Super admin only |

---

## App Features

### Game Booking
- Browse games with search, area filter, format filter, 14-day date strip
- Game cards lock (unclickable, show "Game Filled") 10 minutes before start
- Join game → wallet deducted → slot reserved
- Games with fewer than the minimum players are auto-deleted at start time
- Direct game payment (pay-at-court or ToyyibPay) alongside wallet payment
- Game cancellations and post-game feedback (incl. sportsmanship tags, manager rating) flows

### Bolahh Card (FIFA-style)
- Every player has a card with 6 stats: **PAC / SHO / PAS / DRI / DEF / PHY**
- OVR = average of the 6 stats (0–99)
- OVR determines rank tier (see rank table below)
- Individual stats are rated per-game by the admin; Bayesian smoothing prevents wild swings from single games
- With no game history, all 6 stats default to 30 (Novis baseline)
- Card theme (Novis / Gangsa / Perak / Emas) upgrades automatically when OVR crosses a tier threshold
- Admins can force any tier for their own card via `card_design_override` (cosmetic only, self-service, doesn't affect real stats)
- Tapping the card on the profile page opens a save/share modal; the shareable image is generated by `client/src/lib/cardCanvas.js` on a `<canvas>`, drawn in the live card's own native coordinate space and color theme so it's pixel-accurate to the on-screen card (not html2canvas, to avoid CORS/border-radius issues)

### Achievement Badges
- Admin-curated diamond-shaped badges (match/MVP/ranked type, common/rare/epic/legendary rarity) shown down the right edge of a player's card
- Stored as an ordered JSON array (`profiles.achievement_badges`); array order is display order
- Purely cosmetic, admin-curated only — not earned automatically

### Card Borders (collectible cosmetics)
- An overlay layer on top of a player's card, independent of the rank-based color theme
- Earned automatically from lifetime milestones tracked on `profiles` (`games_played`, `mvp_count`, `podium_count`) via a DB trigger, and equipped by the player (`profiles.equipped_border`)
- Catalog lives in `card_border_catalog` (DB-driven, so admins can add custom-artwork borders from the admin panel without a code deploy) — 7 built-in "procedural" borders are still code-drawn from `client/src/lib/borderCatalog.js`

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
4. **Rate Players** — per-player stat counters (SHO / PAS / DRI / DEF / PHY / PAC + bonus), plus MVP/podium ("Bolahh Awards") picks that roll up into border-unlock counters

### Multi-Language Support
- EN / BM (Bahasa Malaysia) toggle persisted in localStorage
- Language toggle button in Navbar, Landing page nav, Login, and Signup
- Translation files: `client/src/locales/en.json` and `client/src/locales/ms.json`
- Pages translated: Navbar, LandingPage, LoginPage, SignupPage, HomePage, ProfilePage
- Remaining pages (GameDetailPage, GuidePage, etc.) use same `useTranslation()` pattern

### Friends System
- Send / accept / reject friend requests
- View friends' Bolahh Cards

### Wallet
- Balance and transaction history shown at `/wallet`
- Top-up via ToyyibPay (RM 5 – RM 100) at `/wallet/topup`
- Deducted on game join; all transactions logged in `wallet_transactions`

### Manager Dashboard (Admin)
- Create / delete fields (with image uploads)
- Create / delete games, assign a manager per game
- Navigate to rating page per game
- Manager business card: separate avatar from the player profile picture (`profiles.manager_card_avatar_url`), plus a satisfaction score (0–10) derived from an optional "how was your manager?" rating folded into post-game feedback; new managers with no ratings default to 10/10

### Admin Panel (Super Admin)
- Platform-level management at `/admin`

### Notifications
- In-app notifications table with DB triggers for events like new friend requests and new games, plus a scheduled cron nudge for unread post-game feedback prompts

---

## Database Tables

| Table | Key Columns |
|-------|-------------|
| `profiles` | id, email, username, position, avatar_url, is_admin, wallet_balance, total_points (OVR 0–99), games_played, card_stats (JSON), card_design_override, achievement_badges (JSON), equipped_border, mvp_count, podium_count, manager_card_avatar_url |
| `fields` | id, created_by, name, area, address, field_rules, images (JSON), facilities (booleans), maps_url |
| `games` | id, field_id, created_by, assigned_manager_id, title, area, format (5v5/6v6/7v7), date, time, slots, price, description, game_rules, shoes_type |
| `game_players` | id, game_id, user_id, joined_at, team_assignment (A/B/C), checked_in_at, amount_paid |
| `game_ratings` | game_id, user_id, rated_by, goals, assists, good_defending, good_keeping, successful_dribble, good_chance, good_manner, admin_bonus (Bolahh Award pick) |
| `game_feedback` | game_id, user_id, sportsmanship tags, manager_rating (1–5) |
| `game_requests` | requests to open/host a game in an area |
| `friend_requests` | sender_id, receiver_id, status (pending/accepted/rejected) |
| `wallet_transactions` | user_id, type, amount, description, balance_after |
| `user_borders` | user_id, border_key, unlocked_at — borders a player has unlocked |
| `card_border_catalog` | key, label, rarity, unlock_type, unlock_value, unlock_label, image_url — DB-driven border definitions |
| `notifications` | user_id, type, payload, read_at |

## Storage Buckets

| Bucket | Access |
|--------|--------|
| `field-images` | Public |
| `avatars` | Public |
| `card-borders` | Public (admin-uploaded border artwork) |

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
- [ ] Mobile app
