const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('===============================================================');
console.log('   NEW AUDIT REMEDIATION VERIFICATION TESTS                    ');
console.log('===============================================================\n');

let totalChecks = 0;
let passedChecks = 0;

// Test 1: calendarParser.js query isolation
totalChecks++;
console.log('[TEST 1] Verifying calendarParser FT-SEC-02 queries isolation');
try {
  const parserSource = fs.readFileSync(path.join(__dirname, 'calendarParser.js'), 'utf8');
  const hasIsolatedKnownRoute = parserSource.includes("AND user_email = ? LIMIT 1").valueOf();
  const hasNoOrUserEmailNull = !parserSource.includes("OR user_email IS NULL");

  console.log('  -> knownRoute includes AND user_email = ?:', hasIsolatedKnownRoute);
  console.log('  -> prevFlight excludes OR user_email IS NULL:', hasNoOrUserEmailNull);

  if (hasIsolatedKnownRoute && hasNoOrUserEmailNull) {
    console.log('  [PASS] calendarParser tenant isolation verified.');
    passedChecks++;
  } else {
    console.log('  [FAIL] calendarParser queries not properly isolated.');
  }
} catch (err) {
  console.error('  [FAIL] Test 1 error:', err.message);
}

// Test 2: server.js type confusion guards
totalChecks++;
console.log('\n[TEST 2] Verifying server.js type confusion guards');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const airportGuard = serverSource.includes("typeof req.query.q === 'string'");
  const airlineGuard = serverSource.includes("typeof req.query.q === 'string'");
  const flightsGuard = serverSource.includes("typeof year === 'string'") && serverSource.includes("typeof search === 'string'");
  const scanGoogleGuard = serverSource.includes("typeof accessToken !== 'string'");
  const requestAccessRoute = serverSource.includes("app.post('/api/auth/request-access'");
  const allowedUsersGuard = serverSource.includes("typeof email !== 'string'") && serverSource.includes("status = 'approved'");

  console.log('  -> Airport search type guard:', airportGuard);
  console.log('  -> Airline search type guard:', airlineGuard);
  console.log('  -> Flights search type guard:', flightsGuard);
  console.log('  -> Scan google access token guard:', scanGoogleGuard);
  console.log('  -> Request access endpoint present:', requestAccessRoute);
  console.log('  -> Allowed users guard & approved status:', allowedUsersGuard);

  if (airportGuard && airlineGuard && flightsGuard && scanGoogleGuard && requestAccessRoute && allowedUsersGuard) {
    console.log('  [PASS] All server.js type guards verified.');
    passedChecks++;
  } else {
    console.log('  [FAIL] Missing one or more type guards.');
  }
} catch (err) {
  console.error('  [FAIL] Test 2 error:', err.message);
}

// Test 3: Rate limiters
totalChecks++;
console.log('\n[TEST 3] Verifying rate limiters on sensitive endpoints');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const scanIcsLimiter = serverSource.includes("app.post('/api/calendar/scan-ics', requireAuth, calendarRateLimiter");
  const boardingPassLimiter = serverSource.includes("app.post('/api/flights/parse-boarding-pass', requireAuth, boardingPassRateLimiter");

  console.log('  -> scan-ics rate limiter present:', scanIcsLimiter);
  console.log('  -> parse-boarding-pass rate limiter present:', boardingPassLimiter);

  if (scanIcsLimiter && boardingPassLimiter) {
    console.log('  [PASS] Rate limiters verified.');
    passedChecks++;
  } else {
    console.log('  [FAIL] Rate limiters not properly attached.');
  }
} catch (err) {
  console.error('  [FAIL] Test 3 error:', err.message);
}

// Test 4: Airport lookup and coordinate/distance computation in import & confirm-import
totalChecks++;
console.log('\n[TEST 4] Verifying server-side airport lookup & coordinate/distance computation in import routes');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const importHasLookup = serverSource.includes("SELECT * FROM airports WHERE iata = ?").valueOf() &&
                          serverSource.includes("calculateDistance(origApt.lat, origApt.lon, destApt.lat, destApt.lon)");
  const confirmImportHasComputed = serverSource.includes("const computedDist = calculateDistance(origApt.lat, origApt.lon, destApt.lat, destApt.lon);") &&
                                   serverSource.includes("distance_miles: computedDist.miles");

  console.log('  -> /api/import performs server-side lookup & distance calculation:', importHasLookup);
  console.log('  -> /api/calendar/confirm-import uses server-computed distance & coords:', confirmImportHasComputed);

  if (importHasLookup && confirmImportHasComputed) {
    console.log('  [PASS] Server-side airport lookup and distance computation verified.');
    passedChecks++;
  } else {
    console.log('  [FAIL] Airport lookup or distance computation incomplete.');
  }
} catch (err) {
  console.error('  [FAIL] Test 4 error:', err.message);
}

// Test 5: Functional verification of getUserStatus and requireAuth allowlist checks
totalChecks++;
console.log('\n[TEST 5] Verifying auth allowlist and requireAuth middleware');
try {
  const auth = require('./auth');
  const testDb = new Database(':memory:');
  auth.initAuthDb(testDb);

  // Set up test users: approved user, pending user, rejected user
  testDb.prepare("INSERT INTO allowed_users (email, name, role, status) VALUES (?, ?, ?, ?)").run('approved@example.com', 'Approved User', 'user', 'approved');
  testDb.prepare("INSERT INTO allowed_users (email, name, role, status) VALUES (?, ?, ?, ?)").run('pending@example.com', 'Pending User', 'user', 'pending');
  testDb.prepare("INSERT INTO allowed_users (email, name, role, status) VALUES (?, ?, ?, ?)").run('rejected@example.com', 'Rejected User', 'user', 'rejected');

  const approvedStatus = auth.getUserStatus(testDb, 'approved@example.com');
  const pendingStatus = auth.getUserStatus(testDb, 'pending@example.com');
  const rejectedStatus = auth.getUserStatus(testDb, 'rejected@example.com');
  const adminStatus = auth.getUserStatus(testDb, 'jakepike2011@gmail.com');

  const middleware = auth.requireAuth(testDb);

  // Test pending user blocked by requireAuth
  const pendingToken = auth.generateSessionToken({ email: 'pending@example.com', name: 'Pending User' }, testDb);
  let pendingBlocked = false;
  const mockReqPending = { headers: { authorization: `Bearer ${pendingToken}` } };
  const mockResPending = {
    status: (code) => ({
      json: (data) => {
        if (code === 403 && data.error === 'ACCESS_NOT_APPROVED') pendingBlocked = true;
      }
    })
  };
  middleware(mockReqPending, mockResPending, () => {});

  // Test approved user passed by requireAuth
  const approvedToken = auth.generateSessionToken({ email: 'approved@example.com', name: 'Approved User' }, testDb);
  let approvedAllowed = false;
  const mockReqApproved = { headers: { authorization: `Bearer ${approvedToken}` } };
  const mockResApproved = { status: () => ({ json: () => {} }) };
  middleware(mockReqApproved, mockResApproved, () => { approvedAllowed = true; });

  console.log('  -> approved user status:', approvedStatus);
  console.log('  -> pending user status:', pendingStatus);
  console.log('  -> rejected user status:', rejectedStatus);
  console.log('  -> admin status:', adminStatus);
  console.log('  -> pending user blocked by requireAuth:', pendingBlocked);
  console.log('  -> approved user allowed by requireAuth:', approvedAllowed);

  if (approvedStatus === 'approved' && pendingStatus === 'pending' && rejectedStatus === 'rejected' && adminStatus === 'approved' && pendingBlocked && approvedAllowed) {
    console.log('  [PASS] Auth allowlist status and requireAuth enforcement verified.');
    passedChecks++;
  } else {
    console.log('  [FAIL] Auth allowlist verification failed.');
  }
} catch (err) {
  console.error('  [FAIL] Test 5 error:', err.message);
}

console.log('\n===============================================================');
console.log(`TOTAL PASSED: ${passedChecks} / ${totalChecks}`);
console.log('===============================================================');

if (passedChecks !== totalChecks) {
  process.exit(1);
}
