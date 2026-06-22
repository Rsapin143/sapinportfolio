# Rod Admin Portfolio — HTML/CSS/JS + Supabase Realtime

This version keeps the same UI/UX as the static version, but saves data to Supabase so updates appear on different devices.

## What is included

```text
rod-admin-supabase/
├── index.html
├── assets/
│   ├── css/style.css
│   ├── js/app.js
│   └── js/supabase-config.js
├── database/
│   └── supabase.sql
└── uploads/
    ├── profile/
    └── videos/
```

## Setup

### 1. Create a Supabase project

Go to Supabase and create a new project.

### 2. Run the SQL

Open:

```text
database/supabase.sql
```

Copy everything and paste it into:

```text
Supabase Dashboard → SQL Editor → New query → Run
```

This creates:

- `site_settings` table for profile and works data
- Realtime support for updates
- `portfolio-media` storage bucket for profile images and videos

### 3. Add your Supabase URL and anon key

Open:

```text
assets/js/supabase-config.js
```

Replace:

```js
window.SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
window.SUPABASE_ANON_KEY = 'YOUR-SUPABASE-ANON-KEY';
```

With your real values from:

```text
Supabase Dashboard → Project Settings → API
```

### 4. Run locally

You can open `index.html` directly, or run a simple server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Login

```text
Email: rodolfo@gmail.com
Password: rod123
```

## Important security note

This simple static version uses the public Supabase anon key and permissive policies so it works without a backend. That means anyone who knows how to inspect your site could update the data. For real production use, upgrade to Supabase Auth and admin-only RLS policies.
