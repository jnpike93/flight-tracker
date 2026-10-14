const db = require('better-sqlite3')('server/flight_tracker.db');

const AIRLINE_NAMES_MAP = [
  // Australia, New Zealand & Pacific
  { match: /\b(?:virgin australia|virgin oz|virgin blue|voz)\b/i, code: 'VA', name: 'Virgin Australia' },
  { match: /\b(?:virgin atlantic|speedbird|vir)\b/i, code: 'VS', name: 'Virgin Atlantic' },
  { match: /\b(?:virgin america|redwood|vrd)\b/i, code: 'VX', name: 'Virgin America' },
  { match: /\b(?:virgin)\b/i, code: 'VA', name: 'Virgin Australia' },
  { match: /\b(?:qantas|qfa)\b/i, code: 'QF', name: 'Qantas' },
  { match: /\b(?:jetstar|jetstar airways|jst)\b/i, code: 'JQ', name: 'Jetstar Airways' },
  { match: /\b(?:air new zealand|air nz|anz)\b/i, code: 'NZ', name: 'Air New Zealand' },
  { match: /\b(?:rex|regional express)\b/i, code: 'ZL', name: 'Regional Express' },
  { match: /\b(?:alliance airlines)\b/i, code: 'QQ', name: 'Alliance Airlines' },
  { match: /\b(?:fiji airways|air pacific)\b/i, code: 'FJ', name: 'Fiji Airways' },

  // North America
  { match: /\b(?:southwest|southwest airlines|south west|swa)\b/i, code: 'WN', name: 'Southwest Airlines' },
  { match: /\b(?:alaska|alaska airlines|asa)\b/i, code: 'AS', name: 'Alaska Airlines' },
  { match: /\b(?:united|united airlines|ual)\b/i, code: 'UA', name: 'United Airlines' },
  { match: /\b(?:delta|delta air lines|delta airlines|dal)\b/i, code: 'DL', name: 'Delta Air Lines' },
  { match: /\b(?:american|american airlines|aa|aal)\b/i, code: 'AA', name: 'American Airlines' },
  { match: /\b(?:jetblue|jetblue airways|jbu)\b/i, code: 'B6', name: 'JetBlue Airways' },
  { match: /\b(?:spirit|spirit airlines|nks)\b/i, code: 'NK', name: 'Spirit Airlines' },
  { match: /\b(?:frontier|frontier airlines|fft)\b/i, code: 'F9', name: 'Frontier Airlines' },
  { match: /\b(?:hawaiian|hawaiian airlines|hal)\b/i, code: 'HA', name: 'Hawaiian Airlines' },
  { match: /\b(?:allegiant|allegiant air|aay)\b/i, code: 'G4', name: 'Allegiant Air' },
  { match: /\b(?:sun country|sun country airlines|scx)\b/i, code: 'SY', name: 'Sun Country Airlines' },
  { match: /\b(?:breeze|breeze airways|mxy)\b/i, code: 'MX', name: 'Breeze Airways' },
  { match: /\b(?:avelo|avelo airlines|vxp)\b/i, code: 'XP', name: 'Avelo Airlines' },
  { match: /\b(?:air canada|aca)\b/i, code: 'AC', name: 'Air Canada' },
  { match: /\b(?:westjet|wja)\b/i, code: 'WS', name: 'WestJet' },

  // Europe & Atlantic
  { match: /\b(?:british airways|speedbird|baw)\b/i, code: 'BA', name: 'British Airways' },
  { match: /\b(?:air france|afr)\b/i, code: 'AF', name: 'Air France' },
  { match: /\b(?:lufthansa|dlh)\b/i, code: 'LH', name: 'Lufthansa' },
  { match: /\b(?:klm|klm royal dutch airlines)\b/i, code: 'KL', name: 'KLM' },
  { match: /\b(?:aeromexico|amx)\b/i, code: 'AM', name: 'Aeromexico' },
  { match: /\b(?:copa|copa airlines|cmp)\b/i, code: 'CM', name: 'Copa Airlines' },
  { match: /\b(?:icelandair|icelandic|icelandic air|iceair)\b/i, code: 'FI', name: 'Icelandair' },
  { match: /\b(?:aer lingus|ein)\b/i, code: 'EI', name: 'Aer Lingus' },
  { match: /\b(?:sas|scandinavian airlines)\b/i, code: 'SK', name: 'Scandinavian Airlines' },
  { match: /\b(?:finnair|fin)\b/i, code: 'AY', name: 'Finnair' },
  { match: /\b(?:tap|tap air portugal)\b/i, code: 'TP', name: 'TAP Air Portugal' },
  { match: /\b(?:iberia|ibe)\b/i, code: 'IB', name: 'Iberia' },
  { match: /\b(?:norwegian|norwegian air)\b/i, code: 'DY', name: 'Norwegian Air' },
  { match: /\b(?:play|fly play)\b/i, code: 'OG', name: 'PLAY' },
  { match: /\b(?:ryanair|rya)\b/i, code: 'FR', name: 'Ryanair' },
  { match: /\b(?:easyjet|ezy)\b/i, code: 'U2', name: 'easyJet' },

  // Asia & Middle East
  { match: /\b(?:singapore airlines|sia)\b/i, code: 'SQ', name: 'Singapore Airlines' },
  { match: /\b(?:emirates|uae)\b/i, code: 'EK', name: 'Emirates' },
  { match: /\b(?:qatar|qatar airways|qtr)\b/i, code: 'QR', name: 'Qatar Airways' },
  { match: /\b(?:cathay pacific|cpa)\b/i, code: 'CX', name: 'Cathay Pacific' },
  { match: /\b(?:ana|all nippon|all nippon airways)\b/i, code: 'NH', name: 'All Nippon Airways' },
  { match: /\b(?:jal|japan airlines)\b/i, code: 'JL', name: 'Japan Airlines' },
  { match: /\b(?:korean air|kal)\b/i, code: 'KE', name: 'Korean Air' }
];

const MAJOR_AIRLINE_CODES = {
  VA: 'Virgin Australia',
  QF: 'Qantas',
  JQ: 'Jetstar Airways',
  NZ: 'Air New Zealand',
  ZL: 'Regional Express',
  QQ: 'Alliance Airlines',
  FJ: 'Fiji Airways',
  AA: 'American Airlines',
  UA: 'United Airlines',
  DL: 'Delta Air Lines',
  WN: 'Southwest Airlines',
  B6: 'JetBlue Airways',
  AS: 'Alaska Airlines',
  NK: 'Spirit Airlines',
  F9: 'Frontier Airlines',
  HA: 'Hawaiian Airlines',
  AC: 'Air Canada',
  WS: 'WestJet',
  BA: 'British Airways',
  VS: 'Virgin Atlantic',
  VX: 'Virgin America',
  AF: 'Air France',
  LH: 'Lufthansa',
  KL: 'KLM',
  IB: 'Iberia',
  EI: 'Aer Lingus',
  SK: 'Scandinavian Airlines',
  AY: 'Finnair',
  TP: 'TAP Air Portugal',
  FI: 'Icelandair',
  OG: 'PLAY',
  DY: 'Norwegian Air',
  FR: 'Ryanair',
  U2: 'easyJet',
  SQ: 'Singapore Airlines',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  CX: 'Cathay Pacific',
  JL: 'Japan Airlines',
  NH: 'All Nippon Airways',
  KE: 'Korean Air'
};

const CITY_ALIASES = {
  'AUCKLAND': 'AKL',
  'AUKLAND': 'AKL',
  'WELLINGTON': 'WLG',
  'CHRISTCHURCH': 'CHC',
  'QUEENSTOWN': 'ZQN',
  'NADI': 'NAN',
  'FIJI': 'NAN',
  'SYDNEY': 'SYD',
  'SIDNEY': 'SYD',
  'MELBOURNE': 'MEL',
  'MELBOURN': 'MEL',
  'BRISBANE': 'BNE',
  'BRISBIN': 'BNE',
  'PERTH': 'PER',
  'ADELAIDE': 'ADL',
  'GOLD COAST': 'OOL',
  'COOLANGATTA': 'OOL',
  'CAIRNS': 'CNS',
  'CANBERRA': 'CBR',
  'HOBART': 'HBA',
  'DARWIN': 'DRW',
  'REYKJAVIK': 'KEF',
  'REYKJAVÍK': 'KEF',
  'REYJAVIK': 'KEF',
  'REIKJAVIK': 'KEF',
  'REYKAVIK': 'KEF',
  'ICELAND': 'KEF',
  'KEFLAVIK': 'KEF',
  'NEW YORK': 'JFK',
  'LOS ANGELES': 'LAX',
  'CHICAGO': 'ORD',
  'SAN FRANCISCO': 'SFO',
  'SAN FRANSISCO': 'SFO',
  'SEATTLE': 'SEA',
  'DENVER': 'DEN',
  'ATLANTA': 'ATL',
  'DALLAS': 'DFW',
  'HOUSTON': 'IAH',
  'MIAMI': 'MIA',
  'ORLANDO': 'MCO',
  'LAS VEGAS': 'LAS',
  'HONOLULU': 'HNL',
  'HAWAII': 'HNL',
  'MAUI': 'OGG',
  'KANSAS CITY': 'MCI',
  'BOSTON': 'BOS',
  'LONDON': 'LHR',
  'PARIS': 'CDG',
  'TOKYO': 'HND'
};

function findAirportByFuzzyCity(cityStr, db) {
  if (!cityStr) return null;
  const clean = cityStr.replace(/airport|intl|international|\(|\)/gi, '').trim().toUpperCase();
  if (!clean || clean.length < 3) return null;

  if (CITY_ALIASES[clean]) {
    const aliasApt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(CITY_ALIASES[clean]);
    if (aliasApt) return aliasApt;
  }

  const exact = db.prepare(`
    SELECT * FROM airports
    WHERE UPPER(city) = ?
    ORDER BY CASE WHEN UPPER(name) LIKE '%INTERNATIONAL%' OR UPPER(name) LIKE '%INTL%' THEN 1 ELSE 2 END ASC
    LIMIT 1
  `).get(clean);
  if (exact) return exact;

  if (clean.length >= 4) {
    const likeMatch = db.prepare(`
      SELECT * FROM airports
      WHERE UPPER(city) LIKE ?
      ORDER BY CASE WHEN UPPER(name) LIKE '%INTERNATIONAL%' OR UPPER(name) LIKE '%INTL%' THEN 1 ELSE 2 END ASC
      LIMIT 1
    `).get(`${clean}%`);
    if (likeMatch) return likeMatch;
  }

  return null;
}

function findAirportFromText(str, db) {
  if (!str) return null;
  const iataMatches = Array.from(str.matchAll(/\b([A-Z]{3})\b/g)).map(m => m[1]);
  for (const code of iataMatches) {
    if (['THE', 'FOR', 'AND', 'AIR', 'NEW', 'ALL', 'OUT', 'DAY', 'GET', 'BUS', 'CAR', 'HOT', 'MAP', 'BAR', 'SEE'].includes(code)) continue;
    const apt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(code);
    if (apt) return apt;
  }

  const clean = str.replace(/terminal|\d+|gate|airport|intl|international|\(|\)|,/gi, ' ').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  for (const word of words) {
    const apt = findAirportByFuzzyCity(word, db);
    if (apt) return apt;
  }
  return null;
}

function extractFlightFromEvent(event, db, userEmail) {
  const summary = event.summary || '';
  const desc = event.description || '';
  const loc = event.location || '';
  const text = `${summary} ${desc} ${loc}`;

  // 1. REJECT explicit non-flight events (hotels, dining, reminders)
  const nonFlightRegex = /\b(?:hotel|motel|resort|inn\b|suites\b|hostel|lodge|airbnb|vrbo|stay\s+at|check-in\s+at\s+hotel|lodging|restaurant|dinner|lunch|breakfast|brunch|bar\b|grill|cafe|bistro|brewery|table\s+for|reservation\s+at|reservation\s+for|opentable|resy|memories\s+from|anniversary|birthday|dentist|doctor|appointment|meeting|drive\s+to|road\s+trip)\b/i;
  const isExplicitNonFlight = nonFlightRegex.test(text);

  let airlineCode = '';
  let airlineName = '';

  for (const entry of AIRLINE_NAMES_MAP) {
    if (entry.match.test(text)) {
      airlineCode = entry.code;
      airlineName = entry.name;
      break;
    }
  }

  // If flagged as non-flight and NO airline mention and NOT Google eventType 'flight', reject immediately!
  if (isExplicitNonFlight && !airlineCode && event.eventType !== 'flight') {
    return null;
  }

  // 2. Check if this has genuine flight indicators
  const hasAirplaneEmoji = /[✈✈️🛫🛬]/.test(text);
  const hasRoutePair = /\b([A-Z]{3})\s*(?:to|->|=>|➔|–|—|-|\/|>|✈️|✈)\s*([A-Z]{3})\b/i.test(text);
  const hasFlightKeyword = /\b(?:flight|flt|airline|airways|boarding\s*pass|gate\s*[0-9]+[A-Z]?|terminal\s*[0-9]+|airfare|e-ticket|eticket)\b/i.test(text);
  const hasFlightNumPattern = /\b([A-Za-z]{2}|[A-Za-z][0-9]|[0-9][A-Za-z])\s*([0-9]{1,4})\b/i.test(summary);

  const isFlightRelated = event.eventType === 'flight' || hasAirplaneEmoji || !!airlineCode || hasFlightKeyword || hasFlightNumPattern;

  if (!isFlightRelated) return null;

  let date = event.date;
  if (!date && event.start) {
    if (event.start.date) date = event.start.date;
    else if (event.start.dateTime) date = event.start.dateTime.split('T')[0];
  }
  if (!date) date = new Date().toISOString().split('T')[0];

  let flightNumber = '';

  // Extract flight number
  const fltWordMatch = text.match(/(?:flight|flt)\s*#?\s*(?:([A-Za-z]{2}|[A-Za-z][0-9]|[0-9][A-Za-z])\s*)?([0-9]{1,4})\b/i);
  if (fltWordMatch) {
    const possibleCode = fltWordMatch[1];
    const num = fltWordMatch[2];
    if (possibleCode) {
      const codeUpper = possibleCode.toUpperCase();
      const row = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(codeUpper);
      if (row) {
        airlineCode = codeUpper;
        airlineName = row.name;
      }
    }
    if (airlineCode) flightNumber = `${airlineCode} ${num}`;
  }

  if (!flightNumber && airlineCode && airlineName) {
    const firstWord = airlineName.split(' ')[0];
    const nameNumRegex = new RegExp('(?:' + firstWord + '|' + airlineCode + ')\\s*(?:' + airlineCode + '\\s*)?#?\\s*([0-9]{1,4})\\b', 'i');
    const nameNumMatch = text.match(nameNumRegex);
    if (nameNumMatch) flightNumber = `${airlineCode} ${nameNumMatch[1]}`;
  }

  if (!flightNumber) {
    const codeDigitsRegex = /\b([A-Za-z]{2}|[A-Za-z][0-9]|[0-9][A-Za-z])\s*([0-9]{1,4})\b/gi;
    let match;
    const excludedCodes = new Set(['AM', 'PM', 'NO', 'ID', 'OK', 'ME', 'US', 'OR', 'IN', 'ON', 'AT', 'TO', 'GO', 'DO', 'SO', 'UP', 'IS', 'IT']);
    while ((match = codeDigitsRegex.exec(text)) !== null) {
      const codeUpper = match[1].toUpperCase();
      const num = match[2];
      if (excludedCodes.has(codeUpper)) continue;
      const row = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(codeUpper);
      if (row) {
        airlineCode = codeUpper;
        airlineName = row.name;
        flightNumber = `${airlineCode} ${num}`;
        break;
      }
    }
  }

  if (!airlineName && airlineCode) {
    airlineName = MAJOR_AIRLINE_CODES[airlineCode] || '';
    if (!airlineName) {
      const row = db.prepare('SELECT name FROM airlines WHERE iata = ?').get(airlineCode);
      if (row) airlineName = row.name;
    }
  }

  let originIata = null;
  let destIata = null;

  // IATA route pair
  const routeMatch = text.match(/\b([A-Z]{3})\s*(?:to|->|=>|➔|–|—|-|\/|>|✈️|✈)\s*([A-Z]{3})\b/i);
  if (routeMatch) {
    const c1 = routeMatch[1].toUpperCase();
    const c2 = routeMatch[2].toUpperCase();
    const a1 = db.prepare('SELECT iata FROM airports WHERE iata = ?').get(c1);
    const a2 = db.prepare('SELECT iata FROM airports WHERE iata = ?').get(c2);
    if (a1 && a2) {
      originIata = a1.iata;
      destIata = a2.iata;
    }
  }

  // City Route pair
  if (!originIata || !destIata) {
    const cityRouteMatch = summary.match(/([A-Za-z\s]+(?:\([A-Za-z\s]+\))?)\s*(?:to|->|=>|➔|–|—|-|\/|>|✈️|✈)\s*([A-Za-z\s]+(?:\([A-Za-z\s]+\))?)/i);
    if (cityRouteMatch) {
      let origRaw = cityRouteMatch[1].replace(/Flight|Trip|Vacation|\d+|\//gi, '').trim();
      let destRaw = cityRouteMatch[2].replace(/\s+(?:on|with|via|operated\s+by|operated|at)\b.*$/i, '').trim();
      destRaw = destRaw.replace(/Flight|Trip|Vacation|\d+|\//gi, '').trim();

      const origApt = findAirportByFuzzyCity(origRaw, db);
      const destApt = findAirportByFuzzyCity(destRaw, db);

      if (origApt && destApt && origApt.iata !== destApt.iata) {
        originIata = origApt.iata;
        destIata = destApt.iata;
      }
    }
  }

  // Flight to [City]
  if (!destIata) {
    const destCityMatch = summary.match(/(?:Flight|Fly|Flying)\s+to\s+([A-Za-z\s]+?)(?:\s+(?:on|with|via|operated|at)\b|\(|\-|,|$)/i);
    if (destCityMatch) {
      const city = destCityMatch[1].replace(/Virgin|Australia|Qantas|Jetstar|Icelandair|Delta|United|Southwest|American|Airways|Airlines/gi, '').trim();
      const apt = findAirportByFuzzyCity(city, db);
      if (apt) destIata = apt.iata;
    }
  }

  // Flight from [City]
  if (!originIata) {
    const origCityMatch = summary.match(/(?:Flight|Departing)\s+from\s+([A-Za-z\s]+?)(?:\s+(?:on|with|via|operated|at)\b|\(|\-|,|$)/i);
    if (origCityMatch) {
      const city = origCityMatch[1].replace(/Virgin|Australia|Qantas|Jetstar|Icelandair|Delta|United|Southwest|American|Airways|Airlines/gi, '').trim();
      const apt = findAirportByFuzzyCity(city, db);
      if (apt) originIata = apt.iata;
    }
  }

  // Check location
  if ((!originIata || !destIata) && loc) {
    const locApt = findAirportFromText(loc, db);
    if (locApt) {
      if (!originIata && destIata && locApt.iata !== destIata) originIata = locApt.iata;
      else if (!destIata && originIata && locApt.iata !== originIata) destIata = locApt.iata;
    }
  }

  // Check description From / To
  if (!originIata || !destIata) {
    const fromToMatch = desc.match(/\bFrom\s*:?\s*([A-Za-z\s]+(?:\([A-Za-z]{3}\))?)\s+To\s*:?\s*([A-Za-z\s]+(?:\([A-Za-z]{3}\))?)/i);
    if (fromToMatch) {
      const a1 = findAirportFromText(fromToMatch[1], db);
      const a2 = findAirportFromText(fromToMatch[2], db);
      if (a1 && a2 && a1.iata !== a2.iata) {
        originIata = a1.iata;
        destIata = a2.iata;
      }
    }
  }

  // If destination is known AND we have a verified flight number, look up origin from database previous flights
  if (!originIata && destIata && flightNumber) {
    const prev = db.prepare('SELECT origin_iata FROM flights WHERE UPPER(flight_number) = ? LIMIT 1').get(flightNumber.toUpperCase());
    if (prev) originIata = prev.origin_iata;
  }

  if (originIata === 'RKV' && (airlineCode === 'FI' || airlineCode === 'OG' || destIata !== 'KEF')) originIata = 'KEF';
  if (destIata === 'RKV' && (airlineCode === 'FI' || airlineCode === 'OG' || originIata !== 'KEF')) destIata = 'KEF';

  if (!originIata || !destIata) return null;

  // IMPORTANT: Reject if NO airline identified AND NO flight number digits found!
  // Prevents generic non-flight prose from generating bogus "Commercial Flight" entries!
  if (!airlineCode && !flightNumber) {
    return null;
  }

  const orig = db.prepare('SELECT * FROM airports WHERE iata = ?').get(originIata);
  const dest = db.prepare('SELECT * FROM airports WHERE iata = ?').get(destIata);
  if (!orig || !dest || orig.iata === dest.iata) return null;

  if (!airlineName) airlineName = airlineCode ? (MAJOR_AIRLINE_CODES[airlineCode] || 'Commercial Flight') : 'Commercial Flight';
  if (!flightNumber) flightNumber = airlineCode ? `${airlineCode} ${orig.iata}-${dest.iata}` : `${orig.iata} - ${dest.iata}`;

  return {
    rawSummary: summary,
    flight_number: flightNumber,
    airline: airlineName,
    origin_iata: orig.iata,
    dest_iata: dest.iata
  };
}

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
  'Drive to grandma'
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
  { summary: 'Flight to Aukland (NZ 102)', location: 'Sydney Airport (SYD)', date: '2024-01-15' }
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

console.log('\nFinal Score:');
console.log('False positives blocked:', falsePositives.length - fpFailed, '/', falsePositives.length);
console.log('True flights detected:', truePositives.length - tpFailed, '/', truePositives.length);

