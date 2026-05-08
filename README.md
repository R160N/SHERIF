# SHERIFF OIL Website

Premium static multi-page website for SHERIFF OIL.

## Pages

- `index.html` - Home
- `about.html` - About
- `services.html` - Services
- `fuel-prices.html` - Fuel Prices
- `market-cafeteria.html` - Market & Cafeteria
- `location.html` - Location with Google Maps
- `contact.html` - Contact form and details
- `admin/` - Owner dashboard for fuel price updates

## Editing Prices

1. Open `/admin/` directly. This link is intentionally hidden from the public website.
2. Sign in with the configured admin email and password.
3. Update Diesel, Petrol, AdBlue, and the last updated date.
4. Click `Save Prices`.

Prices are now saved permanently through the backend:

- Local protected server: `server.js` writes prices to `data/sheriff-oil.sqlite`.
- Netlify deploy: Netlify Functions save prices to Netlify Blobs through `/api/fuel-prices`.
- Public pages read the latest saved values from `/api/content`.

`localStorage` is still used only as a fallback when the site is opened without a backend.

For stronger privacy, run the included `server.js` instead of a plain static server. It blocks `/admin/`, `/admin.html`, and `/admin.js` unless the configured admin account signs in with HTTP Basic Auth first.

## SQLite Database

The local server creates a DB Browser for SQLite-compatible database here:

```text
data/sheriff-oil.sqlite
```

Tables:

- `fuel_prices` - Diesel, Petrol, AdBlue, currency, and last updated date.
- `site_contact` - address, phone, email, map query, and working hours.
- `admin_users` - protected admin account hashes.
- `contact_messages` - messages sent from the contact page.

Start `server.js` once to create the database automatically. You can then open `data/sheriff-oil.sqlite` with DB Browser for SQLite.

## Content and Assets

- `data/site-data.js` contains bilingual SQ / EN text, contact details, default prices, page labels, and image URLs.
- `assets/sherif-logo.png` is used in the header, footer, loader, hero, and admin login.
- Placeholder images are defined in `data/site-data.js` and can be replaced with real station photos later.

## Local Preview

Run the protected local server from this folder, then open the local URL:

```powershell
node server.js
```

You can also double-click `start-server.bat` on Windows. The server prints the exact `localhost` link in the terminal. If port `4173` is busy, it automatically uses the next free port.
