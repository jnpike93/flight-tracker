const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (e.g. Nginx on production web server)
app.set('trust proxy', 1);

// 1. HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 2. Constrained CORS & Production Domain Whitelist
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://flights.cuteanimegirls.moe',
  'http://flights.cuteanimegirls.moe',
  'https://cuteanimegirls.moe',
  'http://cuteanimegirls.moe'
];
const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase())
  : [];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const isAllowedOrigin = (origin, host) => {
  if (!origin) return true;
  const lower = origin.toLowerCase();

  // Whitelisted origins
  if (allowedOrigins.includes(lower)) return true;

  // Local development
  if (lower.startsWith('http://localhost:') || lower.startsWith('http://127.0.0.1:')) return true;

  // Domain matches
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.hostname.toLowerCase();

    // Match the request Host header (same host / reverse proxy)
    if (host && originHost === host.split(':')[0].toLowerCase()) return true;

    // cuteanimegirls.moe root and subdomains
    if (originHost === 'cuteanimegirls.moe' || originHost.endsWith('.cuteanimegirls.moe')) return true;
  } catch {}

  return false;
};

app.use(cors((req, callback) => {
  const allowed = isAllowedOrigin(req.headers.origin, req.headers.host);
  callback(null, {
    origin: allowed,
    credentials: true
  });
}));

app.use(express.json({ limit: '2mb' }));

// 3. Sensitive Endpoint Rate Limiter with automatic expired entry pruning
const rateLimitMap = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of rateLimitMap.entries()) {
    if (now > rec.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref(); // Runs every 5 minutes without blocking process exit

function createRateLimiter(windowMs = 60 * 1000, maxRequests = 20, message = 'Too many requests, please try again shortly.') {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    record.count++;
    rateLimitMap.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'RATE_LIMITED', message });
    }
    next();
  };
}

const authRateLimiter = createRateLimiter(60 * 1000, 15, 'Too many authentication attempts. Please wait a minute and try again.');

const dbPath = path.join(__dirname, 'flight_tracker.db');
const db = new Database(dbPath);

// High-performance SQLite configuration for concurrent queries
try {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -64000'); // 64MB cache
} catch (_) {}

// Ensure base tables and columns exist on startup
function initFlightDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS airports (
      iata TEXT PRIMARY KEY,
      icao TEXT,
      name TEXT NOT NULL,
      city TEXT,
      country TEXT,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      altitude INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
    CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country);
    CREATE INDEX IF NOT EXISTS idx_airports_name ON airports(name);

    CREATE TABLE IF NOT EXISTS airlines (
      iata TEXT PRIMARY KEY,
      icao TEXT,
      name TEXT NOT NULL,
      callsign TEXT,
      country TEXT
    );

    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_number TEXT NOT NULL,
      airline TEXT NOT NULL,
      airline_code TEXT,
      date TEXT NOT NULL,
      origin_iata TEXT NOT NULL,
      origin_name TEXT NOT NULL,
      origin_city TEXT NOT NULL,
      origin_country TEXT NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lon REAL NOT NULL,
      dest_iata TEXT NOT NULL,
      dest_name TEXT NOT NULL,
      dest_city TEXT NOT NULL,
      dest_country TEXT NOT NULL,
      dest_lat REAL NOT NULL,
      dest_lon REAL NOT NULL,
      distance_miles INTEGER NOT NULL,
      distance_km INTEGER NOT NULL,
      aircraft TEXT,
      flight_class TEXT DEFAULT 'Economy',
      seat TEXT,
      notes TEXT,
      user_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_flights_date ON flights(date);
    CREATE INDEX IF NOT EXISTS idx_flights_airline ON flights(airline);
    CREATE INDEX IF NOT EXISTS idx_flights_user ON flights(user_email);
  `);

  try {
    const flightCols = db.prepare("PRAGMA table_info(flights)").all();
    if (!flightCols.some(c => c.name === 'user_email')) {
      db.exec("ALTER TABLE flights ADD COLUMN user_email TEXT");
    }
  } catch (_) {}
}

initFlightDb(db);

// Initialize Auth Schema and allowlist
auth.initAuthDb(db);
const requireAuth = auth.requireAuth(db);
const requireAdmin = auth.requireAdmin(db);

// Distance calculation (Haversine formula in miles & km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = Math.round(R * c);
  const km = Math.round(miles * 1.609344);
  return { miles, km };
}

// ================= AUTHENTICATION & ALLOWLIST ENDPOINTS =================

// Public Auth Configuration
app.get('/api/auth/config', (req, res) => {
  const allowedCount = db.prepare('SELECT count(*) as count FROM allowed_users').get().count;
  const envAllowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    hasGoogleAuth: !!process.env.GOOGLE_CLIENT_ID,
    totalAllowedUsers: allowedCount + envAllowed.length,
    requireAuth: process.env.DISABLE_AUTH !== 'true'
  });
});

// Google OAuth Login & Registration Request
app.post('/api/auth/google', authRateLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential token' });
    }

    const googleUser = await auth.verifyGoogleToken(credential);

    // Record login request or update existing user
    const userStatus = auth.recordUserLoginRequest(db, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      method: 'google'
    });

    // Check approval status
    if (userStatus === 'pending') {
      return res.status(200).json({
        status: 'PENDING_APPROVAL',
        message: 'Your login request has been submitted to the administrator for manual approval.',
        user: {
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture
        }
      });
    }

    if (userStatus === 'rejected') {
      return res.status(403).json({
        status: 'REJECTED',
        error: 'ACCESS_REJECTED',
        message: 'Your access request was declined by the administrator.',
        user: {
          email: googleUser.email
        }
      });
    }

    // User is Approved: Issue Session Token
    const isUserAdmin = auth.isAdmin(db, googleUser.email);
    const token = auth.generateSessionToken({ ...googleUser, isAdmin: isUserAdmin }, db);
    res.json({
      status: 'APPROVED',
      token,
      user: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        isAdmin: isUserAdmin
      }
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'AUTH_FAILED', message: 'Failed to verify Google sign-in: ' + err.message });
  }
});

// Development / Local Direct Sign-In (Restricted strictly to non-production and unconfigured OAuth environments)
app.post('/api/auth/dev-login', authRateLimiter, (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Development sign-in is disabled in production.' });
  }

  // If Google OAuth is configured, disallow direct login unless explicitly enabled for testing
  if (process.env.GOOGLE_CLIENT_ID && process.env.ALLOW_DEV_LOGIN !== 'true') {
    return res.status(403).json({
      error: 'DEV_LOGIN_DISABLED',
      message: 'Google Sign-In is configured. Direct development sign-in is disabled. Use Google OAuth to sign in.'
    });
  }

  const { email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Record login request or update existing user
  const userStatus = auth.recordUserLoginRequest(db, {
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    picture: '',
    method: 'dev'
  });

  if (userStatus === 'pending') {
    return res.status(200).json({
      status: 'PENDING_APPROVAL',
      message: 'Your login request has been recorded and is awaiting manual administrator approval.',
      user: {
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        picture: ''
      }
    });
  }

  if (userStatus === 'rejected') {
    return res.status(403).json({
      status: 'REJECTED',
      error: 'ACCESS_REJECTED',
      message: 'Your access request was declined by the administrator.',
      user: {
        email: cleanEmail
      }
    });
  }

  const isUserAdmin = auth.isAdmin(db, cleanEmail);
  const user = {
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    picture: '',
    isAdmin: isUserAdmin
  };

  const token = auth.generateSessionToken(user, db);
  res.json({ status: 'APPROVED', token, user });
});

// Get Current User Profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      ...req.user,
      isAdmin: auth.isAdmin(db, req.user.email)
    }
  });
});

// Get Authorized Users List
app.get('/api/auth/allowed-users', requireAuth, (req, res) => {
  const dbUsers = db.prepare('SELECT email, name, added_at, added_by FROM allowed_users ORDER BY added_at ASC').all();
  const envUsers = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
    .map(e => ({ email: e, name: 'Environment Config', added_at: 'Initial', added_by: '.env' }));

  // Deduplicate
  const map = new Map();
  [...envUsers, ...dbUsers].forEach(u => map.set(u.email.toLowerCase(), u));

  res.json(Array.from(map.values()));
});

// Add User to Allowed List (Admin only)
app.post('/api/auth/allowed-users', requireAuth, requireAdmin, (req, res) => {
  const { email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name = excluded.name
    `).run(cleanEmail, name || cleanEmail.split('@')[0], req.user.email);

    res.status(201).json({ success: true, email: cleanEmail });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add user. Please verify user details.' });
  }
});

// Remove User from Allowed List (Admin only)
app.delete('/api/auth/allowed-users/:email', requireAuth, requireAdmin, (req, res) => {
  const targetEmail = req.params.email.trim().toLowerCase();
  if (targetEmail === req.user.email.toLowerCase()) {
    return res.status(400).json({ error: 'You cannot remove your own authorized account' });
  }

  // Security: Protect primary administrator from removal
  if (targetEmail === 'jakepike2011@gmail.com') {
    return res.status(403).json({ error: 'The primary system administrator cannot be removed.' });
  }

  db.prepare('DELETE FROM allowed_users WHERE LOWER(email) = ?').run(targetEmail);
  res.json({ success: true });
});

// ================= ADMIN CONSOLE / USER MANAGEMENT ENDPOINTS =================

// Get All Users with Authentication details, Approval Status, and Flight Data aggregations
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  try {
    // 1. Fetch all records from allowed_users
    const dbUsers = db.prepare(`
      SELECT
        email,
        name,
        picture,
        role,
        status,
        added_at,
        added_by,
        first_login,
        last_login,
        login_count,
        last_login_method
      FROM allowed_users
    `).all();

    // 2. Fetch distinct user_emails and aggregate flight statistics from flights table
    const flightStatsByUser = db.prepare(`
      SELECT
        LOWER(user_email) as email,
        COUNT(*) as flight_count,
        COALESCE(SUM(distance_miles), 0) as total_distance_miles,
        COALESCE(SUM(distance_km), 0) as total_distance_km,
        MIN(date) as earliest_flight_date,
        MAX(date) as latest_flight_date,
        MAX(created_at) as last_flight_added_at
      FROM flights
      WHERE user_email IS NOT NULL AND TRIM(user_email) != ''
      GROUP BY LOWER(user_email)
    `).all();

    const flightStatsMap = new Map();
    for (const row of flightStatsByUser) {
      // Calculate distinct airports for this user
      const airportCount = db.prepare(`
        SELECT COUNT(DISTINCT iata) as count FROM (
          SELECT origin_iata as iata FROM flights WHERE LOWER(user_email) = ?
          UNION
          SELECT dest_iata as iata FROM flights WHERE LOWER(user_email) = ?
        )
      `).get(row.email, row.email)?.count || 0;

      // Calculate distinct airlines for this user
      const airlineCount = db.prepare(`
        SELECT COUNT(DISTINCT airline) as count FROM flights WHERE LOWER(user_email) = ?
      `).get(row.email)?.count || 0;

      flightStatsMap.set(row.email, {
        flightCount: row.flight_count,
        totalDistanceMiles: row.total_distance_miles,
        totalDistanceKm: row.total_distance_km,
        earliestFlightDate: row.earliest_flight_date,
        latestFlightDate: row.latest_flight_date,
        lastFlightAddedAt: row.last_flight_added_at,
        uniqueAirports: airportCount,
        uniqueAirlines: airlineCount
      });
    }

    // 3. Environment Allowed accounts
    const envAllowed = (process.env.ALLOWED_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    // 4. Combine all distinct users
    const allEmails = new Set();
    dbUsers.forEach(u => allEmails.add(u.email.toLowerCase()));
    flightStatsByUser.forEach(f => allEmails.add(f.email.toLowerCase()));
    envAllowed.forEach(e => allEmails.add(e.toLowerCase()));

    const dbUserMap = new Map(dbUsers.map(u => [u.email.toLowerCase(), u]));

    const users = Array.from(allEmails).map(email => {
      const dbUser = dbUserMap.get(email);
      const flightStats = flightStatsMap.get(email) || {
        flightCount: 0,
        totalDistanceMiles: 0,
        totalDistanceKm: 0,
        earliestFlightDate: null,
        latestFlightDate: null,
        lastFlightAddedAt: null,
        uniqueAirports: 0,
        uniqueAirlines: 0
      };

      const isPrimaryAdmin = email === 'jakepike2011@gmail.com';
      const isSystemAdmin = auth.isAdmin(db, email);
      const isAllowed = auth.isEmailAllowed(db, email);
      const status = isPrimaryAdmin ? 'approved' : (dbUser?.status || (isAllowed ? 'approved' : 'pending'));

      const loginCount = dbUser?.login_count || 0;
      const hasAuthenticated = Boolean(loginCount > 0 || dbUser?.last_login);
      const hasData = flightStats.flightCount > 0;

      return {
        email,
        name: dbUser?.name || email.split('@')[0],
        picture: dbUser?.picture || '',
        role: dbUser?.role || (isSystemAdmin ? 'admin' : 'user'),
        status,
        isAdmin: isSystemAdmin,
        isPrimaryAdmin,
        isAllowed,
        hasAuthenticated,
        firstLogin: dbUser?.first_login || null,
        lastLogin: dbUser?.last_login || null,
        loginCount: loginCount,
        lastLoginMethod: dbUser?.last_login_method || null,
        addedAt: dbUser?.added_at || null,
        addedBy: dbUser?.added_by || (envAllowed.includes(email) ? '.env' : (hasData ? 'flight_log' : 'login_request')),
        flightCount: flightStats.flightCount,
        hasData,
        totalDistanceMiles: flightStats.totalDistanceMiles,
        totalDistanceKm: flightStats.totalDistanceKm,
        uniqueAirports: flightStats.uniqueAirports,
        uniqueAirlines: flightStats.uniqueAirlines,
        earliestFlightDate: flightStats.earliestFlightDate,
        latestFlightDate: flightStats.latestFlightDate,
        lastFlightAddedAt: flightStats.lastFlightAddedAt
      };
    });

    // Default Sort: Primary Admin first, then pending approvals (for urgent admin action), then authenticated with data, then flights desc
    users.sort((a, b) => {
      if (a.isPrimaryAdmin) return -1;
      if (b.isPrimaryAdmin) return 1;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      if ((a.hasAuthenticated && a.hasData) && !(b.hasAuthenticated && b.hasData)) return -1;
      if (!(a.hasAuthenticated && a.hasData) && (b.hasAuthenticated && b.hasData)) return 1;
      if (a.hasAuthenticated && !b.hasAuthenticated) return -1;
      if (!a.hasAuthenticated && b.hasAuthenticated) return 1;
      return (b.flightCount || 0) - (a.flightCount || 0);
    });

    // Global system totals
    const totalFlightsSystem = db.prepare('SELECT COUNT(*) as count FROM flights').get().count;
    const totalMilesSystem = db.prepare('SELECT COALESCE(SUM(distance_miles), 0) as miles FROM flights').get().miles;
    const totalAirportsSystem = db.prepare(`
      SELECT COUNT(DISTINCT iata) as count FROM (
        SELECT origin_iata as iata FROM flights
        UNION
        SELECT dest_iata as iata FROM flights
      )
    `).get().count;

    const summary = {
      totalUsers: users.length,
      totalAuthenticated: users.filter(u => u.hasAuthenticated).length,
      totalWithData: users.filter(u => u.hasData).length,
      totalAuthenticatedWithData: users.filter(u => u.hasAuthenticated && u.hasData).length,
      totalAdmins: users.filter(u => u.isAdmin).length,
      pendingApprovalsCount: users.filter(u => u.status === 'pending').length,
      approvedUsersCount: users.filter(u => u.status === 'approved').length,
      rejectedUsersCount: users.filter(u => u.status === 'rejected').length,
      totalFlightsSystem,
      totalMilesSystem,
      totalAirportsSystem
    };

    res.json({ summary, users });
  } catch (err) {
    console.error('Admin users fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin user list: ' + err.message });
  }
});

// Inspect a specific user's flights and data
app.get('/api/admin/users/:email/flights', requireAuth, requireAdmin, (req, res) => {
  try {
    const targetEmail = req.params.email.trim().toLowerCase();
    const flights = db.prepare(`
      SELECT * FROM flights
      WHERE LOWER(user_email) = ?
      ORDER BY date DESC, id DESC
    `).all(targetEmail);

    const dbUser = db.prepare('SELECT * FROM allowed_users WHERE LOWER(email) = ?').get(targetEmail);

    const totalMiles = flights.reduce((sum, f) => sum + (f.distance_miles || 0), 0);
    const totalKm = flights.reduce((sum, f) => sum + (f.distance_km || 0), 0);

    // Top airports for this user
    const topAirports = db.prepare(`
      SELECT iata, name, city, country, COUNT(*) as visits FROM (
        SELECT origin_iata as iata, origin_name as name, origin_city as city, origin_country as country FROM flights WHERE LOWER(user_email) = ?
        UNION ALL
        SELECT dest_iata as iata, dest_name as name, dest_city as city, dest_country as country FROM flights WHERE LOWER(user_email) = ?
      )
      GROUP BY iata
      ORDER BY visits DESC
      LIMIT 10
    `).all(targetEmail, targetEmail);

    // Top airlines for this user
    const topAirlines = db.prepare(`
      SELECT airline, airline_code, COUNT(*) as count, SUM(distance_miles) as miles
      FROM flights
      WHERE LOWER(user_email) = ?
      GROUP BY airline
      ORDER BY count DESC
      LIMIT 10
    `).all(targetEmail);

    res.json({
      email: targetEmail,
      user: dbUser || { email: targetEmail },
      flights,
      stats: {
        totalFlights: flights.length,
        totalMiles,
        totalKm,
        topAirports,
        topAirlines
      }
    });
  } catch (err) {
    console.error('Admin user flights fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve user flights: ' + err.message });
  }
});

// Add or invite user directly from Admin Console (Admin only - defaults to approved)
app.post('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const { email, name, role = 'user', status = 'approved' } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = role === 'admin' ? 'admin' : 'user';
  const cleanStatus = ['approved', 'pending', 'rejected'].includes(status) ? status : 'approved';

  try {
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by, role, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = COALESCE(excluded.name, allowed_users.name),
        role = excluded.role,
        status = excluded.status
    `).run(cleanEmail, name || cleanEmail.split('@')[0], req.user.email, cleanRole, cleanStatus);

    res.status(201).json({ success: true, email: cleanEmail, role: cleanRole, status: cleanStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add user to allowlist: ' + err.message });
  }
});

// Update user approval status (Admin only: Approve, Reject, or Pend)
app.patch('/api/admin/users/:email/status', requireAuth, requireAdmin, (req, res) => {
  try {
    const targetEmail = req.params.email.trim().toLowerCase();
    const { status } = req.body;

    const result = auth.updateUserStatus(db, targetEmail, status);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update user approval status' });
  }
});

// Update user role (Admin only)
app.patch('/api/admin/users/:email/role', requireAuth, requireAdmin, (req, res) => {
  try {
    const targetEmail = req.params.email.trim().toLowerCase();
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user".' });
    }

    if (targetEmail === 'jakepike2011@gmail.com' && role !== 'admin') {
      return res.status(403).json({ error: 'The primary system administrator role cannot be altered.' });
    }

    // Ensure user exists in allowed_users
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET role = excluded.role
    `).run(targetEmail, targetEmail.split('@')[0], req.user.email, role);

    res.json({ success: true, email: targetEmail, role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role: ' + err.message });
  }
});

// Delete user / revoke access from allowlist (Admin only)
app.delete('/api/admin/users/:email', requireAuth, requireAdmin, (req, res) => {
  const targetEmail = req.params.email.trim().toLowerCase();
  if (targetEmail === req.user.email.toLowerCase()) {
    return res.status(400).json({ error: 'You cannot revoke your own authorized account' });
  }

  if (targetEmail === 'jakepike2011@gmail.com') {
    return res.status(403).json({ error: 'The primary system administrator cannot be removed.' });
  }

  db.prepare('DELETE FROM allowed_users WHERE LOWER(email) = ?').run(targetEmail);
  res.json({ success: true });
});

// Purge flights for a specific user (GDPR / Admin cleanup)
app.delete('/api/admin/users/:email/flights', requireAuth, requireAdmin, (req, res) => {
  try {
    const targetEmail = req.params.email.trim().toLowerCase();
    const result = db.prepare('DELETE FROM flights WHERE LOWER(user_email) = ?').run(targetEmail);
    res.json({ success: true, deletedFlights: result.changes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user flight data: ' + err.message });
  }
});

// ================= CALENDAR HISTORIC FLIGHTS SYNC =================
const calendarParser = require('./calendarParser');
const flightIntelligence = require('./flightIntelligence');

// Scan Google Calendar via OAuth Access Token
app.post('/api/calendar/scan-google', requireAuth, async (req, res) => {
  try {
    const { accessToken, timeMin, timeMax, query } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Google Calendar Access Token is required' });
    }

    const defaultMin = timeMin || new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString(); // Past 10 years
    const defaultMax = timeMax || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // Future 1 year

    // Comprehensive search queries likely to find flights and airline confirmations
    const defaultSearchTerms = [
      'flight',
      'airline',
      'airways',
      'booking',
      'ticket',
      'itinerary',
      'boarding',
      'terminal',
      'airport',
      'reservation',
      'confirmation',
      'auckland',
      'aukland',
      'new zealand',
      'airnz',
      'virgin',
      'qantas',
      'jetstar',
      'icelandair',
      'icelandic',
      'iceland',
      'delta',
      'united',
      'american',
      'southwest',
      'alaska'
    ];

    const termsToSearch = [];
    if (query && query.trim()) {
      termsToSearch.push(query.trim());
    }
    for (const t of defaultSearchTerms) {
      if (!termsToSearch.includes(t)) termsToSearch.push(t);
    }

    const eventMap = new Map();
    let authError = null;

    // Discover all accessible user calendars (e.g. primary, Travel, Trips, Personal)
    const calendarIds = ['primary'];
    try {
      const calListResp = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (calListResp.ok) {
        const listData = await calListResp.json();
        if (listData.items && Array.isArray(listData.items)) {
          for (const item of listData.items) {
            if (item.id.includes('holiday@group.v.calendar.google.com') || item.id.includes('contacts@group.v.calendar.google.com')) continue;
            if (!calendarIds.includes(item.id)) calendarIds.push(item.id);
          }
        }
      }
    } catch (_) {}

    // Helper to fetch Google Calendar events with given params from a specific calendar
    const fetchEvents = async (searchParams, calId = 'primary') => {
      try {
        const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
        for (const [k, v] of Object.entries(searchParams)) {
          url.searchParams.set(k, v);
        }
        url.searchParams.set('timeMin', defaultMin);
        url.searchParams.set('timeMax', defaultMax);
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('maxResults', '250');

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.items && Array.isArray(data.items)) {
            for (const ev of data.items) {
              eventMap.set(ev.id, ev);
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          const errJson = await response.json().catch(() => ({}));
          authError = {
            status: response.status,
            message: errJson.error?.message || 'Access to Google Calendar was not granted or token expired.'
          };
        }
      } catch (err) {
        console.warn('Failed search query on calendar', calId, searchParams, err.message);
      }
    };

    // Helper to page directly through calendar events without keyword restrictions
    const fetchAllEventsDirectly = async (calId = 'primary') => {
      try {
        let pageToken = null;
        let pageCount = 0;
        const MAX_PAGES = 10; // Up to 2,500 calendar events per calendar

        do {
          const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
          url.searchParams.set('timeMin', defaultMin);
          url.searchParams.set('timeMax', defaultMax);
          url.searchParams.set('singleEvents', 'true');
          url.searchParams.set('maxResults', '250');
          if (pageToken) url.searchParams.set('pageToken', pageToken);

          const response = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.items && Array.isArray(data.items)) {
              for (const ev of data.items) {
                eventMap.set(ev.id, ev);
              }
            }
            pageToken = data.nextPageToken || null;
            pageCount++;
          } else {
            if (response.status === 401 || response.status === 403) {
              const errJson = await response.json().catch(() => ({}));
              authError = {
                status: response.status,
                message: errJson.error?.message || 'Access to Google Calendar was not granted or token expired.'
              };
            }
            break;
          }
        } while (pageToken && pageCount < MAX_PAGES);
      } catch (err) {
        console.warn('Direct pagination error on calendar', calId, err.message);
      }
    };

    // Run direct pagination and targeted queries concurrently across all user calendars
    const queryPromises = [];
    for (const calId of calendarIds) {
      queryPromises.push(fetchAllEventsDirectly(calId));
      for (const term of termsToSearch) {
        queryPromises.push(fetchEvents({ q: term }, calId));
      }
      queryPromises.push(fetchEvents({ eventTypes: 'flight' }, calId));
    }

    await Promise.allSettled(queryPromises);

    if (authError && eventMap.size === 0) {
      return res.status(authError.status).json({
        error: 'CALENDAR_PERMISSION_DENIED',
        message: authError.message
      });
    }

    const allEvents = Array.from(eventMap.values());
    const detectedFlights = [];

    for (const ev of allEvents) {
      const flight = calendarParser.extractFlightFromEvent(ev, db, req.user.email);
      if (flight) {
        detectedFlights.push(flight);
      }
    }

    // Sort by date ascending
    detectedFlights.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    res.json({
      totalEventsScanned: allEvents.length,
      detectedFlightsCount: detectedFlights.length,
      flights: detectedFlights
    });
  } catch (err) {
    console.error('Error scanning Google Calendar:', err);
    res.status(500).json({ error: 'Failed to scan calendar: ' + err.message });
  }
});

// Scan .ics Calendar File
app.post('/api/calendar/scan-ics', requireAuth, (req, res) => {
  try {
    const { icsContent } = req.body;
    if (!icsContent || typeof icsContent !== 'string') {
      return res.status(400).json({ error: 'ICS file content is required' });
    }

    const events = calendarParser.parseICS(icsContent);
    const detectedFlights = [];

    for (const ev of events) {
      const flight = calendarParser.extractFlightFromEvent(ev, db, req.user.email);
      if (flight) {
        detectedFlights.push(flight);
      }
    }

    detectedFlights.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    res.json({
      totalEventsScanned: events.length,
      detectedFlightsCount: detectedFlights.length,
      flights: detectedFlights
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse ICS file: ' + err.message });
  }
});

// Bulk Confirm & Import Selected Flights from Calendar
app.post('/api/calendar/confirm-import', requireAuth, (req, res) => {
  try {
    const { flights } = req.body;
    if (!Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ error: 'No flights provided for import' });
    }

    if (flights.length > 1000) {
      return res.status(400).json({ error: 'Import batch exceeds maximum limit of 1,000 flights' });
    }

    const userEmail = req.user.email.toLowerCase();
    const insert = db.prepare(`
      INSERT INTO flights (
        user_email, flight_number, airline, airline_code, date,
        origin_iata, origin_name, origin_city, origin_country, origin_lat, origin_lon,
        dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
        distance_miles, distance_km, aircraft, flight_class, seat, notes
      ) VALUES (
        @user_email, @flight_number, @airline, @airline_code, @date,
        @origin_iata, @origin_name, @origin_city, @origin_country, @origin_lat, @origin_lon,
        @dest_iata, @dest_name, @dest_city, @dest_country, @dest_lat, @dest_lon,
        @distance_miles, @distance_km, @aircraft, @flight_class, @seat, @notes
      )
    `);

    let imported = 0;
    const runMany = db.transaction((rows) => {
      for (const f of rows) {
        if (!f || typeof f !== 'object') continue;
        if (!f.flight_number || !f.origin_iata || !f.dest_iata) continue;
        const oCode = String(f.origin_iata).trim().toUpperCase();
        const dCode = String(f.dest_iata).trim().toUpperCase();
        if (oCode === dCode) continue;

        const origApt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(oCode);
        const destApt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(dCode);
        if (!origApt || !destApt) continue;

        const dist = Number(f.distance_miles) || 0;
        const airCode = String(f.airline_code || '').trim().toUpperCase();
        if (!calendarParser.validateRoutePlausibility(airCode, origApt, destApt, dist)) {
          console.warn('Blocked implausible flight during confirm-import:', airCode, oCode, '->', dCode, dist, 'miles');
          continue;
        }

        insert.run({
          user_email: userEmail,
          flight_number: String(f.flight_number).trim().slice(0, 30),
          airline: String(f.airline || 'Unknown').trim().slice(0, 100),
          airline_code: String(f.airline_code || '').trim().slice(0, 4).toUpperCase(),
          date: String(f.date || new Date().toISOString().slice(0, 10)).trim().slice(0, 20),
          origin_iata: String(f.origin_iata).trim().slice(0, 4).toUpperCase(),
          origin_name: String(f.origin_name || '').trim().slice(0, 120),
          origin_city: String(f.origin_city || '').trim().slice(0, 80),
          origin_country: String(f.origin_country || '').trim().slice(0, 80),
          origin_lat: Number(f.origin_lat) || 0,
          origin_lon: Number(f.origin_lon) || 0,
          dest_iata: String(f.dest_iata).trim().slice(0, 4).toUpperCase(),
          dest_name: String(f.dest_name || '').trim().slice(0, 120),
          dest_city: String(f.dest_city || '').trim().slice(0, 80),
          dest_country: String(f.dest_country || '').trim().slice(0, 80),
          dest_lat: Number(f.dest_lat) || 0,
          dest_lon: Number(f.dest_lon) || 0,
          distance_miles: parseInt(f.distance_miles, 10) || 0,
          distance_km: parseInt(f.distance_km, 10) || 0,
          aircraft: String(f.aircraft || '').trim().slice(0, 60),
          flight_class: ['Economy', 'Premium Economy', 'Business', 'First'].includes(f.flight_class) ? f.flight_class : 'Economy',
          seat: String(f.seat || '').trim().slice(0, 10),
          notes: String(f.notes || (f.rawSummary ? `Imported from Calendar: ${f.rawSummary}` : 'Imported from Calendar')).trim().slice(0, 2000)
        });
        imported++;
      }
    });

    runMany(flights);
    res.json({ success: true, count: imported });
  } catch (err) {
    console.error('Error importing calendar flights:', err);
    res.status(500).json({ error: 'Failed to import calendar flights. Please verify data format.' });
  }
});

// =========================================================================

// 1. Search airports by IATA, city, or name
app.get('/api/airports/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    // Return major hub airports as suggestions when query is empty
    const hubs = db.prepare(`
      SELECT iata, icao, name, city, country, lat, lon
      FROM airports
      WHERE iata IN ('JFK', 'LAX', 'ORD', 'SFO', 'LHR', 'CDG', 'HND', 'SIN', 'DXB', 'SYD', 'FRA', 'MIA', 'SEA', 'ATL', 'DFW', 'DEN')
      ORDER BY city ASC
    `).all();
    return res.json(hubs);
  }

  const queryUpper = q.toUpperCase();
  const queryLike = `%${q}%`;

  const results = db.prepare(`
    SELECT iata, icao, name, city, country, lat, lon,
      CASE
        WHEN iata = ? THEN 1
        WHEN iata LIKE ? THEN 2
        WHEN UPPER(city) LIKE ? THEN 3
        WHEN UPPER(name) LIKE ? THEN 4
        ELSE 5
      END as match_priority
    FROM airports
    WHERE iata LIKE ? OR city LIKE ? OR name LIKE ?
    ORDER BY match_priority ASC, city ASC
    LIMIT 20
  `).all(queryUpper, `${queryUpper}%`, `${queryUpper}%`, `${queryUpper}%`, queryLike, queryLike, queryLike);

  res.json(results);
});

// 2. Get airport by IATA
app.get('/api/airports/:iata', (req, res) => {
  const iata = req.params.iata.toUpperCase();
  const airport = db.prepare('SELECT * FROM airports WHERE iata = ?').get(iata);
  if (!airport) return res.status(404).json({ error: 'Airport not found' });
  res.json(airport);
});

// 3. Search airlines
app.get('/api/airlines/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const queryUpper = q.toUpperCase();
  const queryLike = `%${q}%`;

  const results = db.prepare(`
    SELECT iata, icao, name, callsign, country
    FROM airlines
    WHERE iata = ? OR UPPER(name) LIKE ?
    ORDER BY CASE WHEN iata = ? THEN 1 ELSE 2 END, name ASC
    LIMIT 15
  `).all(queryUpper, queryLike, queryUpper);

  res.json(results);
});

// 4. Flight number auto-lookup
app.get('/api/flights/lookup/:flightNumber', (req, res) => {
  const raw = req.params.flightNumber.trim();
  // Regex to extract 2-letter airline code and digits (e.g., "UA 895", "BA178", "DL 482", "B6 123")
  const match = raw.match(/^([A-Za-z0-9]{2})\s*([0-9]+)?/);

  let airlineCode = '';
  let airlineName = '';
  let number = '';

  if (match) {
    airlineCode = match[1].toUpperCase();
    number = match[2] || '';
    const airline = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(airlineCode);
    if (airline) airlineName = airline.name;
  }

  // Check if we have seen this flight number before in user history or samples
  const normalizedNumber = (airlineCode && number) ? `${airlineCode} ${number}` : raw.toUpperCase();
  const previousFlight = db.prepare(`
    SELECT origin_iata, dest_iata, aircraft, airline
    FROM flights
    WHERE UPPER(flight_number) = ? OR UPPER(flight_number) = ?
    ORDER BY id DESC LIMIT 1
  `).get(normalizedNumber, raw.toUpperCase());

  res.json({
    flightNumber: normalizedNumber,
    airlineCode,
    airlineName: airlineName || (previousFlight ? previousFlight.airline : ''),
    suggestedOrigin: previousFlight ? previousFlight.origin_iata : null,
    suggestedDest: previousFlight ? previousFlight.dest_iata : null,
    suggestedAircraft: previousFlight ? previousFlight.aircraft : null
  });
});

// 5. Get all flights with filtering for current user
app.get('/api/flights', requireAuth, (req, res) => {
  const { year, airline, search } = req.query;
  const userEmail = req.user.email.toLowerCase();

  let query = 'SELECT * FROM flights WHERE user_email = ?';
  const params = [userEmail];

  if (year && year !== 'all') {
    query += ' AND substr(date, 1, 4) = ?';
    params.push(year);
  }

  if (airline && airline !== 'all') {
    query += ' AND airline = ?';
    params.push(airline);
  }

  if (search) {
    query += ' AND (flight_number LIKE ? OR origin_iata LIKE ? OR dest_iata LIKE ? OR origin_city LIKE ? OR dest_city LIKE ? OR aircraft LIKE ? OR notes LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY date DESC, id DESC';

  const flights = db.prepare(query).all(...params);
  res.json(flights);
});

// 6. Add new flight for current user
app.post('/api/flights', requireAuth, (req, res) => {
  try {
    const userEmail = req.user.email.toLowerCase();
    const {
      flight_number,
      airline,
      airline_code,
      date,
      origin_iata,
      dest_iata,
      aircraft,
      flight_class,
      seat,
      notes
    } = req.body;

    if (!flight_number || !date || !origin_iata || !dest_iata) {
      return res.status(400).json({ error: 'Flight number, date, origin, and destination are required' });
    }

    if (typeof flight_number !== 'string' || typeof date !== 'string' || typeof origin_iata !== 'string' || typeof dest_iata !== 'string') {
      return res.status(400).json({ error: 'Flight number, date, origin, and destination must be valid strings' });
    }

    const cleanFlightNumber = flight_number.trim().slice(0, 30);
    const cleanOriginIata = origin_iata.trim().slice(0, 4).toUpperCase();
    const cleanDestIata = dest_iata.trim().slice(0, 4).toUpperCase();
    const cleanDate = date.trim().slice(0, 20);
    const cleanAircraft = typeof aircraft === 'string' ? aircraft.trim().slice(0, 60) : '';
    const cleanFlightClass = ['Economy', 'Premium Economy', 'Business', 'First'].includes(flight_class) ? flight_class : 'Economy';
    const cleanSeat = typeof seat === 'string' ? seat.trim().slice(0, 10) : '';
    const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 2000) : '';

    const orig = db.prepare('SELECT * FROM airports WHERE iata = ?').get(cleanOriginIata);
    const dest = db.prepare('SELECT * FROM airports WHERE iata = ?').get(cleanDestIata);

    if (!orig) return res.status(400).json({ error: `Origin airport code "${cleanOriginIata}" not found` });
    if (!dest) return res.status(400).json({ error: `Destination airport code "${cleanDestIata}" not found` });

    const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);

    // Resolve airline name if not provided
    let finalAirline = typeof airline === 'string' ? airline.trim().slice(0, 100) : '';
    if (!finalAirline && airline_code && typeof airline_code === 'string') {
      const a = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(airline_code.trim().toUpperCase());
      if (a) finalAirline = a.name;
    }
    if (!finalAirline) {
      const match = cleanFlightNumber.match(/^([A-Za-z0-9]{2})/);
      if (match) {
        const a = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(match[1].toUpperCase());
        if (a) finalAirline = a.name;
      }
    }
    if (!finalAirline) finalAirline = 'Unknown Airline';

    const insert = db.prepare(`
      INSERT INTO flights (
        user_email, flight_number, airline, airline_code, date,
        origin_iata, origin_name, origin_city, origin_country, origin_lat, origin_lon,
        dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
        distance_miles, distance_km, aircraft, flight_class, seat, notes
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    const cleanAirlineCode = typeof airline_code === 'string' && airline_code.trim()
      ? airline_code.trim().slice(0, 4).toUpperCase()
      : cleanFlightNumber.substring(0, 2).toUpperCase();

    const result = insert.run(
      userEmail,
      cleanFlightNumber,
      finalAirline,
      cleanAirlineCode,
      cleanDate,
      orig.iata,
      orig.name,
      orig.city,
      orig.country,
      orig.lat,
      orig.lon,
      dest.iata,
      dest.name,
      dest.city,
      dest.country,
      dest.lat,
      dest.lon,
      dist.miles,
      dist.km,
      cleanAircraft,
      cleanFlightClass,
      cleanSeat,
      cleanNotes
    );

    const newFlight = db.prepare('SELECT * FROM flights WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newFlight);
  } catch (err) {
    console.error('Error adding flight:', err);
    res.status(500).json({ error: 'Failed to add flight record. Please verify flight details.' });
  }
});

// 7. Update flight
app.put('/api/flights/:id', requireAuth, (req, res) => {
  try {
    const id = req.params.id;
    const {
      flight_number,
      airline,
      airline_code,
      date,
      origin_iata,
      dest_iata,
      aircraft,
      flight_class,
      seat,
      notes
    } = req.body;

    const userEmail = req.user.email.toLowerCase();
    const existing = db.prepare('SELECT * FROM flights WHERE id = ? AND user_email = ?').get(id, userEmail);
    if (!existing) return res.status(404).json({ error: 'Flight not found or access denied' });

    const origCode = typeof origin_iata === 'string' && origin_iata.trim() ? origin_iata.trim().slice(0, 4).toUpperCase() : existing.origin_iata;
    const destCode = typeof dest_iata === 'string' && dest_iata.trim() ? dest_iata.trim().slice(0, 4).toUpperCase() : existing.dest_iata;

    const orig = db.prepare('SELECT * FROM airports WHERE iata = ?').get(origCode);
    const dest = db.prepare('SELECT * FROM airports WHERE iata = ?').get(destCode);

    if (!orig || !dest) return res.status(400).json({ error: 'Invalid airport codes' });

    const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);

    const cleanFlightNumber = typeof flight_number === 'string' && flight_number.trim()
      ? flight_number.trim().slice(0, 30)
      : existing.flight_number;
    const cleanAirline = typeof airline === 'string' && airline.trim()
      ? airline.trim().slice(0, 100)
      : existing.airline;
    const cleanAirlineCode = typeof airline_code === 'string' && airline_code.trim()
      ? airline_code.trim().slice(0, 4).toUpperCase()
      : existing.airline_code;
    const cleanDate = typeof date === 'string' && date.trim()
      ? date.trim().slice(0, 20)
      : existing.date;
    const cleanAircraft = typeof aircraft === 'string'
      ? aircraft.trim().slice(0, 60)
      : existing.aircraft;
    const cleanFlightClass = ['Economy', 'Premium Economy', 'Business', 'First'].includes(flight_class)
      ? flight_class
      : existing.flight_class;
    const cleanSeat = typeof seat === 'string'
      ? seat.trim().slice(0, 10)
      : existing.seat;
    const cleanNotes = typeof notes === 'string'
      ? notes.trim().slice(0, 2000)
      : existing.notes;

    db.prepare(`
      UPDATE flights SET
        flight_number = ?, airline = ?, airline_code = ?, date = ?,
        origin_iata = ?, origin_name = ?, origin_city = ?, origin_country = ?, origin_lat = ?, origin_lon = ?,
        dest_iata = ?, dest_name = ?, dest_city = ?, dest_country = ?, dest_lat = ?, dest_lon = ?,
        distance_miles = ?, distance_km = ?, aircraft = ?, flight_class = ?, seat = ?, notes = ?
      WHERE id = ? AND user_email = ?
    `).run(
      cleanFlightNumber,
      cleanAirline,
      cleanAirlineCode,
      cleanDate,
      orig.iata,
      orig.name,
      orig.city,
      orig.country,
      orig.lat,
      orig.lon,
      dest.iata,
      dest.name,
      dest.city,
      dest.country,
      dest.lat,
      dest.lon,
      dist.miles,
      dist.km,
      cleanAircraft,
      cleanFlightClass,
      cleanSeat,
      cleanNotes,
      id,
      userEmail
    );

    const updated = db.prepare('SELECT * FROM flights WHERE id = ? AND user_email = ?').get(id, userEmail);
    res.json(updated);
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(500).json({ error: 'Failed to update flight record. Please verify details.' });
  }
});

// 8. Delete flight (only owned by user)
app.delete('/api/flights/:id', requireAuth, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  const result = db.prepare('DELETE FROM flights WHERE id = ? AND user_email = ?').run(req.params.id, userEmail);
  if (result.changes === 0) return res.status(404).json({ error: 'Flight not found or access denied' });
  res.json({ success: true });
});

// 9. Clear all flights (only for current user)
app.delete('/api/flights', requireAuth, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.prepare('DELETE FROM flights WHERE user_email = ?').run(userEmail);
  res.json({ success: true, message: 'All your logged flights cleared' });
});

// 10. Comprehensive Statistics (strictly isolated by user)
app.get('/api/stats', requireAuth, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  const flights = db.prepare('SELECT * FROM flights WHERE user_email = ? ORDER BY date ASC, id ASC').all(userEmail);

  const totalFlights = flights.length;
  const totalMiles = flights.reduce((sum, f) => sum + (f.distance_miles || 0), 0);
  const totalKm = flights.reduce((sum, f) => sum + (f.distance_km || 0), 0);

  // Earth circumferences: ~24,901 miles
  const earthCircumnavigations = Number((totalMiles / 24901).toFixed(2));
  // Moon trips: ~238,855 miles
  const moonTrips = Number((totalMiles / 238855).toFixed(3));
  // Estimated flight time in hours (~500 mph average ground speed including takeoff/landing)
  const estimatedHours = Number((totalMiles / 500).toFixed(1));
  const totalDaysAloft = Number((totalMiles / 500 / 24).toFixed(1));
  const carbonTons = Number((totalMiles * 0.00024).toFixed(1));

  const averageDistanceMiles = totalFlights > 0 ? Math.round(totalMiles / totalFlights) : 0;
  const averageDistanceKm = totalFlights > 0 ? Math.round(totalKm / totalFlights) : 0;
  const averageFlightHours = totalFlights > 0 ? Number((totalMiles / totalFlights / 500).toFixed(1)) : 0;

  // Earliest & Latest Flights
  const datedFlights = flights.filter(f => f.date && f.date.trim().length >= 4);
  const earliestFlight = datedFlights.length > 0 ? datedFlights[0] : null;
  const latestFlight = datedFlights.length > 0 ? datedFlights[datedFlights.length - 1] : null;

  let timeSpan = null;
  if (earliestFlight && latestFlight && earliestFlight.date && latestFlight.date) {
    const d1 = new Date(earliestFlight.date);
    const d2 = new Date(latestFlight.date);
    const diffDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    const diffYears = Number((diffDays / 365.25).toFixed(1));
    timeSpan = {
      totalDays: diffDays,
      totalYears: diffYears,
      earliestDate: earliestFlight.date,
      latestDate: latestFlight.date
    };
  }

  // Unique counts
  const airportSet = new Set();
  const countrySet = new Set();
  const airlineSet = new Set();

  flights.forEach(f => {
    if (f.origin_iata) airportSet.add(f.origin_iata);
    if (f.dest_iata) airportSet.add(f.dest_iata);
    if (f.origin_country) countrySet.add(f.origin_country.trim());
    if (f.dest_country) countrySet.add(f.dest_country.trim());
    if (f.airline) airlineSet.add(f.airline.trim());
  });

  // ALL airlines flown by user (no limit!)
  const allAirlinesRaw = db.prepare(`
    SELECT airline, airline_code, count(*) as count, sum(distance_miles) as total_miles, sum(distance_km) as total_km
    FROM flights
    WHERE user_email = ?
    GROUP BY airline
    ORDER BY count DESC, total_miles DESC
  `).all(userEmail);

  const allAirlines = allAirlinesRaw.map(a => ({
    ...a,
    percentage: totalFlights > 0 ? Math.round((a.count / totalFlights) * 100) : 0
  }));

  // ALL airports visited by user (no limit!)
  const allAirportsRaw = db.prepare(`
    SELECT 
      iata, name, city, country,
      sum(dep_count) as departures,
      sum(arr_count) as arrivals,
      (sum(dep_count) + sum(arr_count)) as visits
    FROM (
      SELECT origin_iata as iata, origin_name as name, origin_city as city, origin_country as country, 1 as dep_count, 0 as arr_count FROM flights WHERE user_email = ?
      UNION ALL
      SELECT dest_iata as iata, dest_name as name, dest_city as city, dest_country as country, 0 as dep_count, 1 as arr_count FROM flights WHERE user_email = ?
    )
    GROUP BY iata
    ORDER BY visits DESC, iata ASC
  `).all(userEmail, userEmail);

  const totalVisits = allAirportsRaw.reduce((sum, a) => sum + a.visits, 0);
  const allAirports = allAirportsRaw.map(a => ({
    ...a,
    percentage: totalVisits > 0 ? Math.round((a.visits / totalVisits) * 100) : 0
  }));

  // Top routes for current user
  const topRoutes = db.prepare(`
    SELECT
      CASE WHEN origin_iata < dest_iata THEN origin_iata ELSE dest_iata END as apt1,
      CASE WHEN origin_iata < dest_iata THEN dest_iata ELSE origin_iata END as apt2,
      origin_city, dest_city,
      count(*) as count,
      avg(distance_miles) as distance_miles
    FROM flights
    WHERE user_email = ?
    GROUP BY apt1, apt2
    ORDER BY count DESC
    LIMIT 6
  `).all(userEmail);

  // Yearly breakdown for current user
  const yearlyBreakdownRaw = db.prepare(`
    SELECT substr(date, 1, 4) as year, count(*) as count, sum(distance_miles) as miles, sum(distance_km) as km
    FROM flights
    WHERE user_email = ? AND date IS NOT NULL AND length(date) >= 4
    GROUP BY year
    ORDER BY year ASC
  `).all(userEmail);

  let busiestYear = null;
  const yearlyBreakdown = yearlyBreakdownRaw.map(y => {
    const item = {
      ...y,
      percentage: totalFlights > 0 ? Math.round((y.count / totalFlights) * 100) : 0
    };
    if (!busiestYear || y.count > busiestYear.count) {
      busiestYear = item;
    }
    return item;
  });

  // Monthly seasonality & Day of week & Domestic vs Intl
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthCounts = Array(12).fill(0);
  const dayCounts = Array(7).fill(0);
  let domesticCount = 0;
  let intlCount = 0;

  flights.forEach(f => {
    if (f.date) {
      const d = new Date(f.date + 'T12:00:00Z');
      if (!isNaN(d.getTime())) {
        monthCounts[d.getUTCMonth()]++;
        dayCounts[d.getUTCDay()]++;
      }
    }
    if (f.origin_country && f.dest_country) {
      if (f.origin_country.trim().toLowerCase() === f.dest_country.trim().toLowerCase()) {
        domesticCount++;
      } else {
        intlCount++;
      }
    }
  });

  let peakMonthIndex = 0;
  monthCounts.forEach((c, i) => { if (c > monthCounts[peakMonthIndex]) peakMonthIndex = i; });
  const monthlySeasonality = monthNames.map((name, i) => ({
    month: name,
    count: monthCounts[i],
    percentage: totalFlights > 0 ? Math.round((monthCounts[i] / totalFlights) * 100) : 0
  }));

  let favoriteDayIndex = 0;
  dayCounts.forEach((c, i) => { if (c > dayCounts[favoriteDayIndex]) favoriteDayIndex = i; });
  const dayOfWeekDistribution = dayNames.map((name, i) => ({
    day: name,
    count: dayCounts[i],
    percentage: totalFlights > 0 ? Math.round((dayCounts[i] / totalFlights) * 100) : 0
  }));

  // Class breakdown for current user
  const cabinBreakdown = db.prepare(`
    SELECT flight_class, count(*) as count
    FROM flights
    WHERE user_email = ?
    GROUP BY flight_class
    ORDER BY count DESC
  `).all(userEmail);

  // Longest and shortest flights
  let longestFlight = null;
  let shortestFlight = null;
  if (flights.length > 0) {
    longestFlight = flights.reduce((max, f) => f.distance_miles > (max ? max.distance_miles : -1) ? f : max, null);
    shortestFlight = flights.reduce((min, f) => f.distance_miles < (min ? min.distance_miles : Infinity) ? f : min, null);
  }

  // Fleet, Gamified Badges, Trips & Wrapped Intelligence
  const fleetStats = flightIntelligence.computeFleetAndSeats(flights);
  const badgeStats = flightIntelligence.computeBadges(flights, totalMiles);
  const trips = flightIntelligence.computeTrips(flights);
  const wrapped = flightIntelligence.computeWrapped(flights, yearlyBreakdown);

  res.json({
    totalFlights,
    totalMiles,
    totalKm,
    earthCircumnavigations,
    moonTrips,
    estimatedHours,
    totalDaysAloft,
    carbonTons,
    averageDistanceMiles,
    averageDistanceKm,
    averageFlightHours,
    uniqueAirportsCount: airportSet.size,
    uniqueCountriesCount: countrySet.size,
    uniqueAirlinesCount: airlineSet.size,
    earliestFlight,
    latestFlight,
    timeSpan,
    longestFlight,
    shortestFlight,
    allAirlines,
    topAirlines: allAirlines.slice(0, 6),
    allAirports,
    topAirports: allAirports.slice(0, 6),
    topRoutes,
    yearlyBreakdown,
    busiestYear,
    monthlySeasonality,
    peakMonth: monthNames[peakMonthIndex],
    dayOfWeekDistribution,
    favoriteDay: dayNames[favoriteDayIndex],
    domesticVsInternational: {
      domestic: domesticCount,
      international: intlCount,
      domesticPercent: totalFlights > 0 ? Math.round((domesticCount / totalFlights) * 100) : 0,
      internationalPercent: totalFlights > 0 ? Math.round((intlCount / totalFlights) * 100) : 0
    },
    cabinBreakdown,
    fleetStats,
    badgeStats,
    trips,
    wrapped
  });
});

// Boarding Pass & Barcode Scanner Parser
app.post('/api/flights/parse-boarding-pass', requireAuth, (req, res) => {
  const { rawText } = req.body;
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'Boarding pass text is required' });
  }

  // Security: bound length to prevent regex ReDoS on long inputs
  const text = rawText.trim().slice(0, 4000);
  let parsed = null;

  // 1. Try standard IATA Bar Coded Boarding Pass (BCBP) format
  // E.g. M1PIKE/JAKE MR        EABC123 AUSMDWWN 0142 268Y012A0001 147
  const bcbpMatch = text.match(/(?:M[12][A-Z\/\s]+?[A-Z0-9]{6,7}\s*)?([A-Z]{3})([A-Z]{3})([A-Z0-9]{2})\s*([0-9]{1,4})\s*([0-9]{3})([A-Z])([0-9]{1,3}[A-Z])/i);
  if (bcbpMatch) {
    const origIata = bcbpMatch[1].toUpperCase();
    const destIata = bcbpMatch[2].toUpperCase();
    const airlineCode = bcbpMatch[3].toUpperCase();
    const flightNum = `${airlineCode} ${parseInt(bcbpMatch[4], 10)}`;
    const julianDay = parseInt(bcbpMatch[5], 10);
    const cabinCode = bcbpMatch[6].toUpperCase();
    const seat = bcbpMatch[7].toUpperCase().replace(/^0+/, '');

    let flightClass = 'Economy';
    if (['F', 'A', 'P'].includes(cabinCode)) {
      flightClass = 'First';
    } else if (['C', 'J', 'D', 'Z', 'I'].includes(cabinCode)) {
      flightClass = 'Business';
    } else if (['W', 'S'].includes(cabinCode)) {
      flightClass = 'Premium Economy';
    }

    let flightDate = new Date().toISOString().slice(0, 10);
    if (julianDay >= 1 && julianDay <= 366) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const d = new Date(Date.UTC(currentYear, 0, julianDay));
      // If date is > 45 days in future, it likely represents the previous year
      if (d.getTime() > now.getTime() + 45 * 86400000) {
        d.setUTCFullYear(currentYear - 1);
      }
      flightDate = d.toISOString().slice(0, 10);
    }

    const orig = db.prepare('SELECT * FROM airports WHERE iata = ?').get(origIata);
    const dest = db.prepare('SELECT * FROM airports WHERE iata = ?').get(destIata);
    const airlineRow = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(airlineCode);

    if (orig && dest) {
      const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);
      parsed = {
        flight_number: flightNum,
        airline: airlineRow ? airlineRow.name : airlineCode,
        airline_code: airlineCode,
        origin_iata: orig.iata,
        origin_name: orig.name,
        origin_city: orig.city,
        dest_iata: dest.iata,
        dest_name: dest.name,
        dest_city: dest.city,
        distance_miles: dist.miles,
        distance_km: dist.km,
        seat: seat,
        flight_class: flightClass,
        date: flightDate
      };
    }
  }

  // 2. Fallback: Parse generic airline confirmation text
  if (!parsed) {
    const flightMatch = text.match(/\b([A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])\s*([0-9]{1,4})\b/i);
    const routeMatch = text.match(/\b([A-Z]{3})\s*(?:to|->|–|-|\/|>)\s*([A-Z]{3})\b/i);
    const seatMatch = text.match(/\b(?:seat|assigned)\s*:?\s*([0-9]{1,3}[A-Z])\b/i);
    const dateMatch = text.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/](?:20)?\d{2})\b/);

    if (flightMatch && routeMatch) {
      const code = flightMatch[1].toUpperCase();
      const num = flightMatch[2];
      const origIata = routeMatch[1].toUpperCase();
      const destIata = routeMatch[2].toUpperCase();

      const orig = db.prepare('SELECT * FROM airports WHERE iata = ?').get(origIata);
      const dest = db.prepare('SELECT * FROM airports WHERE iata = ?').get(destIata);
      const airlineRow = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(code);

      if (orig && dest) {
        const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);
        let parsedDate = new Date().toISOString().slice(0, 10);
        if (dateMatch) {
          const parsedD = new Date(dateMatch[1]);
          if (!isNaN(parsedD.getTime())) {
            parsedDate = parsedD.toISOString().slice(0, 10);
          }
        }

        parsed = {
          flight_number: `${code} ${num}`,
          airline: airlineRow ? airlineRow.name : code,
          airline_code: code,
          origin_iata: orig.iata,
          origin_name: orig.name,
          origin_city: orig.city,
          dest_iata: dest.iata,
          dest_name: dest.name,
          dest_city: dest.city,
          distance_miles: dist.miles,
          distance_km: dist.km,
          seat: seatMatch ? seatMatch[1].toUpperCase() : '',
          flight_class: 'Economy',
          date: parsedDate
        };
      }
    }
  }

  if (!parsed) {
    return res.status(400).json({ error: 'Could not detect valid flight information from the provided boarding pass' });
  }

  res.json({ success: true, flight: parsed });
});

// 11. Export all flights to JSON (current user only)
app.get('/api/export', requireAuth, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  const flights = db.prepare('SELECT * FROM flights WHERE user_email = ? ORDER BY date ASC, id ASC').all(userEmail);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=flight_log_export.json');
  res.send(JSON.stringify(flights, null, 2));
});

// 12. Import flights from JSON (current user only)
app.post('/api/import', requireAuth, (req, res) => {
  const flights = req.body;
  if (!Array.isArray(flights)) {
    return res.status(400).json({ error: 'Payload must be an array of flights' });
  }

  if (flights.length > 5000) {
    return res.status(400).json({ error: 'Payload exceeds maximum limit of 5,000 flights per batch' });
  }

  const userEmail = req.user.email.toLowerCase();
  let imported = 0;
  const insert = db.prepare(`
    INSERT INTO flights (
      user_email, flight_number, airline, airline_code, date,
      origin_iata, origin_name, origin_city, origin_country, origin_lat, origin_lon,
      dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
      distance_miles, distance_km, aircraft, flight_class, seat, notes
    ) VALUES (
      @user_email, @flight_number, @airline, @airline_code, @date,
      @origin_iata, @origin_name, @origin_city, @origin_country, @origin_lat, @origin_lon,
      @dest_iata, @dest_name, @dest_city, @dest_country, @dest_lat, @dest_lon,
      @distance_miles, @distance_km, @aircraft, @flight_class, @seat, @notes
    )
  `);

  const runMany = db.transaction((rows) => {
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      if (!r.flight_number || !r.origin_iata || !r.dest_iata) continue;
      insert.run({
        user_email: userEmail,
        flight_number: String(r.flight_number).trim().slice(0, 30),
        airline: String(r.airline || 'Unknown').trim().slice(0, 100),
        airline_code: String(r.airline_code || '').trim().slice(0, 4),
        date: String(r.date || new Date().toISOString().split('T')[0]).trim().slice(0, 20),
        origin_iata: String(r.origin_iata).trim().slice(0, 4).toUpperCase(),
        origin_name: String(r.origin_name || '').trim().slice(0, 120),
        origin_city: String(r.origin_city || '').trim().slice(0, 80),
        origin_country: String(r.origin_country || '').trim().slice(0, 80),
        origin_lat: Number(r.origin_lat) || 0,
        origin_lon: Number(r.origin_lon) || 0,
        dest_iata: String(r.dest_iata).trim().slice(0, 4).toUpperCase(),
        dest_name: String(r.dest_name || '').trim().slice(0, 120),
        dest_city: String(r.dest_city || '').trim().slice(0, 80),
        dest_country: String(r.dest_country || '').trim().slice(0, 80),
        dest_lat: Number(r.dest_lat) || 0,
        dest_lon: Number(r.dest_lon) || 0,
        distance_miles: parseInt(r.distance_miles, 10) || 0,
        distance_km: parseInt(r.distance_km, 10) || 0,
        aircraft: String(r.aircraft || '').trim().slice(0, 60),
        flight_class: ['Economy', 'Premium Economy', 'Business', 'First'].includes(r.flight_class) ? r.flight_class : 'Economy',
        seat: String(r.seat || '').trim().slice(0, 10),
        notes: String(r.notes || '').trim().slice(0, 2000)
      });
      imported++;
    }
  });

  try {
    runMany(flights);
    res.json({ success: true, count: imported });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// 13. Reset samples for current user
app.post('/api/reset-samples', requireAuth, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  db.prepare('DELETE FROM flights WHERE user_email = ?').run(userEmail);

  // Seed sample flights directly for this user
  const samples = [
    { flight_number: 'UA 875', airline: 'United Airlines', airline_code: 'UA', date: '2023-04-12', orig: 'SFO', dest: 'HND', aircraft: 'Boeing 777-300ER', flight_class: 'Business', seat: '9A', notes: 'Cherry blossom vacation trip!' },
    { flight_number: 'NH 108', airline: 'All Nippon Airways', airline_code: 'NH', date: '2023-04-26', orig: 'HND', dest: 'SFO', aircraft: 'Boeing 787-9 Dreamliner', flight_class: 'Economy', seat: '24K', notes: 'Return flight over the Pacific' },
    { flight_number: 'AA 100', airline: 'American Airlines', airline_code: 'AA', date: '2023-09-15', orig: 'JFK', dest: 'LHR', aircraft: 'Boeing 777-200', flight_class: 'Premium Economy', seat: '14H', notes: 'London conference' },
    { flight_number: 'BA 179', airline: 'British Airways', airline_code: 'BA', date: '2023-09-22', orig: 'LHR', dest: 'JFK', aircraft: 'Airbus A350-1000', flight_class: 'Business', seat: '4K', notes: 'Club Suite flatbed' },
    { flight_number: 'DL 482', airline: 'Delta Air Lines', airline_code: 'DL', date: '2023-12-20', orig: 'JFK', dest: 'MIA', aircraft: 'Boeing 737-900ER', flight_class: 'Economy', seat: '18B', notes: 'Winter holiday getaway' },
    { flight_number: 'DL 923', airline: 'Delta Air Lines', airline_code: 'DL', date: '2023-12-29', orig: 'MIA', dest: 'ORD', aircraft: 'Airbus A321', flight_class: 'Economy', seat: '12F', notes: 'Visiting family' },
    { flight_number: 'UA 1190', airline: 'United Airlines', airline_code: 'UA', date: '2024-02-14', orig: 'ORD', dest: 'DEN', aircraft: 'Boeing 737 MAX 9', flight_class: 'Economy', seat: '21C', notes: 'Ski trip in Colorado' },
    { flight_number: 'UA 1754', airline: 'United Airlines', airline_code: 'UA', date: '2024-02-19', orig: 'DEN', dest: 'SFO', aircraft: 'Boeing 757-200', flight_class: 'Economy', seat: '19A', notes: 'Mountain views during takeoff' },
    { flight_number: 'SQ 31', airline: 'Singapore Airlines', airline_code: 'SQ', date: '2024-06-08', orig: 'SFO', dest: 'SIN', aircraft: 'Airbus A350-900ULR', flight_class: 'Premium Economy', seat: '32A', notes: 'Ultra long-haul non-stop over the Pacific' },
    { flight_number: 'SQ 231', airline: 'Singapore Airlines', airline_code: 'SQ', date: '2024-06-15', orig: 'SIN', dest: 'SYD', aircraft: 'Airbus A380-800', flight_class: 'Economy', seat: '54K', notes: 'Double decker A380 superjumbo' },
    { flight_number: 'QF 11', airline: 'Qantas', airline_code: 'QF', date: '2024-06-28', orig: 'SYD', dest: 'LAX', aircraft: 'Boeing 787-9', flight_class: 'Economy', seat: '40C', notes: 'Transpacific voyage back to the USA' },
    { flight_number: 'AS 1083', airline: 'Alaska Airlines', airline_code: 'AS', date: '2024-07-02', orig: 'LAX', dest: 'SEA', aircraft: 'Boeing 737-900', flight_class: 'First', seat: '2F', notes: 'Complimentary upgrade to First class!' }
  ];

  const getAirport = db.prepare('SELECT * FROM airports WHERE iata = ?');
  const insertFlight = db.prepare(`
    INSERT INTO flights (
      user_email, flight_number, airline, airline_code, date,
      origin_iata, origin_name, origin_city, origin_country, origin_lat, origin_lon,
      dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
      distance_miles, distance_km, aircraft, flight_class, seat, notes
    ) VALUES (
      @user_email, @flight_number, @airline, @airline_code, @date,
      @origin_iata, @origin_name, @origin_city, @origin_country, @origin_lat, @origin_lon,
      @dest_iata, @dest_name, @dest_city, @dest_country, @dest_lat, @dest_lon,
      @distance_miles, @distance_km, @aircraft, @flight_class, @seat, @notes
    )
  `);

  for (const s of samples) {
    const orig = getAirport.get(s.orig);
    const dest = getAirport.get(s.dest);
    if (!orig || !dest) continue;
    const dist = calculateDistance(orig.lat, orig.lon, dest.lat, dest.lon);
    insertFlight.run({
      user_email: userEmail,
      flight_number: s.flight_number,
      airline: s.airline,
      airline_code: s.airline_code,
      date: s.date,
      origin_iata: orig.iata,
      origin_name: orig.name,
      origin_city: orig.city,
      origin_country: orig.country,
      origin_lat: orig.lat,
      origin_lon: orig.lon,
      dest_iata: dest.iata,
      dest_name: dest.name,
      dest_city: dest.city,
      dest_country: dest.country,
      dest_lat: dest.lat,
      dest_lon: dest.lon,
      distance_miles: dist.miles,
      distance_km: dist.km,
      aircraft: s.aircraft,
      flight_class: s.flight_class,
      seat: s.seat,
      notes: s.notes
    });
  }

  const flights = db.prepare('SELECT * FROM flights WHERE user_email = ? ORDER BY date DESC').all(userEmail);
  res.json({ success: true, flights });
});

// Serve built client frontend if available
const clientDist = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  // Dedicated public legal routes
  app.get(['/privacy', '/privacy.html'], (req, res) => {
    const staticPrivacy = path.join(clientDist, 'privacy.html');
    res.setHeader('Cache-Control', 'no-cache');
    if (fs.existsSync(staticPrivacy)) {
      return res.sendFile(staticPrivacy);
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  app.get(['/termsofservice', '/termsofservice.html', '/terms', '/terms.html'], (req, res) => {
    const staticTerms = path.join(clientDist, 'termsofservice.html');
    res.setHeader('Cache-Control', 'no-cache');
    if (fs.existsSync(staticTerms)) {
      return res.sendFile(staticTerms);
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Fallback for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found' });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : (err.message || 'Server error')
  });
});

app.listen(PORT, () => {
  console.log(`Flight Tracker backend server running on http://localhost:${PORT}`);
});
