const db = require('better-sqlite3')('server/flight_tracker.db');
const { extractFlightFromEvent } = require('./calendarParser');

const falsePositives = [
  'Reservation at Char Bar',
  'Your memories from this day',
  'Pha-Ly',
  'Pha-ly',
  'Stay at The St. Anthony, A Luxury Collection Hotel, San Antonio',
  'Dinner at Luties',
  'Hotel booking at Marriott Downtown',
  'Meeting with Dave 10:00 - 11:00',
  'Intro to Team',
  'Road trip to Denver',
  'Drive to grandma',
  'Drive to Port Douglas',
  'Rental car to Port Douglas',
  'Cabin at Oak Creek',
  'Freshwater Creek hike',
  'Day trip to Battle Creek'
];

const truePositives = [
  { summary: 'Flight to Chicago (FI 853)', location: 'Keflavik International Airport (KEF)', date: '2026-08-23' },
  { summary: 'Flight to Reykjavik (FI 852)', location: "O'Hare International Airport (ORD)", date: '2026-08-14' },
  { summary: 'Flight: Chicago - Reykjavík', description: 'Icelandair FI 852', date: '2026-08-14' },
  { summary: 'Flight to Chicago (UA 1641)', location: 'Kansas City International Airport (MCI)', date: '2026-05-24' },
  { summary: 'Virgin Australia VA 770 CNS to BNE', date: '2024-03-14' },
  { summary: 'Jetstar Airways JQ 133 OOL -> AKL', date: '2024-03-16' },
  { summary: 'Air New Zealand NZ 1220 ZQN -> AKL', date: '2024-03-22' },
  { summary: 'Delta Air Lines DL 64 AKL -> LAX', date: '2024-03-23' },
  { summary: 'Flight: Sydney to Auckland on Air New Zealand', date: '2024-01-15' },
  { summary: 'Flight to Aukland (NZ 102)', location: 'Sydney Airport (SYD)', date: '2024-01-15' },
  { summary: 'Southwest Flight WN254 Kansas City to Austin', date: '2024-10-11' },
  { summary: 'Flight to Austin (WN 4282)', date: '2024-08-16' },
  { summary: 'Flight to Kansas City (WN 3131)', date: '2024-08-25' }
];

console.log('--- Testing False Positives (Should all be NULL) ---');
let fpFailed = 0;
for (const title of falsePositives) {
  const res = extractFlightFromEvent({ summary: title }, db, 'test@test.com');
  if (res) {
    console.log('[FAIL - Unexpectedly Detected]:', title, '=>', res);
    fpFailed++;
  } else {
    console.log('[PASS - Correctly Blocked]:', title);
  }
}

console.log('\n--- Testing True Positives (Should all PASS) ---');
let tpFailed = 0;
for (const ev of truePositives) {
  const res = extractFlightFromEvent(ev, db, 'test@test.com');
  if (!res) {
    console.log('[FAIL - Missed Flight]:', ev.summary);
    tpFailed++;
  } else {
    console.log('[PASS - Flight Detected]:', ev.summary, '=>', res.flight_number, '|', res.airline, '|', res.origin_iata, '->', res.dest_iata);
  }
}

console.log('\n--- Testing Misimport Safeguards (CRK and POM) ---');
const misimportChecks = [
  {
    ev: { summary: 'Flight to Cairns (VA 1413)', location: 'Port Douglas, Queensland', date: '2024-03-12' },
    disallowedOrigin: 'POM',
    disallowedDest: 'POM',
    expectedOrigin: 'SYD',
    expectedDest: 'CNS'
  },
  {
    ev: { summary: 'Flight to Austin (WN 636)', location: 'Oak Crk Dr, Austin, TX', date: '2024-02-16' },
    disallowedOrigin: 'CRK',
    disallowedDest: 'CRK',
    expectedOrigin: 'MCI',
    expectedDest: 'AUS'
  }
];

let misimportPassed = 0;
for (const check of misimportChecks) {
  const res = extractFlightFromEvent(check.ev, db, 'test@test.com');
  if (res && res.origin_iata !== check.disallowedOrigin && res.dest_iata !== check.disallowedDest &&
      res.origin_iata === check.expectedOrigin && res.dest_iata === check.expectedDest) {
    console.log(`[PASS - Safeguard Succeeded]: ${check.ev.summary} => ${res.flight_number} (${res.origin_iata} -> ${res.dest_iata})`);
    misimportPassed++;
  } else {
    console.log(`[FAIL - Safeguard Failed]: ${check.ev.summary} =>`, res);
  }
}

console.log('\nFinal Score:');
console.log('False positives blocked:', falsePositives.length - fpFailed, '/', falsePositives.length);
console.log('True flights detected:', truePositives.length - tpFailed, '/', truePositives.length);
console.log('Misimport safeguards:', misimportPassed, '/', misimportChecks.length);

if (fpFailed > 0 || tpFailed > 0 || misimportPassed < misimportChecks.length) {
  process.exit(1);
}
