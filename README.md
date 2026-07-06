# Mawasem 🌿

Mawasem is a farm-to-consumer marketplace: local farmers list fresh produce, consumers browse and order it, and both sides track orders through to delivery — including a Talabat-style map location picker for choosing where an order gets delivered.

Bilingual (English / Arabic, full RTL support), built with **Django REST Framework** on the backend and **React + Vite** on the frontend.

## Features

- **Two account types**: consumers (shop) and farmers (sell), with role-based permissions and JWT authentication (register → email verification → login).
- **Product catalog**: categories, search/filter/sort, stock tracking, organic/discount flags.
- **Cart & checkout**: atomic stock deduction, price snapshotting at purchase time.
- **Order lifecycle**: pending → processing → shipped → completed/cancelled, with a full audit history and delivery-method/courier tracking.
- **Delivery location**: consumers save multiple named addresses (Home/Work/Other) picked from a Mapbox map, reuse one at checkout or drop a one-off pin; farmers see the same delivery pin on their order dashboard.
- **Notifications**: buyers are notified on order status changes; farmers are notified on new orders.
- **Farmer dashboard**: manage products, view/update incoming orders, profile & payment settings, revenue metrics.

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Django 6, Django REST Framework, SimpleJWT, django-filter, SQLite (dev) / PostgreSQL (optional) |
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query, React Router |
| Maps | Mapbox GL JS + Mapbox Geocoding / Static Images APIs |
| Testing | pytest + pytest-django + factory_boy |

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- A free [Mapbox](https://account.mapbox.com/) account (for the location picker — optional, everything else works without it)

## Backend setup

```bash
# From the project root
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser   # optional, for /admin/ access
python manage.py runserver
```

The API is now running at `http://127.0.0.1:8000/`, with the Django admin at `/admin/` and the API under `/api/v1/`.

By default the backend uses SQLite with no extra configuration. To use PostgreSQL instead, set these environment variables before running the server:

```bash
USE_POSTGRES=true
DB_NAME=mawasem
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1/
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_public_token_here
```

Get a free Mapbox token at [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/) (a default public token is created for you automatically on signup — no credit card required). Without it, the app still works fully; only the map picker and delivery-pin thumbnails will render blank.

Then start the dev server:

```bash
npm run dev
```

The app is now running at `http://localhost:5173/`.

> **Note:** the backend's CORS config only allows `http://localhost:5173` and `http://localhost:3000` by default (`core/settings/base.py`, `CORS_ALLOWED_ORIGINS`). If Vite starts on a different port (e.g. because 5173 is already in use), either free that port first or add the new port to `CORS_ALLOWED_ORIGINS`.

## Trying it out

1. Go to `http://localhost:5173/signup` and create a **Consumer** account (or a **Farmer** account to list products).
2. Registration sends a verification email — since there's no real mail server configured in development, Django's console email backend prints the email (including the verification link) straight to the terminal running `runserver`. Copy that link into your browser to verify the account.
3. Log in, browse products, add to cart.
4. Go to **My Addresses** to save a delivery location via the map, then check out — you can pick a saved address or drop a fresh pin.
5. If you registered as a farmer, go to **Farmer Dashboard** to add products and manage incoming orders.

## Running tests

```bash
python -m pytest
```

This runs the full backend test suite (apps + top-level `tests/`) using pytest-django, with an in-memory SQLite database — no setup required.

For the frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Project structure

```
apps/
  users/          Auth: registration, email verification, JWT login, password reset
  farmers/        Farmer profiles, farmer-facing product & order management
  products/       Product catalog: categories & products
  carts/          Shopping cart
  addresses/      Saved delivery addresses (map-picked locations)
  orders/         Checkout, order lifecycle, status history
  notifications/  In-app notifications for buyers & farmers
core/             Django project settings, root URLs
frontend/         React + Vite single-page app
```

## API overview

All endpoints are under `/api/v1/`. A few key ones:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register/consumer/` | Register a consumer |
| POST | `/auth/register/farmer/` | Register a farmer |
| POST | `/auth/token/` | Log in (JWT) |
| GET | `/products/` | Browse products |
| POST | `/cart/add/` | Add an item to cart |
| GET/POST | `/addresses/` | List / create saved delivery addresses |
| POST | `/orders/checkout/` | Place an order (via saved address or inline location) |
| GET | `/farmer/orders/` | Farmer's incoming orders |
