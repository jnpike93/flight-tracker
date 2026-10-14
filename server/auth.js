const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set in production.');
  }
  console.warn('⚠️  [SECURITY WARNING] JWT_SECRET is not configured in .env. Generating ephemeral secure key for this session.');
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Initialize allowed_users table in SQLite
function initAuthDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS allowed_users (
      email TEXT PRIMARY KEY,
      name TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      added_by TEXT,
      role TEXT DEFAULT 'user'
    );
  `);

  // Ensure role column exists if upgrading an existing database
  try {
    const columns = db.prepare("PRAGMA table_info(allowed_users)").all();
    if (!columns.some(c => c.name === 'role')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN role TEXT DEFAULT 'user'");
    }
  } catch (_) {}

  // Explicitly ensure Primary Admin (jakepike2011@gmail.com) is in database with admin role
  try {
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by, role)
      VALUES ('jakepike2011@gmail.com', 'Jake Pike', 'system', 'admin')
      ON CONFLICT(email) DO UPDATE SET role = 'admin'
    `).run();
  } catch (_) {}

  // Seed initial allowed emails from env if provided
  const envAllowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO allowed_users (email, name, added_by, role)
    VALUES (?, ?, 'env', 'user')
  `);

  for (const email of envAllowed) {
    insert.run(email, email);
  }
}

// Check if an email is an administrator
function isAdmin(db, email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Primary Dedicated Admin
  if (cleanEmail === 'jakepike2011@gmail.com') return true;

  // 2. Env configured admin emails
  const adminList = (process.env.ADMIN_EMAILS || process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.includes(cleanEmail)) return true;

  // 3. Database check (role = 'admin' or initial_setup)
  try {
    const row = db.prepare('SELECT role, added_by FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
    if (row && (row.role === 'admin' || row.added_by === 'initial_setup' || row.added_by === 'env')) {
      return true;
    }
  } catch (_) {}

  return false;
}

// Check if an email is authorized
function isEmailAllowed(db, email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // Check .env allowed list first
  const envAllowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (envAllowed.includes(cleanEmail)) return true;

  // Wildcard domain match (e.g. *@mycompany.com)
  for (const pattern of envAllowed) {
    if (pattern.startsWith('*@') && cleanEmail.endsWith(pattern.substring(1))) {
      return true;
    }
  }

  // Check database allowed_users table
  const row = db.prepare('SELECT email FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
  if (row) return true;

  // If NO allowed users exist anywhere yet (first setup), auto-allow the first user and record them as admin
  const totalCount = db.prepare('SELECT count(*) as count FROM allowed_users').get().count;
  if (envAllowed.length === 0 && totalCount === 0) {
    db.prepare('INSERT INTO allowed_users (email, name, added_by) VALUES (?, ?, ?)')
      .run(cleanEmail, cleanEmail, 'initial_setup');
    return true;
  }

  return false;
}

// Verify Google Token or mock test token
async function verifyGoogleToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in server environment');
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google credential token payload');
  }

  // Security: Assert that Google has verified this email address
  if (!payload.email_verified) {
    throw new Error('Unverified email address. Google accounts must have a verified email to sign in.');
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email,
    picture: payload.picture || '',
    googleId: payload.sub
  };
}

// Issue application JWT
function generateSessionToken(user, db) {
  const isUserAdmin = (user.email && user.email.toLowerCase() === 'jakepike2011@gmail.com') ||
    (db ? isAdmin(db, user.email) : !!user.isAdmin);

  return jwt.sign(
    {
      email: user.email.toLowerCase(),
      name: user.name,
      picture: user.picture,
      isAdmin: isUserAdmin,
      role: isUserAdmin ? 'admin' : 'user'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Verify application JWT
function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Express Middleware to protect routes
function requireAuth(db) {
  return (req, res, next) => {
    // If auth is completely disabled via env (optional local development bypass only)
    if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      req.user = { email: 'admin@local', name: 'Local Admin' };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifySessionToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Session expired or invalid. Please sign in again.' });
    }

    // Verify user is still in the allowlist
    if (!isEmailAllowed(db, decoded.email)) {
      return res.status(403).json({ error: 'ACCESS_REVOKED', message: 'Your account access has been revoked.' });
    }

    req.user = decoded;
    next();
  };
}

// Express Middleware to enforce Administrator role
function requireAdmin(db) {
  return (req, res, next) => {
    if (!req.user || !isAdmin(db, req.user.email)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Administrator privileges required to manage access permissions.'
      });
    }
    next();
  };
}

module.exports = {
  initAuthDb,
  isAdmin,
  isEmailAllowed,
  verifyGoogleToken,
  generateSessionToken,
  verifySessionToken,
  requireAuth,
  requireAdmin
};

