# Adam's House Reservation Manager

A 100% free-hostable vacation rental reservation manager for tracking bookings, guest details, check-in/check-out dates, automatic nights, totals, deposits, remaining balances, reservation status, calendar occupancy, and dashboard metrics.

The app is now a pure static frontend and can be deployed with **GitHub Pages** only. Data is stored in the **Supabase free tier** through the Supabase JavaScript client loaded from a CDN.

## Features

- Pure HTML/CSS/JavaScript frontend
- GitHub Pages hosting, with no Node.js, Express, Docker, Railway, MySQL, or paid server
- Supabase free tier database
- Supabase client library from CDN
- Reservation calendar by month
- Add, edit, and delete reservations
- Guest information: full name, phone, email, adults, children, and notes
- Check-in and check-out dates
- Automatic number of nights calculation
- Total amount, deposit paid, and automatic remaining amount
- Reservation status: Pending, Confirmed, Paid, Cancelled
- Dashboard with upcoming reservations, monthly revenue, occupancy rate, and remaining amount to collect
- Mobile-first responsive UI

## Project structure

```text
.
├── index.html          # Static GitHub Pages entry point
├── styles.css          # Responsive app styling
├── app.js              # Supabase-powered calendar, form, CRUD, and dashboard logic
├── supabase/schema.sql # Supabase/PostgreSQL table, indexes, triggers, and RLS policies
├── .nojekyll           # Keeps GitHub Pages from processing the site with Jekyll
└── README.md
```

## 1. Create the free Supabase database

1. Go to <https://supabase.com> and create a free project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql), paste it into the SQL Editor, and run it.
4. Open **Project Settings > API**.
5. Copy these two values:
   - **Project URL**
   - **anon public key**

## 2. Connect the frontend to Supabase

Open [`app.js`](app.js) and replace the placeholders at the top:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

with your Supabase values:

```js
const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```

`APP_CURRENCY` is set to `EUR` by default; change it if you manage reservations in another currency.

The anon key is expected to be public in a browser app. The included schema enables Row Level Security and adds public CRUD policies so the app works from GitHub Pages without a backend server. If the GitHub Pages URL should not be publicly editable, add Supabase Auth later and replace the public policies with owner-only policies.

## 3. Test locally without Node.js

Because browser security can block CDN/database requests from `file://`, run any simple static file server from the repository root. For example, if Python is available:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

This local test server is only for development. GitHub Pages hosts the same static files for free.

## 4. Deploy for free on GitHub Pages

1. Commit and push this repository to GitHub.
2. In GitHub, open **Settings > Pages**.
3. Under **Build and deployment**, choose:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or your deployment branch)
   - **Folder**: `/ (root)`
4. Click **Save**.
5. GitHub Pages will publish the app at a URL similar to:

   ```text
   https://your-username.github.io/reservation-vacance/
   ```

The app uses relative asset paths (`./styles.css` and `./app.js`), so it works correctly from a GitHub Pages project subpath.

## Notes

- Nights are calculated from check-in to check-out dates in the browser and stored as a generated column in Supabase.
- Remaining amount is calculated as `total_amount - deposit_paid` and never goes below zero.
- Cancelled reservations are excluded from dashboard revenue, occupancy, and upcoming reservations.
- Occupancy rate is calculated for the current calendar month from non-cancelled occupied nights.
- There is no paid server and no MySQL database dependency.
