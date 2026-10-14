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
      role TEXT DEFAULT 'user',
      picture TEXT,
      first_login DATETIME,
      last_login DATETIME,
      login_count INTEGER DEFAULT 0,
      last_login_method TEXT DEFAULT 'google'
    );
  `);

  // Ensure upgrade columns exist if upgrading an existing database
  try {
    const columns = db.prepare("PRAGMA table_info(allowed_users)").all();
    const colNames = new Set(columns.map(c => c.name));

    if (!colNames.has('role')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN role TEXT DEFAULT 'user'");
    }
    if (!colNames.has('picture')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN picture TEXT");
    }
    if (!colNames.has('first_login')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN first_login DATETIME");
    }
    if (!colNames.has('last_login')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN last_login DATETIME");
    }
    if (!colNames.has('login_count')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN login_count INTEGER DEFAULT 0");
    }
    if (!colNames.has('last_login_method')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN last_login_method TEXT DEFAULT 'google'");
    }
  } catch (_) {}

  // Explicitly ensure Primary Admin (jakepike2011@gmail.com) is in database with admin role
  try {
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by, role, first_login, last_login, login_count)
      VALUES ('jakepike2011@gmail.com', 'Jake Pike', 'system', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(email) DO UPDATE SET
        role = 'admin',
        login_count = CASE WHEN login_count IS NULL OR login_count = 0 THEN 1 ELSE login_count END,
        first_login = COALESCE(first_login, CURRENT_TIMESTAMP),
        last_login = COALESCE(last_login, CURRENT_TIMESTAMP)
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

// Record an authenticated user session
function recordUserLogin(db, { email, name, picture, method = 'google' }) {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const isAdminUser = isAdmin(db, cleanEmail);

  try {
    const existing = db.prepare('SELECT email, first_login, login_count FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      db.prepare(`
        UPDATE allowed_users
        SET name = COALESCE(?, name),
            picture = COALESCE(?, picture),
            last_login = CURRENT_TIMESTAMP,
            first_login = COALESCE(first_login, CURRENT_TIMESTAMP),
            login_count = COALESCE(login_count, 0) + 1,
            last_login_method = ?
        WHERE LOWER(email) = ?
      `).run(name || null, picture || null, method, cleanEmail);
    } else {
      db.prepare(`
        INSERT INTO allowed_users (email, name, picture, added_by, role, first_login, last_login, login_count, last_login_method)
        VALUES (?, ?, ?, 'login', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)
      `).run(cleanEmail, name || cleanEmail.split('@')[0], picture || null, isAdminUser ? 'admin' : 'user', method);
    }
  } catch (err) {
    console.error('Failed to record user login:', err.message);
  }
}

// Check if an email is an administrator
function isAdmin(db, email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Primary Dedicated System Administrator
  if (cleanEmail === 'jakepike2011@gmail.com') return true;

  // 2. Explicitly configured ADMIN_EMAILS environment variable
  const adminList = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.includes(cleanEmail)) return true;

  // 3. Database check strictly for role = 'admin'
  try {
    const row = db.prepare('SELECT role FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
    if (row && row.role === 'admin') {
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
    if (pattern.startsWith('*@')) {
      const allowedDomain = pattern.slice(2);
      const emailDomain = cleanEmail.split('@')[1];
      if (emailDomain && emailDomain === allowedDomain) {
        return true;
      }
    }
  }

  // Check database allowed_users table
  const row = db.prepare('SELECT email FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
  if (row) return true;

  // If NO allowed users exist anywhere yet (first setup fallback), auto-allow the first user and record them as admin
  const totalCount = db.prepare('SELECT count(*) as count FROM allowed_users').get().count;
  if (envAllowed.length === 0 && totalCount === 0) {
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by, role)
      VALUES (?, ?, 'initial_setup', 'admin')
    `).run(cleanEmail, cleanEmail);
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
  requireAdmin,
  recordUserLogin
};

