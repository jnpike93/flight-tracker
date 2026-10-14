const Database = require('better-sqlite3');
const auth = require('./auth');

async function runTests() {
  console.log('--- RUNNING ADMIN PORTAL & USER DIRECTORY TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Setup in-memory test database
  const db = new Database(':memory:');

  // Initialize schema
  auth.initAuthDb(db);

  db.exec(`
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
  `);

  // Test 1: Primary admin initialized
  const adminRow = db.prepare('SELECT * FROM allowed_users WHERE email = ?').get('jakepike2011@gmail.com');
  assert(adminRow !== undefined, 'Primary admin exists in allowed_users');
  assert(adminRow.role === 'admin', 'Primary admin has admin role');
  assert(adminRow.login_count >= 1, 'Primary admin backfilled with login count >= 1');
  assert(auth.isAdmin(db, 'jakepike2011@gmail.com') === true, 'auth.isAdmin returns true for primary admin');

  // Test 2: Add seed flight data for primary admin
  db.prepare(`
    INSERT INTO flights (
      flight_number, airline, date, origin_iata, origin_name, origin_city, origin_country,
      origin_lat, origin_lon, dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
      distance_miles, distance_km, user_email
    ) VALUES (
      'UA 100', 'United Airlines', '2025-05-10', 'ORD', 'O''Hare', 'Chicago', 'United States',
      41.9742, -87.9073, 'LAX', 'Los Angeles Intl', 'Los Angeles', 'United States', 33.9425, -118.4081,
      1744, 2807, 'jakepike2011@gmail.com'
    )
  `).run();

  // Test 3: Add a second user who is allowed and has authenticated, but NO flights
  auth.recordUserLogin(db, {
    email: 'auth_noflights@example.com',
    name: 'Auth NoFlights',
    picture: 'https://example.com/pic1.jpg',
    method: 'google'
  });

  const user2 = db.prepare('SELECT * FROM allowed_users WHERE email = ?').get('auth_noflights@example.com');
  assert(user2 !== undefined, 'User 2 recorded in allowed_users');
  assert(user2.login_count === 1, 'User 2 has login_count 1');
  assert(user2.last_login !== null, 'User 2 has last_login timestamp');

  // Test 4: Add a third user who has flight data in flights table, but NEVER logged in
  db.prepare(`
    INSERT INTO flights (
      flight_number, airline, date, origin_iata, origin_name, origin_city, origin_country,
      origin_lat, origin_lon, dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
      distance_miles, distance_km, user_email
    ) VALUES (
      'DL 200', 'Delta Air Lines', '2024-03-15', 'ATL', 'Hartsfield-Jackson', 'Atlanta', 'United States',
      33.6407, -84.4277, 'JFK', 'John F Kennedy', 'New York', 'United States', 40.6413, -73.7781,
      760, 1223, 'imported_user@example.com'
    )
  `).run();

  // Test 5: Verify the Admin Users Aggregation query
  // Simulate the admin endpoint logic
  const dbUsers = db.prepare('SELECT * FROM allowed_users').all();
  const flightStatsByUser = db.prepare(`
    SELECT
      LOWER(user_email) as email,
      COUNT(*) as flight_count,
      COALESCE(SUM(distance_miles), 0) as total_distance_miles,
      COALESCE(SUM(distance_km), 0) as total_distance_km
    FROM flights
    WHERE user_email IS NOT NULL AND TRIM(user_email) != ''
    GROUP BY LOWER(user_email)
  `).all();

  const allEmails = new Set();
  dbUsers.forEach(u => allEmails.add(u.email.toLowerCase()));
  flightStatsByUser.forEach(f => allEmails.add(f.email.toLowerCase()));

  const dbUserMap = new Map(dbUsers.map(u => [u.email.toLowerCase(), u]));
  const flightMap = new Map(flightStatsByUser.map(f => [f.email.toLowerCase(), f]));

  const users = Array.from(allEmails).map(email => {
    const u = dbUserMap.get(email);
    const f = flightMap.get(email);
    const loginCount = u?.login_count || 0;
    const hasAuth = Boolean(loginCount > 0 || u?.last_login);
    const hasData = Boolean(f && f.flight_count > 0);
    return {
      email,
      hasAuthenticated: hasAuth,
      hasData,
      flightCount: f?.flight_count || 0
    };
  });

  const jake = users.find(u => u.email === 'jakepike2011@gmail.com');
  assert(jake && jake.hasAuthenticated === true && jake.hasData === true, 'Primary Admin: hasAuthenticated = true AND hasData = true');

  const u2 = users.find(u => u.email === 'auth_noflights@example.com');
  assert(u2 && u2.hasAuthenticated === true && u2.hasData === false, 'User 2: hasAuthenticated = true AND hasData = false');

  const u3 = users.find(u => u.email === 'imported_user@example.com');
  assert(u3 && u3.hasAuthenticated === false && u3.hasData === true, 'User 3: hasAuthenticated = false AND hasData = true');

  // Summary counts
  const totalUsers = users.length;
  const totalAuth = users.filter(u => u.hasAuthenticated).length;
  const totalWithData = users.filter(u => u.hasData).length;
  const totalBoth = users.filter(u => u.hasAuthenticated && u.hasData).length;

  assert(totalUsers === 3, `Total users discovered: ${totalUsers} (expected 3)`);
  assert(totalAuth === 2, `Total authenticated users: ${totalAuth} (expected 2)`);
  assert(totalWithData === 2, `Total users with flight data: ${totalWithData} (expected 2)`);
  assert(totalBoth === 1, `Total authenticated users with data: ${totalBoth} (expected 1: Jake)`);

  // Test 6: Primary Admin protection
  assert(auth.isAdmin(db, 'jakepike2011@gmail.com') === true, 'Primary Admin cannot be stripped of admin rights');
  assert(auth.isEmailApproved(db, 'jakepike2011@gmail.com') === true, 'Primary Admin is always approved');
  let threwOnAdminDemote = false;
  try {
    auth.updateUserStatus(db, 'jakepike2011@gmail.com', 'rejected');
  } catch (e) {
    threwOnAdminDemote = true;
  }
  assert(threwOnAdminDemote, 'Cannot decline or demote Primary Admin');

  // Test 7: Manual User Approval Workflow
  const pendingEmail = 'newcomer@example.com';
  // New sign-in request
  const newStatus = auth.recordUserLoginRequest(db, {
    email: pendingEmail,
    name: 'Newcomer Dev',
    picture: 'https://example.com/avatar.png',
    method: 'google'
  });

  assert(newStatus === 'pending', 'New unknown user initial status is "pending"');
  assert(auth.getUserStatus(db, pendingEmail) === 'pending', 'getUserStatus returns "pending"');
  assert(auth.isEmailApproved(db, pendingEmail) === false, 'New user is NOT approved before admin action');

  // Admin approves the user
  const approvedResult = auth.updateUserStatus(db, pendingEmail, 'approved');
  assert(approvedResult.status === 'approved', 'updateUserStatus returned approved');
  assert(auth.isEmailApproved(db, pendingEmail) === true, 'User is now approved');

  // Subsequent login preserves approved status
  const repeatLoginStatus = auth.recordUserLoginRequest(db, {
    email: pendingEmail,
    name: 'Newcomer Dev',
    picture: 'https://example.com/avatar.png',
    method: 'google'
  });
  assert(repeatLoginStatus === 'approved', 'Subsequent login retains approved status');

  // Admin rejects or suspends user
  auth.updateUserStatus(db, pendingEmail, 'rejected');
  assert(auth.isEmailApproved(db, pendingEmail) === false, 'User is blocked after rejection');
  assert(auth.getUserStatus(db, pendingEmail) === 'rejected', 'getUserStatus returns "rejected"');

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
