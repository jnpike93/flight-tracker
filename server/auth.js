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
      status TEXT DEFAULT 'pending',
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
    if (!colNames.has('status')) {
      db.exec("ALTER TABLE allowed_users ADD COLUMN status TEXT DEFAULT 'approved'");
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

  // Explicitly ensure Primary Admin (jakepike2011@gmail.com) is in database with admin role and approved status
  try {
    db.prepare(`
      INSERT INTO allowed_users (email, name, added_by, role, status, first_login, last_login, login_count)
      VALUES ('jakepike2011@gmail.com', 'Jake Pike', 'system', 'admin', 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(email) DO UPDATE SET
        role = 'admin',
        status = 'approved',
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
    INSERT OR IGNORE INTO allowed_users (email, name, added_by, role, status)
    VALUES (?, ?, 'env', 'user', 'approved')
  `);

  for (const email of envAllowed) {
    insert.run(email, email);
  }
}

// Get user approval status: 'approved' | 'pending' | 'rejected' | null
function getUserStatus(db, email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  // Primary Admin is always approved
  if (cleanEmail === 'jakepike2011@gmail.com') return 'approved';

  // Environment admin list is always approved
  const adminList = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminList.includes(cleanEmail)) return 'approved';

  try {
    const row = db.prepare('SELECT status FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
    if (row && row.status) {
      return row.status;
    }
  } catch (_) {}

  return null;
}

// Check if user is approved to access the application
function isEmailApproved(db, email) {
  return getUserStatus(db, email) === 'approved';
}

// Record a user login attempt or session and return their approval status
function recordUserLoginRequest(db, { email, name, picture, method = 'google' }) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const isAdminUser = isAdmin(db, cleanEmail);

  try {
    const existing = db.prepare('SELECT email, status, first_login, login_count FROM allowed_users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      const currentStatus = isAdminUser ? 'approved' : (existing.status || 'pending');
      db.prepare(`
        UPDATE allowed_users
        SET name = COALESCE(?, name),
            picture = COALESCE(?, picture),
            last_login = CURRENT_TIMESTAMP,
            first_login = COALESCE(first_login, CURRENT_TIMESTAMP),
            login_count = COALESCE(login_count, 0) + 1,
            last_login_method = ?,
            status = ?
        WHERE LOWER(email) = ?
      `).run(name || null, picture || null, method, currentStatus, cleanEmail);

      return currentStatus;
    } else {
      // New user registration / login request: set status = 'pending' for manual approval
      const initialStatus = isAdminUser ? 'approved' : 'pending';
      db.prepare(`
        INSERT INTO allowed_users (email, name, picture, added_by, role, status, first_login, last_login, login_count, last_login_method)
        VALUES (?, ?, ?, 'login_request', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ?)
      `).run(cleanEmail, name || cleanEmail.split('@')[0], picture || null, isAdminUser ? 'admin' : 'user', initialStatus, method);

      return initialStatus;
    }
  } catch (err) {
    console.error('Failed to record login request:', err.message);
    return getUserStatus(db, cleanEmail) || 'pending';
  }
}

// Backward-compatible recordUserLogin
function recordUserLogin(db, opts) {
  return recordUserLoginRequest(db, opts);
}

// Update user approval status (Admin action)
function updateUserStatus(db, email, status) {
  if (!email) throw new Error('Email is required');
  const cleanEmail = email.trim().toLowerCase();
  if (!['approved', 'pending', 'rejected'].includes(status)) {
    throw new Error('Invalid status. Must be "approved", "pending", or "rejected".');
  }

  if (cleanEmail === 'jakepike2011@gmail.com' && status !== 'approved') {
    throw new Error('The primary system administrator status cannot be altered.');
  }

  db.prepare(`
    UPDATE allowed_users
    SET status = ?
    WHERE LOWER(email) = ?
  `).run(status, cleanEmail);

  return { email: cleanEmail, status };
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

// Check if an email is authorized & approved
function isEmailAllowed(db, email) {
  if (!email) return false;
  return isEmailApproved(db, email);
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
    { expiresIn: '30d', algorithm: 'HS256' }
  );
}

// Verify application JWT
function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

// Express Middleware to protect routes
function requireAuth(db) {
  return (req, res, next) => {
    // If auth is completely disabled via env (optional local development bypass only)
    if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      req.user = { email: 'admin@local', name: 'Local Admin', isAdmin: true };
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

    // Verify user is approved
    const status = getUserStatus(db, decoded.email);
    if (status !== 'approved') {
      return res.status(403).json({
        error: 'ACCESS_NOT_APPROVED',
        status: status || 'pending',
        message: status === 'rejected'
          ? 'Your access request has been declined by the administrator.'
          : 'Your account is awaiting manual approval from the administrator.'
      });
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
  isEmailApproved,
  getUserStatus,
  recordUserLoginRequest,
  recordUserLogin,
  updateUserStatus,
  verifyGoogleToken,
  generateSessionToken,
  verifySessionToken,
  requireAuth,
  requireAdmin
};

