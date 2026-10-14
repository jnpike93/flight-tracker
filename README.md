# AeroLog - Global Flight Tracker & 3D Mileage Globe

A web application that visualizes all the flights you've ever taken on an interactive 3D Earth globe with flight paths and total mileage calculations.

![AeroLog Preview](https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&auto=format&fit=crop&q=80)

## Features

- **3D Interactive Earth Globe**:
  - Built with Three.js and Globe.gl with night/day atmospheres.
  - Animated Great-Circle geodesic flight arcs with altitude proportional to flight distance.
  - Glowing radar pulse rings and IATA pins at visited airports.
  - Smooth camera focus when selecting any flight from the logbook.
- **2D Map View Toggle**: Seamlessly switch between the 3D Globe and a flat 2D Mercator world map.
- **Flight Number Auto-Lookup**:
  - Automatically identifies airlines from flight number prefixes (e.g., `UA 895` ➔ United Airlines, `BA 178` ➔ British Airways, `DL 482` ➔ Delta Air Lines).
  - Remembers past routes and suggests origin & destination if you've flown the route before.
- **Offline Airport Database (6,000+ IATA Airports)**:
  - Instant fuzzy search by IATA code (e.g. `SFO`, `LHR`, `HND`), city name (`Tokyo`, `London`, `Chicago`), or airport name.
  - 100% offline and free — no paid external API keys required!
- **Accurate Mileage & Stats Engine**:
  - Calculates Great-Circle distance using the Haversine formula (statute miles and kilometers).
  - Total distance logged, total flight count, and flight time estimates.
  - Fun milestone metrics: journeys around the Earth equator and trips to the Moon.
  - Top airlines, top visited airports, cabin class breakdown, and yearly trends.
- **Data Portability**:
  - Export flight log as JSON anytime.
  - Import flight backups.
  - Reset to sample data or clear all flights with one click.

## Quick Start

### 1. Install Dependencies
```bash
# In the flight-tracker directory
npm install
npm run client -- install
```

### 2. Run the Application
```bash
# Starts both Express backend and Vite frontend concurrently
npm run dev
```

Then open your browser to **http://localhost:5173**.

Alternatively, run the production build:
```bash
npm run build
npm start
```
and visit **http://localhost:3001**.

## Google Authentication & Restricted Access (Allowlist)

AeroLog includes built-in Google Authentication and a strict email allowlist so only authorized individuals can access your flight data.

### 1. Set up Google OAuth 2.0
1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a project and set up an **OAuth 2.0 Client ID** (Application type: **Web application**).
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost:3001`
4. Copy your **Client ID** and paste it into `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

### 2. Configure Allowed Users
You can specify who is permitted to log in in two ways:

1. **Via `.env`**:
   ```env
   ALLOWED_EMAILS=youremail@gmail.com,friend@gmail.com
   ```
2. **Via the In-App "Access" Panel**:
   - Once logged in, click the **Access** shield button (or user avatar menu) in the top right.
   - Add or remove Google email addresses with one click.
   - Unauthorized Google accounts will receive an **Access Denied** notice and cannot view or edit any flight data.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Three.js, Globe.gl, Lucide React, Canvas Confetti, `@react-oauth/google`
- **Backend**: Node.js, Express 5, Better-SQLite3, `google-auth-library`, `jsonwebtoken`
- **Data Source**: OpenFlights global airports and airlines dataset (~6,000 IATA airports, ~1,000 airlines)


