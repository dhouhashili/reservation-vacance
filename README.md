# Adam's House Reservation Manager

A complete mobile-first vacation rental management application for tracking bookings, guest contact details, totals, deposits, remaining balances, reservation status, occupancy, and monthly revenue.

## Features

- Responsive iPhone and Android friendly web UI
- Node.js + Express backend
- MySQL database with a ready-to-run schema
- Reservation calendar by month
- Add, edit, and delete reservations
- Guest information: full name, phone, email, adults, children
- Automatic number of nights calculation
- Automatic remaining amount calculation from total and deposit
- Reservation status: Pending, Confirmed, Paid, Cancelled
- Dashboard with upcoming reservations, monthly revenue, occupancy rate, and amount remaining to collect
- Docker and Railway deployment support

## Project structure

```text
.
├── db/schema.sql              # MySQL database schema
├── src/db/init.js             # Schema initialization script
├── src/db/pool.js             # MySQL connection pool
├── src/routes/reservations.js # Reservation API and dashboard metrics
├── src/public/index.html      # Mobile-first UI
├── src/public/styles.css      # Modern responsive styling
├── src/public/app.js          # Frontend calendar, forms, and API calls
├── src/server.js              # Express application entry point
├── Dockerfile
├── docker-compose.yml
├── railway.json
├── package.json
└── .env.example
```

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and update the values if needed:

   ```bash
   cp .env.example .env
   ```

3. Start MySQL and create the schema:

   ```bash
   npm run db:init
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open <http://localhost:3000>.

## Docker setup

Run the full application stack with MySQL:

```bash
docker compose up --build
```

Then open <http://localhost:3000>.

## API endpoints

- `GET /api/health` - Health check
- `GET /api/reservations` - List reservations
- `GET /api/reservations/dashboard` - Dashboard metrics
- `POST /api/reservations` - Create a reservation
- `PUT /api/reservations/:id` - Update a reservation
- `DELETE /api/reservations/:id` - Delete a reservation

## Railway deployment

1. Create a Railway project.
2. Add a MySQL database service.
3. Add these environment variables to the web service:
   - `PORT`
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
4. Deploy the repository. Railway uses `railway.json` and starts the app with `npm start`.
5. Run `npm run db:init` once from a Railway shell or job to initialize the schema.

## Notes

- Occupancy rate is calculated for the current month from non-cancelled occupied nights.
- Remaining amount is stored as `total_amount - deposit_paid` and never goes below zero.
- Nights are calculated from check-in and check-out dates on both frontend and backend.
