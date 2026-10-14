const db = require('better-sqlite3')('server/flight_tracker.db');
const parser = require('./calendarParser');

console.log('--- 1. Testing Airport Lookups ---');
console.log('findAirportByFuzzyCity("Port Douglas"):', parser.findAirportByFuzzyCity('Port Douglas', db));
console.log('findAirportFromText("Port Douglas"):', parser.findAirportFromText('Port Douglas', db));
console.log('findAirportFromText("Oak Crk Dr, Austin, TX"):', parser.findAirportFromText('Oak Crk Dr, Austin, TX', db));
console.log('findAirportFromText("Battle Creek, MI"):', parser.findAirportFromText('Battle Creek, MI', db));
console.log('findAirportFromText("Sydney Airport (SYD)"):', parser.findAirportFromText('Sydney Airport (SYD)', db)?.iata);
console.log('findAirportFromText("Cairns"):', parser.findAirportFromText('Cairns', db)?.iata);
console.log('findAirportFromText("Kansas City"):', parser.findAirportFromText('Kansas City', db)?.iata);
console.log('findAirportFromText("Austin"):', parser.findAirportFromText('Austin', db)?.iata);

console.log('\n--- 2. Testing Misimport Scenarios ---');
const ev1 = {
  summary: 'Flight to Cairns (VA 1413)',
  location: 'Port Douglas, Queensland',
  date: '2024-03-12'
};
const res1 = parser.extractFlightFromEvent(ev1, db, 'test@test.com');
console.log('Event with Port Douglas location:', res1 ? `${res1.flight_number}: ${res1.origin_iata} -> ${res1.dest_iata}` : 'NULL');

const ev2 = {
  summary: 'Flight to Austin (WN 636)',
  location: 'Oak Crk Dr, Austin, TX',
  date: '2024-02-16'
};
const res2 = parser.extractFlightFromEvent(ev2, db, 'test@test.com');
console.log('Event with Oak Crk location:', res2 ? `${res2.flight_number}: ${res2.origin_iata} -> ${res2.dest_iata}` : 'NULL');

const ev3 = {
  summary: 'Drive to Port Douglas',
  description: 'Rental car trip to Port Douglas',
  date: '2024-03-13'
};
const res3 = parser.extractFlightFromEvent(ev3, db, 'test@test.com');
console.log('Drive to Port Douglas (should be NULL):', res3 ? 'DETECTED' : 'NULL');

const ev4 = {
  summary: 'Cabin at Oak Creek',
  description: 'Weekend stay at Oak Crk cabin',
  date: '2024-05-01'
};
const res4 = parser.extractFlightFromEvent(ev4, db, 'test@test.com');
console.log('Cabin at Oak Creek (should be NULL):', res4 ? 'DETECTED' : 'NULL');

console.log('\n--- 3. Testing Legitimate Flights ---');
const legitEvents = [
  { summary: 'Flight to Chicago (FI 853)', location: 'Keflavik International Airport (KEF)', date: '2026-08-23' },
  { summary: 'Flight to Reykjavik (FI 852)', location: "O'Hare International Airport (ORD)", date: '2026-08-14' },
  { summary: 'Flight: Chicago - Reykjavík', description: 'Icelandair FI 852', date: '2026-08-14' },
  { summary: 'Flight to Chicago (UA 1641)', location: 'Kansas City International Airport (MCI)', date: '2026-05-24' },
  { summary: 'Virgin Australia VA 770 CNS to BNE', date: '2024-03-14' },
  { summary: 'Jetstar Airways JQ 133 OOL -> AKL', date: '2024-03-16' },
  { summary: 'Air New Zealand NZ 1220 ZQN -> AKL', date: '2024-03-22' },
  { summary: 'Delta Air Lines DL 64 AKL -> LAX', date: '2024-03-23' },
  { summary: 'Flight: Sydney to Auckland on Air New Zealand', date: '2024-01-15' },
  { summary: 'Flight to Auckland (NZ 102)', location: 'Sydney Airport (SYD)', date: '2024-01-15' },
  { summary: 'Southwest Flight WN254 Kansas City to Austin', date: '2024-10-11' },
  { summary: 'Flight to Austin (WN 4282)', date: '2024-08-16' },
  { summary: 'Flight to Kansas City (WN 3131)', date: '2024-08-25' }
];

let legitPass = 0;
for (const ev of legitEvents) {
  const r = parser.extractFlightFromEvent(ev, db, 'test@test.com');
  if (r) {
    console.log(`[PASS]: ${ev.summary} => ${r.flight_number} (${r.origin_iata} -> ${r.dest_iata})`);
    legitPass++;
  } else {
    console.log(`[FAIL]: ${ev.summary}`);
  }
}

console.log(`\nLegitimate Flights Score: ${legitPass} / ${legitEvents.length}`);

