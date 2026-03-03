# ⚽ Bolahh — Futsal Booking Platform

A futsal match booking platform for Malaysia. Find open games near you, book a slot, and show up and play — no group chats needed.

---

## 🚀 Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (Auth, Database, Storage)
- **Routing:** React Router DOM
- **Styling:** Custom CSS
- **Fonts:** Bebas Neue, DM Sans, Space Mono

---

## 📦 Installation

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

Then fill in your Supabase credentials:
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

## 🔑 Making a User Admin

Run this in the Supabase SQL Editor:
```sql
update public.profiles
set is_admin = true
where email = 'youremail@example.com';
```

---

## 🌍 Deployment

Hosted on [Vercel](https://vercel.com). To deploy your own:

1. Import the repo on Vercel
2. Set **Root Directory** to `client`
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

After deploying, update Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://bolahh.com`
- **Redirect URLs:** `https://bolahh.com/reset-password`

---

## 🛣️ Roadmap

- [ ] Payment integration
- [ ] Player list on game detail page
- [ ] Edit games from admin panel
- [ ] Notifications (game full, reminders)
- [ ] Mobile app

---

## 📄 License

MIT
