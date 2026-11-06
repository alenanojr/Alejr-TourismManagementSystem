# Philippine Tourism – Post-Visit Feedback & Sentiment Analysis

React + Recharts frontend (`client/`) on **Supabase** (`supabase/`). No server of your own:

| Part | Where it runs |
|---|---|
| Database, login, security rules | Supabase (PostgreSQL + Auth + Row Level Security) |
| Destination photos | Supabase Storage bucket `destination-images` (anyone can view, only admins can upload) |
| VADER sentiment analysis | Supabase Edge Function `submit-feedback` |
| Website | `npm run dev` on your computer, or any static host (Vercel, Netlify) |

## Setup

### 1. Create the Supabase project
1. Go to <https://supabase.com/dashboard> and click **New project**.
2. Pick a name and database password, and choose region **Southeast Asia (Singapore)**.

### 2. Create the database
From the project folder in a terminal (VS Code: `` Ctrl+` ``):

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --include-seed
```

`YOUR_PROJECT_REF` is the part of your project URL before `.supabase.co`
(`https://abcd1234.supabase.co` → `abcd1234`).

This applies, in order:

1. `supabase/migrations/20261029000000_init.sql`: tables, security rules, functions
2. `supabase/migrations/20261029030000_richer_stats.sql`: star breakdown, top tags, review filters
3. `supabase/migrations/20261029040000_destination_admin.sql`: photo storage, admin rules for destinations
4. `supabase/seed.sql`: sample destinations (no photos). Admins can edit or delete them later.

You can also paste each file into the dashboard's **SQL Editor**, in that order.

### 3. Deploy the sentiment Edge Function
```powershell
npx supabase functions deploy submit-feedback --use-api
```

### 4. Turn off email confirmation (optional, for testing)
**Authentication → Sign In / Providers → Email** and turn off **Confirm email**. Otherwise every
new account must click the link in its confirmation email before it can log in.

### 5. Connect the website
1. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
2. Copy `client/.env.example` to `client/.env.local` and paste them in:
   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   Never use the `service_role` key here.
3. Run it:
   ```powershell
   cd client
   npm install
   npm run dev
   ```
4. Open <http://localhost:5173>.

### 6. Make yourself an admin
Sign up on the website, then run in **SQL Editor**:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
Log out and back in. Admins see **Analytics**, **Destinations** and **Bookings**.

### 7. Add destinations and photos
**Destinations → Add destination** (or **Edit** on an existing one):

- Photo: JPG, PNG or WebP, up to 5 MB. Destinations without a photo show an empty placeholder.
- Name of the spot, location (city/province), region, type, price per person, description.
- A live preview shows how the card will look to tourists.

Deleting a destination also deletes its bookings and visitor feedback.

### 8. Demo data (optional)
To fill the charts, create one or two tourist accounts first, then run `supabase/seed_demo.sql` in
the SQL Editor. Each tourist gets past trips with feedback, one finished trip waiting for a rating,
and one upcoming trip.

## How feedback works

| Rule | Enforced by |
|---|---|
| Only the booking's owner can rate it | `insert_feedback()` looks the booking up by id **and** user |
| Visit must be over: `visit_date` before today (Asia/Manila) or status `completed`; pending/cancelled never qualify | `booking_is_rateable()` |
| One feedback per booking | `UNIQUE (booking_id)` → "already rated" |
| Rating 1–5, comment of at least 10 characters, tags from the fixed list | Edge Function validation + table `CHECK`s |
| Sentiment is computed only on the backend | The browser has no insert permission on `feedback`; only the Edge Function (service role) can write it, after running VADER |

Labels: `compound >= 0.05` → Positive, `compound <= -0.05` → Negative, otherwise Neutral.

## Tests

```powershell
cd client
npm test
```
