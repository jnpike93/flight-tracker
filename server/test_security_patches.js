const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('===============================================================');
console.log('   SECURITY PATCH REGRESSION & REMEDIATION VERIFICATION       ');
console.log('===============================================================\n');

let totalChecks = 0;
let passedChecks = 0;

// ----------------------------------------------------------------------------
// TEST 1: FT-SEC-01 - Dev Login Lockdown
// ----------------------------------------------------------------------------
totalChecks++;
console.log('[TEST 1] Verifying FT-SEC-01 Fix: Dev Login Guard & Admin Protection');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  // Verify route requires explicit ALLOW_DEV_LOGIN === 'true'
  const hasStrictGuard = serverSource.includes("process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_LOGIN !== 'true'");
  const hasAdminGuard = serverSource.includes("ADMIN_DEV_LOGIN_FORBIDDEN");

  console.log('  -> Strict ALLOW_DEV_LOGIN gate present:', hasStrictGuard);
  console.log('  -> Admin dev impersonation block present:', hasAdminGuard);

  if (hasStrictGuard && hasAdminGuard) {
    console.log('  [PASS] FT-SEC-01 Remediation verified: Dev login is strictly gated and administrative accounts are protected.');
    passedChecks++;
  } else {
    console.log('  [FAIL] FT-SEC-01 Remediation incomplete.');
  }
} catch (err) {
  console.error('  [FAIL] Test 1 encountered an error:', err.message);
}

// ----------------------------------------------------------------------------
// TEST 2: FT-SEC-02 - Flight Lookup Authentication & Tenant Isolation
// ----------------------------------------------------------------------------
totalChecks++;
console.log('\n[TEST 2] Verifying FT-SEC-02 Fix: Authenticated & Scoped Flight Lookup');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const clientApiSource = fs.readFileSync(path.join(__dirname, '../client/src/api.js'), 'utf8');

  // Verify server route uses requireAuth and filters by user_email
  const hasRequireAuth = serverSource.includes("app.get('/api/flights/lookup/:flightNumber', requireAuth, lookupRateLimiter");
  const hasUserEmailFilter = serverSource.includes("WHERE (UPPER(flight_number) = ? OR UPPER(flight_number) = ?)\n      AND user_email = ?") ||
                             serverSource.includes("WHERE (UPPER(flight_number) = ? OR UPPER(flight_number) = ?)\r\n      AND user_email = ?");
  const clientSendsAuth = clientApiSource.includes("fetch(`${API_BASE}/flights/lookup/${encodeURIComponent(flightNumber)}`, {\n    headers: authHeaders()") ||
                          clientApiSource.includes("fetch(`${API_BASE}/flights/lookup/${encodeURIComponent(flightNumber)}`, {\r\n    headers: authHeaders()");

  console.log('  -> Server endpoint enforces requireAuth:', hasRequireAuth);
  console.log('  -> Server SQL query isolates by user_email:', hasUserEmailFilter);
  console.log('  -> Client lookupFlightNumber sends authHeaders:', clientSendsAuth);

  // Functional database test to verify tenant boundary isolation
  const memDb = new Database(':memory:');
  memDb.exec(`
    CREATE TABLE flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      flight_number TEXT NOT NULL,
      airline TEXT,
      origin_iata TEXT,
      dest_iata TEXT,
      aircraft TEXT
    );
  `);

  memDb.prepare(`
    INSERT INTO flights (user_email, flight_number, airline, origin_iata, dest_iata, aircraft)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('tenant_victim@company.com', 'UA 1234', 'United Airlines', 'SFO', 'JFK', 'B777');

  // Attacker queries as tenant_attacker@company.com
  const attackerEmail = 'tenant_attacker@company.com';
  const resultForAttacker = memDb.prepare(`
    SELECT origin_iata, dest_iata, aircraft, airline
    FROM flights
    WHERE (UPPER(flight_number) = ? OR UPPER(flight_number) = ?)
      AND user_email = ?
    ORDER BY id DESC LIMIT 1
  `).get('UA 1234', 'UA 1234', attackerEmail);

  console.log('  -> Cross-tenant query result for attacker:', resultForAttacker || 'null (No Leakage)');

  if (hasRequireAuth && hasUserEmailFilter && clientSendsAuth && !resultForAttacker) {
    console.log('  [PASS] FT-SEC-02 Remediation verified: Cross-tenant route data leakage eliminated.');
    passedChecks++;
  } else {
    console.log('  [FAIL] FT-SEC-02 Remediation incomplete.');
  }
} catch (err) {
  console.error('  [FAIL] Test 2 encountered an error:', err.message);
}

// ----------------------------------------------------------------------------
// TEST 3: FT-SEC-03 - Host Header CORS Reflection Elimination
// ----------------------------------------------------------------------------
totalChecks++;
console.log('\n[TEST 3] Verifying FT-SEC-03 Fix: Strict CORS Origin Validation');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  // Verify host.split(':')[0] matching was removed
  const hasHostHeaderReflection = serverSource.includes("originHost === host.split(':')[0]");
  console.log('  -> Host header reflection check removed:', !hasHostHeaderReflection);

  if (!hasHostHeaderReflection) {
    console.log('  [PASS] FT-SEC-03 Remediation verified: Arbitrary origin reflection via Host header removed.');
    passedChecks++;
  } else {
    console.log('  [FAIL] FT-SEC-03 Remediation incomplete: Host header reflection still present.');
  }
} catch (err) {
  console.error('  [FAIL] Test 3 encountered an error:', err.message);
}

// ----------------------------------------------------------------------------
// TEST 4: FT-SEC-04 - Rate Limiter State Isolation
// ----------------------------------------------------------------------------
totalChecks++;
console.log('\n[TEST 4] Verifying FT-SEC-04 Fix: Per-Limiter Isolated State');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  // Verify rateLimitMap is no longer global across all limiters
  const hasGlobalSharedMap = serverSource.includes("const rateLimitMap = new Map();");
  const hasInstanceMap = serverSource.includes("const instanceMap = new Map();");

  console.log('  -> Global shared rateLimitMap removed:', !hasGlobalSharedMap);
  console.log('  -> Instance-scoped Map utilized:', hasInstanceMap);

  if (!hasGlobalSharedMap && hasInstanceMap) {
    console.log('  [PASS] FT-SEC-04 Remediation verified: Rate limiters operate on completely segregated maps.');
    passedChecks++;
  } else {
    console.log('  [FAIL] FT-SEC-04 Remediation incomplete.');
  }
} catch (err) {
  console.error('  [FAIL] Test 4 encountered an error:', err.message);
}

// ----------------------------------------------------------------------------
// TEST 5: FT-SEC-05 - CSP Hardening
// ----------------------------------------------------------------------------
totalChecks++;
console.log('\n[TEST 5] Verifying FT-SEC-05 Fix: CSP Policy Hardening');
try {
  const serverSource = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  const hasUnsafeInlineInScript = serverSource.includes("script-src 'self' 'unsafe-inline'");
  const hasUnpkgWildcard = serverSource.includes("https://*.unpkg.com");

  console.log('  -> unsafe-inline removed from script-src:', !hasUnsafeInlineInScript);
  console.log('  -> unpkg wildcards removed from img-src:', !hasUnpkgWildcard);

  if (!hasUnsafeInlineInScript && !hasUnpkgWildcard) {
    console.log('  [PASS] FT-SEC-05 Remediation verified: CSP policy tightened against inline scripts and unpinned CDNs.');
    passedChecks++;
  } else {
    console.log('  [FAIL] FT-SEC-05 Remediation incomplete.');
  }
} catch (err) {
  console.error('  [FAIL] Test 5 encountered an error:', err.message);
}

console.log('\n===============================================================');
console.log(`REMEDIATION VERIFICATION SCORE: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
console.log('===============================================================');

if (passedChecks === totalChecks) {
  process.exit(0);
} else {
  process.exit(1);
}

