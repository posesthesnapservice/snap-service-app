# SNAP SERVICE APP - COMPLETE SETUP & DISASTER RECOVERY GUIDE

Yeh guide is liye tayyar ki gayi hai taake mustaqbil (future) mein jab bhi aapko app ko kisi bilkul naye account (Vercel, Supabase, ya GitHub) par dobara shift ya setup karna ho, to aap sirf is document ko follow kar ke 10-15 minute mein pura setup bina kisi data loss ke complete kar sakein.

---

## 1. System Architecture Overview

App 4 components par mushtamil hai:
1. **GitHub (`posesthesnapservice/snap-service-app`):** Pura source code aur history.
2. **Vercel (Frontend Hosting):** Next.js 14 app ko host karta hai aur 1,000,000 monthly free CDN requests deta hai.
3. **Supabase (Database):** PostgreSQL cloud database jo poses, reels, users, aur today's shoot records ko store karta hai.
4. **Cloudinary (`cpwt6w5h`):** 25GB free media storage jahan tamam heavy wedding videos (MP4) aur high-res images store hoti hain.

---

## 2. Master Credentials Checklist

Jab bhi aap Vercel par naya project deploy karein, aapko ye **6 Environment Variables** chahiye honge:

| # | Variable Name | Kahan se milegi? | Default / Constant Value |
|---|---|---|---|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Naye Supabase dashboard se | `https://[PROJECT_ID].supabase.co` |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Naye Supabase Project Settings -> API | `eyJhbGci...` (anon public key) |
| 3 | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard | `cpwt6w5h` |
| 4 | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary Upload Settings | `poses preset` |
| 5 | `CLOUDINARY_API_KEY` | Cloudinary Dashboard | `283739613316953` |
| 6 | `CLOUDINARY_API_SECRET` | Cloudinary Dashboard | `2S_U46QvVlCDmJ0142yfWNZ8ZX4` |

---

## 3. Step-by-Step Setup Guide

### STEP 1: Naya Supabase Database Setup

1. **[supabase.com](https://supabase.com)** par jayein aur Sign up karein (nayi email se).
2. **New Project** banayein:
   - Name: `snap-service`
   - Database Password: koi strong password rakh kar note kar lein.
   - Region: *Singapore* ya *Frankfurt*.
3. **SQL Tables Create Karein:**
   - Left sidebar se **SQL Editor** (`>_` icon) par click karein.
   - "New query" open karein.
   - Project mein moujood `supabase_master_setup.sql` ka sara code copy kar k paste karein aur **Run** (Cmd/Ctrl + Enter) dabayein.
   - Is se saare 15 tables aur security policies khud-ba-khud ban jayengi.
4. **API Keys Copy Karein:**
   - Bottom-left se **Project Settings (⚙️) -> API** par jayein.
   - **Project URL** aur **anon public key** copy kar lein.

---

### STEP 2: Data Restore Karna (Zero Data Loss)

Project ke root folder mein 2 files hain:
- `supabase_backup.json` (36 trending reels, 4 user accounts, shoots ka backup)
- `restore_data_to_new_supabase.js` (data restore script)

Terminal mein sirf ye 1 command chalayein:
```bash
node restore_data_to_new_supabase.js <NEW_SUPABASE_URL> <NEW_ANON_KEY>
```
*Yeh command chalte hi 5 second mein sara purana data naye Supabase mein inject ho jayega!*

---

### STEP 3: Naye GitHub Repository par Code Push Karna

1. **[github.com/new](https://github.com/new)** par jayein.
2. Naya repository banayein:
   - Name: `snap-service-app`
   - Visibility: **Private**
   - Kisi box (README / gitignore) ko tick na karein. Click **Create repository**.
3. **GitHub Desktop** kholein:
   - **GitHub Desktop -> Settings -> Accounts** mein ja kar apna naya account sign in karein.
   - Top menu: **Repository -> Repository Settings... -> Remote**
   - URL ko apne naye repo link se replace karein (e.g. `https://github.com/USERNAME/snap-service-app.git`).
   - Click **Save**.
   - Top right par blue button **"Push origin"** dabayein!

---

### STEP 4: Naye Vercel Account par Deploy Karna

1. **[vercel.com](https://vercel.com)** par jayein aur naye account se Sign up karein.
2. **Add New... -> Project** par click karein.
3. Apna GitHub repository (`snap-service-app`) import karein.
4. **Environment Variables** section khol kar section 2 mein diye gaye 6 variables paste karein:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_SUPABASE_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=cpwt6w5h
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=poses preset
CLOUDINARY_API_KEY=283739613316953
CLOUDINARY_API_SECRET=2S_U46QvVlCDmJ0142yfWNZ8ZX4
```
5. Click **Deploy**. App 1 minute mein live ho jayegi.

---

### STEP 5: Custom Domain Link Karna (`poses.thesnapservice.com`)

1. **Purane Vercel se Domain Remove:**
   - Purane Vercel project ke Settings -> Domains mein ja kar `poses.thesnapservice.com` ko Delete/Remove karein.
2. **Naye Vercel mein Domain Add:**
   - Naye Vercel project ke Settings -> Domains mein ja kar `poses.thesnapservice.com` enter kar k Add karein.
3. **Verification (Agar zaroorat ho):**
   - Agar Vercel "Verification Required" bole, to Cloudflare / DNS mein wo jo `TXT` record bataye (Name: `_vercel`, Value: `vc-domain-verify=...`), usko add karein aur Vercel par **Refresh** dabayein.
   - Verify hone ke baad aap DNS se wo `TXT` record dobara delete kar sakte hain.

---

## 4. Local Machine par Project Run Karna

Agar aapko apne Mac par locally app chalani ho:
```bash
# 1. Dependencies install karein
npm install

# 2. Local development server start karein
npm run dev

# Browser mein open karein:
# http://localhost:3000
```

---

## 5. Standalone Backup Archive (`.zip`)

Project ki mukammal backup file repository ke root par moujood hai:
- **File Name:** `snap-service-app-backup.zip`
- **Location:** `/Users/mac/.gemini/antigravity/scratch/snap-service-app/snap-service-app-backup.zip`
- **Included Content:** Pura app code, dark mode design system, iOS build configuration, PWA assets, Cloudinary integration, master SQL script, data backup JSON, aur data restore script.
