# Bolahh — Project Setup Summary

## Overview
Bolahh is a futsal match booking platform for Malaysia, live at **bolahh.com**.

---

## What Was Built

### App Features
- Landing page with stats and feature cards
- Signup with email confirmation flow
- Login with forgot password and reset flow
- Home page with game cards, search, area and format filters
- Game detail page with image gallery, facilities, rules and join button
- Profile page with avatar, editable username, position, upcoming and past games
- Admin panel to add and delete fields and games
- Dark mode UI with pitch pattern background

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Routing | React Router DOM |
| Backend | Supabase (Auth, Database, Storage) |
| Styling | Custom CSS — dark theme |
| Fonts | Bebas Neue, DM Sans, Space Mono |

---

## Infrastructure

### Domain
- **bolahh.com** purchased on Cloudflare Registrar

### Hosting
- Code on GitHub at **amirchoo/Bolahh**
- Deployed on **Vercel**, connected to bolahh.com
- Auto-deploys on every push to main branch

### Email (Outgoing)
- **Resend** handles all outgoing emails from admin@bolahh.com
- Connected to Supabase via custom SMTP (smtp.resend.com, port 465)
- Free tier: 3,000 emails/month

### Email (Incoming)
- **Cloudflare Email Routing** forwards admin@bolahh.com to personal inbox

### Supabase Settings
- Site URL: https://bolahh.com
- Redirect URL: https://bolahh.com/reset-password
- Custom SMTP enabled via Resend
- All 4 email templates styled to match Bolahh dark theme

---

## Database Tables
- **profiles** — user info, username, position, avatar, is_admin flag
- **fields** — futsal field info, images, facilities
- **games** — match listings linked to fields
- **game_players** — tracks who joined which game

## Storage Buckets
- **field-images** — field photos (public)
- **avatars** — user profile pictures (public)

---

## Making a User Admin
```sql
update public.profiles
set is_admin = true
where email = 'youremail@example.com';
```

---

## Roadmap
- [ ] Payment integration
- [ ] Player list on game detail page
- [ ] Edit games from admin panel
- [ ] Notifications
- [ ] Mobile app
