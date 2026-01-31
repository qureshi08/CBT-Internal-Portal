# CBT Internal Operations Portal

Internal web app for CBT's daily operations - Event Calendar Management & Honor Shop Wallet System.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open SQL Editor
3. Copy and run all SQL from `DATABASE_SCHEMA.md` (in order)

### 3. Run Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Create Admin User

After signing up, run in Supabase SQL Editor:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your-email@cbt.com';
```

---

## 📁 Project Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx          # Sidebar navigation
│   ├── dashboard/          # ✅ Main dashboard
│   ├── calendar/           # ⏳ TODO - Calendar view
│   ├── events/             # ⏳ TODO - Event management
│   └── wallet/             # ⏳ TODO - Honor Shop
├── login/                  # ✅ Authentication
└── globals.css             # CBT branding
```

---

## ✅ Completed

- ✅ Authentication (login/signup)
- ✅ Role-based access (Employee, Approver, Admin)
- ✅ Dashboard with stats & quick actions
- ✅ Database schema with RLS policies
- ✅ Responsive layout with sidebar

## ⏳ TODO (Phase 1)

- [ ] Event request form
- [ ] Event approval interface
- [ ] Calendar view
- [ ] Wallet management
- [ ] Transaction history

---

## 🔑 Environment Variables

Already configured in `.env.local`:
- Supabase URL
- Supabase Anon Key

---

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables from `.env.local`
4. Update Supabase redirect URLs to production domain

---

## 📚 Documentation

- `DATABASE_SCHEMA.md` - Complete database setup with SQL commands
- `README.md` - This file

---

## 🛠️ Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4** + ShadCN/UI
- **Supabase** (Auth + PostgreSQL)
- **Framer Motion**

---

**CBT © 2026** - Internal Use Only
