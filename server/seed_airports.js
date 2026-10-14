const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'flight_tracker.db');
const db = new Database(dbPath);

console.log('Setting up SQLite schema...');

// Create tables
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

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

// Distance calculation (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of the Earth in miles
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

async function populateAirportsAndAirlines() {
  const airportCount = db.prepare('SELECT count(*) as count FROM airports').get().count;
  if (airportCount > 500) {
    console.log(`Airports already seeded (${airportCount} records). Skipping download.`);
  } else {
    console.log('Downloading OpenFlights airport database...');
    try {
      const res = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat');
      const text = await res.text();
      const lines = text.split('\n');
      console.log(`Downloaded ${lines.length} airport entries. Parsing...`);

      const insert = db.prepare(`
        INSERT OR REPLACE INTO airports (iata, icao, name, city, country, lat, lon, altitude)
        VALUES (@iata, @icao, @name, @city, @country, @lat, @lon, @altitude)
      `);

      const insertMany = db.transaction((records) => {
        for (const r of records) insert.run(r);
      });

      const records = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = parseCsvLine(line);
        // cols: 0:id, 1:name, 2:city, 3:country, 4:iata, 5:icao, 6:lat, 7:lon, 8:alt
        const iata = cols[4]?.replace(/\\N/g, '').trim();
        if (!iata || iata.length !== 3) continue; // Only commercial IATA airports

        records.push({
          iata: iata.toUpperCase(),
          icao: cols[5]?.replace(/\\N/g, '').trim() || '',
          name: cols[1]?.replace(/^"|"$/g, '').trim() || '',
          city: cols[2]?.replace(/^"|"$/g, '').trim() || '',
          country: cols[3]?.replace(/^"|"$/g, '').trim() || '',
          lat: parseFloat(cols[6]) || 0,
          lon: parseFloat(cols[7]) || 0,
          altitude: parseInt(cols[8], 10) || 0
        });
      }

      insertMany(records);
      console.log(`Successfully stored ${records.length} IATA airports.`);
    } catch (err) {
      console.error('Failed to download airports from openflights:', err.message);
      insertFallbackAirports();
    }
  }

  // Airlines
  const airlineCount = db.prepare('SELECT count(*) as count FROM airlines').get().count;
  if (airlineCount > 100) {
    console.log(`Airlines already seeded (${airlineCount} records). Skipping download.`);
  } else {
    console.log('Downloading OpenFlights airlines database...');
    try {
      const res = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat');
      const text = await res.text();
      const lines = text.split('\n');

      const insertAirline = db.prepare(`
        INSERT OR REPLACE INTO airlines (iata, icao, name, callsign, country)
        VALUES (@iata, @icao, @name, @callsign, @country)
      `);

      const insertManyAirlines = db.transaction((records) => {
        for (const r of records) insertAirline.run(r);
      });

      const records = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const cols = parseCsvLine(line);
        // cols: 0:id, 1:name, 2:alias, 3:iata, 4:icao, 5:callsign, 6:country, 7:active
        const iata = cols[3]?.replace(/\\N/g, '').trim();
        const active = cols[7]?.trim();
        if (!iata || iata.length !== 2 || active === 'N') continue;

        records.push({
          iata: iata.toUpperCase(),
          icao: cols[4]?.replace(/\\N/g, '').trim() || '',
          name: cols[1]?.replace(/^"|"$/g, '').trim() || '',
          callsign: cols[5]?.replace(/\\N/g, '').trim() || '',
          country: cols[6]?.replace(/\\N/g, '').trim() || ''
        });
      }

      insertManyAirlines(records);
      console.log(`Successfully stored ${records.length} active airlines.`);
    } catch (err) {
      console.error('Failed to download airlines:', err.message);
      insertFallbackAirlines();
    }
  }

  // Flights table starts completely clean
  const flightsCount = db.prepare('SELECT count(*) as count FROM flights').get().count;
  console.log(`Flights database ready (${flightsCount} flights).`);
}

function insertFallbackAirports() {
  const fallback = [
    { iata: 'JFK', icao: 'KJFK', name: 'John F Kennedy International Airport', city: 'New York', country: 'United States', lat: 40.6398, lon: -73.7789, altitude: 13 },
    { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', lat: 33.9425, lon: -118.4081, altitude: 125 },
    { iata: 'ORD', icao: 'KORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States', lat: 41.9786, lon: -87.9048, altitude: 672 },
    { iata: 'SFO', icao: 'KSFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', lat: 37.6189, lon: -122.375, altitude: 13 },
    { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', lat: 51.4706, lon: -0.4619, altitude: 83 },
    { iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle International Airport', city: 'Paris', country: 'France', lat: 49.0128, lon: 2.55, altitude: 392 },
    { iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda International Airport', city: 'Tokyo', country: 'Japan', lat: 35.5523, lon: 139.7797, altitude: 35 },
    { iata: 'NRT', icao: 'RJAA', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', lat: 35.7647, lon: 140.3864, altitude: 141 },
    { iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', lat: 1.3502, lon: 103.9944, altitude: 22 },
    { iata: 'DXB', icao: 'OMDB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2528, lon: 55.3644, altitude: 62 },
    { iata: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith International Airport', city: 'Sydney', country: 'Australia', lat: -33.9461, lon: 151.1772, altitude: 21 },
    { iata: 'MIA', icao: 'KMIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', lat: 25.7932, lon: -80.2906, altitude: 8 },
    { iata: 'SEA', icao: 'KSEA', name: 'Seattle Tacoma International Airport', city: 'Seattle', country: 'United States', lat: 47.449, lon: -122.3093, altitude: 433 },
    { iata: 'DEN', icao: 'KDEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', lat: 39.8617, lon: -104.6731, altitude: 5431 },
    { iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3086, lon: 4.7639, altitude: -11 },
    { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt am Main Airport', city: 'Frankfurt', country: 'Germany', lat: 50.0264, lon: 8.5431, altitude: 364 }
  ];

  const insert = db.prepare(`
    INSERT OR REPLACE INTO airports (iata, icao, name, city, country, lat, lon, altitude)
    VALUES (@iata, @icao, @name, @city, @country, @lat, @lon, @altitude)
  `);
  for (const a of fallback) insert.run(a);
  console.log('Inserted fallback airports.');
}

function insertFallbackAirlines() {
  const fallback = [
    { iata: 'AA', icao: 'AAL', name: 'American Airlines', callsign: 'AMERICAN', country: 'United States' },
    { iata: 'UA', icao: 'UAL', name: 'United Airlines', callsign: 'UNITED', country: 'United States' },
    { iata: 'DL', icao: 'DAL', name: 'Delta Air Lines', callsign: 'DELTA', country: 'United States' },
    { iata: 'BA', icao: 'BAW', name: 'British Airways', callsign: 'SPEEDBIRD', country: 'United Kingdom' },
    { iata: 'AF', icao: 'AFR', name: 'Air France', callsign: 'AIRFRANS', country: 'France' },
    { iata: 'LH', icao: 'DLH', name: 'Lufthansa', callsign: 'LUFTHANSA', country: 'Germany' },
    { iata: 'JL', icao: 'JAL', name: 'Japan Airlines', callsign: 'JAPANAIR', country: 'Japan' },
    { iata: 'NH', icao: 'ANA', name: 'All Nippon Airways', callsign: 'ALL NIPPON', country: 'Japan' },
    { iata: 'SQ', icao: 'SIA', name: 'Singapore Airlines', callsign: 'SINGAPORE', country: 'Singapore' },
    { iata: 'EK', icao: 'UAE', name: 'Emirates', callsign: 'EMIRATES', country: 'United Arab Emirates' },
    { iata: 'QF', icao: 'QFA', name: 'Qantas', callsign: 'QANTAS', country: 'Australia' },
    { iata: 'WN', icao: 'SWA', name: 'Southwest Airlines', callsign: 'SOUTHWEST', country: 'United States' },
    { iata: 'B6', icao: 'JBU', name: 'JetBlue Airways', callsign: 'JETBLUE', country: 'United States' },
    { iata: 'AS', icao: 'ASA', name: 'Alaska Airlines', callsign: 'ALASKA', country: 'United States' }
  ];
  const insert = db.prepare(`
    INSERT OR REPLACE INTO airlines (iata, icao, name, callsign, country)
    VALUES (@iata, @icao, @name, @callsign, @country)
  `);
  for (const a of fallback) insert.run(a);
}

function seedSampleFlights() {
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
      flight_number, airline, airline_code, date,
      origin_iata, origin_name, origin_city, origin_country, origin_lat, origin_lon,
      dest_iata, dest_name, dest_city, dest_country, dest_lat, dest_lon,
      distance_miles, distance_km, aircraft, flight_class, seat, notes
    ) VALUES (
      @flight_number, @airline, @airline_code, @date,
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

  console.log(`Seeded ${samples.length} sample flights.`);
}

populateAirportsAndAirlines().then(() => {
  console.log('Database initialization complete!');
  process.exit(0);
}).catch(err => {
  console.error('Initialization error:', err);
  process.exit(1);
});

