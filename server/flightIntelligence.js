// Flight Intelligence, AvGeek Analytics, Gamification & Trip Engine

// 1. Infer or normalize Aircraft Model & Manufacturer
function inferAircraft(flight) {
  if (flight.aircraft && flight.aircraft.trim()) {
    const raw = flight.aircraft.trim();
    return normalizeAircraft(raw);
  }

  const code = (flight.airline_code || '').toUpperCase();
  const airline = (flight.airline || '').toLowerCase();
  const dist = flight.distance_miles || 0;

  if (code === 'WN' || airline.includes('southwest')) {
    if (dist > 1600) return { model: 'Boeing 737-800', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
    return { model: 'Boeing 737-700', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'AS' || airline.includes('alaska')) {
    if (dist < 400) return { model: 'Embraer E175', manufacturer: 'Embraer', bodyType: 'Regional' };
    return { model: 'Boeing 737-900ER', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'B6' || airline.includes('jetblue')) {
    if (dist < 600) return { model: 'Airbus A220-300', manufacturer: 'Airbus', bodyType: 'Narrowbody' };
    return { model: 'Airbus A321neo', manufacturer: 'Airbus', bodyType: 'Narrowbody' };
  }
  if (code === 'FI' || airline.includes('icelandair')) {
    if (dist > 2800) return { model: 'Boeing 757-200', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
    return { model: 'Boeing 737 MAX 8', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'VA' || airline.includes('virgin australia')) {
    return { model: 'Boeing 737-800', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'QF' || airline.includes('qantas')) {
    if (dist > 3500) return { model: 'Boeing 787-9 Dreamliner', manufacturer: 'Boeing', bodyType: 'Widebody' };
    return { model: 'Boeing 737-800', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'NZ' || airline.includes('air new zealand')) {
    if (dist > 3500) return { model: 'Boeing 787-9 Dreamliner', manufacturer: 'Boeing', bodyType: 'Widebody' };
    return { model: 'Airbus A320neo', manufacturer: 'Airbus', bodyType: 'Narrowbody' };
  }
  if (code === 'JQ' || airline.includes('jetstar')) {
    if (dist > 3000) return { model: 'Boeing 787-8 Dreamliner', manufacturer: 'Boeing', bodyType: 'Widebody' };
    return { model: 'Airbus A320', manufacturer: 'Airbus', bodyType: 'Narrowbody' };
  }
  if (code === 'UA' || airline.includes('united')) {
    if (dist > 3500) return { model: 'Boeing 777-200ER', manufacturer: 'Boeing', bodyType: 'Widebody' };
    if (dist > 2000) return { model: 'Boeing 787-9 Dreamliner', manufacturer: 'Boeing', bodyType: 'Widebody' };
    if (dist < 500) return { model: 'Embraer E175', manufacturer: 'Embraer', bodyType: 'Regional' };
    return { model: 'Boeing 737-900', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'DL' || airline.includes('delta')) {
    if (dist > 3500) return { model: 'Airbus A350-900', manufacturer: 'Airbus', bodyType: 'Widebody' };
    if (dist > 1800) return { model: 'Airbus A321neo', manufacturer: 'Airbus', bodyType: 'Narrowbody' };
    if (dist < 500) return { model: 'Bombardier CRJ-900', manufacturer: 'Bombardier', bodyType: 'Regional' };
    return { model: 'Boeing 737-900ER', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
  }
  if (code === 'AA' || airline.includes('american')) {
    if (dist > 3500) return { model: 'Boeing 777-300ER', manufacturer: 'Boeing', bodyType: 'Widebody' };
    if (dist < 500) return { model: 'Embraer E175', manufacturer: 'Embraer', bodyType: 'Regional' };
    return { model: 'Airbus A321', manufacturer: 'Airbus', bodyType: 'Narrowbody' };
  }

  if (dist > 3500) return { model: 'Boeing 787 Dreamliner', manufacturer: 'Boeing', bodyType: 'Widebody' };
  if (dist < 400) return { model: 'Regional Jet', manufacturer: 'Embraer', bodyType: 'Regional' };
  return { model: 'Narrowbody Jet', manufacturer: 'Boeing', bodyType: 'Narrowbody' };
}

function normalizeAircraft(raw) {
  const s = raw.toLowerCase();
  let manufacturer = 'Boeing';
  let bodyType = 'Narrowbody';

  if (s.includes('airbus') || s.includes('a3') || s.includes('a2')) {
    manufacturer = 'Airbus';
  } else if (s.includes('embraer') || s.includes('e17') || s.includes('e19')) {
    manufacturer = 'Embraer';
    bodyType = 'Regional';
  } else if (s.includes('bombardier') || s.includes('crj')) {
    manufacturer = 'Bombardier';
    bodyType = 'Regional';
  }

  if (
    s.includes('777') ||
    s.includes('787') ||
    s.includes('747') ||
    s.includes('767') ||
    s.includes('a350') ||
    s.includes('a330') ||
    s.includes('a380') ||
    s.includes('a340')
  ) {
    bodyType = 'Widebody';
  }

  return { model: raw, manufacturer, bodyType };
}

// 2. Seat Position Extractor
function getSeatPosition(seatStr) {
  if (!seatStr || !seatStr.trim()) return 'Unknown';
  const clean = seatStr.trim().toUpperCase();
  const letter = clean.slice(-1);
  if (['A', 'F', 'K'].includes(letter)) return 'Window';
  if (['C', 'D', 'G', 'H'].includes(letter)) return 'Aisle';
  if (['B', 'E', 'J'].includes(letter)) return 'Middle';
  return 'Unknown';
}

// 3. Compute Fleet and Seat Intelligence
function computeFleetAndSeats(flights) {
  const manufacturerCounts = {};
  const bodyTypeCounts = { Narrowbody: 0, Widebody: 0, Regional: 0 };
  const modelCounts = {};

  let windowSeats = 0;
  let aisleSeats = 0;
  let middleSeats = 0;
  let unknownSeats = 0;

  flights.forEach(f => {
    const ac = inferAircraft(f);
    manufacturerCounts[ac.manufacturer] = (manufacturerCounts[ac.manufacturer] || 0) + 1;
    bodyTypeCounts[ac.bodyType] = (bodyTypeCounts[ac.bodyType] || 0) + 1;
    modelCounts[ac.model] = (modelCounts[ac.model] || 0) + 1;

    const seatPos = getSeatPosition(f.seat);
    if (seatPos === 'Window') windowSeats++;
    else if (seatPos === 'Aisle') aisleSeats++;
    else if (seatPos === 'Middle') middleSeats++;
    else unknownSeats++;
  });

  const total = flights.length || 1;
  const knownSeats = windowSeats + aisleSeats + middleSeats || 1;

  const topModels = Object.entries(modelCounts)
    .map(([model, count]) => ({
      model,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const manufacturers = Object.entries(manufacturerCounts)
    .map(([brand, count]) => ({
      brand,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  return {
    manufacturers,
    bodyTypes: [
      { type: 'Narrowbody (Single-Aisle)', count: bodyTypeCounts.Narrowbody, percentage: Math.round((bodyTypeCounts.Narrowbody / total) * 100) },
      { type: 'Widebody (Twin-Aisle)', count: bodyTypeCounts.Widebody, percentage: Math.round((bodyTypeCounts.Widebody / total) * 100) },
      { type: 'Regional Jet', count: bodyTypeCounts.Regional, percentage: Math.round((bodyTypeCounts.Regional / total) * 100) }
    ],
    topModels,
    seats: {
      window: { count: windowSeats, percent: Math.round((windowSeats / knownSeats) * 100) },
      aisle: { count: aisleSeats, percent: Math.round((aisleSeats / knownSeats) * 100) },
      middle: { count: middleSeats, percent: Math.round((middleSeats / knownSeats) * 100) },
      hasLoggedSeats: knownSeats > 1
    }
  };
}

// 4. Compute Gamified Aviation Badges
function computeBadges(flights, totalMiles) {
  const totalFlights = flights.length;
  const uniqueAirports = new Set();
  const countries = new Set();
  const islandIatas = new Set(['KEF', 'AKL', 'HNL', 'OGG', 'NAN', 'PPT', 'SJU', 'STT', 'BZE', 'AUA', 'CUN']);
  const megaHubs = new Set(['ORD', 'LAX', 'ATL', 'LHR', 'DXB', 'DFW', 'DEN', 'JFK', 'SFO', 'MIA', 'CLT', 'IAH', 'EWR', 'SIN', 'HND', 'SYD']);

  let equatorCount = 0;
  let polarCount = 0;
  let islandCount = 0;
  let visitedMegaHubs = new Set();
  let longestDist = 0;
  let windowCount = 0;
  let domesticAirportCount = 0;

  flights.forEach(f => {
    if (f.origin_iata) uniqueAirports.add(f.origin_iata);
    if (f.dest_iata) uniqueAirports.add(f.dest_iata);
    if (f.origin_country) countries.add(f.origin_country.trim());
    if (f.dest_country) countries.add(f.dest_country.trim());

    if ((f.origin_lat > 0 && f.dest_lat < 0) || (f.origin_lat < 0 && f.dest_lat > 0)) {
      equatorCount++;
    }
    if (f.origin_lat > 60 || f.dest_lat > 60) {
      polarCount++;
    }
    if (islandIatas.has(f.origin_iata) || islandIatas.has(f.dest_iata)) {
      islandCount++;
    }
    if (megaHubs.has(f.origin_iata)) visitedMegaHubs.add(f.origin_iata);
    if (megaHubs.has(f.dest_iata)) visitedMegaHubs.add(f.dest_iata);

    if (f.distance_miles > longestDist) longestDist = f.distance_miles;
    if (getSeatPosition(f.seat) === 'Window') windowCount++;

    if (f.origin_country && f.dest_country && f.origin_country === f.dest_country) {
      domesticAirportCount++;
    }
  });

  const earliestDate = flights[0]?.date;
  const latestDate = flights[flights.length - 1]?.date;
  let yearsSpan = 0;
  if (earliestDate && latestDate) {
    const y1 = parseInt(earliestDate.slice(0, 4), 10);
    const y2 = parseInt(latestDate.slice(0, 4), 10);
    yearsSpan = Math.max(0, y2 - y1);
  }

  const badgeDefs = [
    {
      id: 'equator_crosser',
      title: 'Equator Crosser',
      icon: '🌐',
      category: 'Geographic',
      description: 'Cross 0° latitude between Northern & Southern Hemispheres',
      unlocked: equatorCount > 0,
      progress: Math.min(equatorCount, 1),
      maxProgress: 1,
      metric: `${equatorCount} crossings`
    },
    {
      id: 'polar_voyager',
      title: 'Polar Voyager',
      icon: '❄️',
      category: 'Geographic',
      description: 'Land or depart north of 60°N Arctic latitude (e.g. Iceland/Nordic)',
      unlocked: polarCount > 0,
      progress: Math.min(polarCount, 1),
      maxProgress: 1,
      metric: `${polarCount} arctic flights`
    },
    {
      id: 'island_hopper',
      title: 'Island Hopper',
      icon: '🏝️',
      category: 'Adventure',
      description: 'Land at remote oceanic island destinations (Auckland, Reykjavik, etc.)',
      unlocked: islandCount >= 2,
      progress: Math.min(islandCount, 2),
      maxProgress: 2,
      metric: `${islandCount} island landings`
    },
    {
      id: 'century_club',
      title: 'Century Club',
      icon: '💯',
      category: 'Milestone',
      description: 'Log 100 commercial flight legs in your lifetime flight tracker',
      unlocked: totalFlights >= 100,
      progress: Math.min(totalFlights, 100),
      maxProgress: 100,
      metric: `${totalFlights} / 100 flights`
    },
    {
      id: 'earth_circumnavigator',
      title: 'Earth Circumnavigator',
      icon: '💫',
      category: 'Milestone',
      description: 'Accumulate at least 24,901 air miles (1 full lap around the equator)',
      unlocked: totalMiles >= 24901,
      progress: Math.min(totalMiles, 24901),
      maxProgress: 24901,
      metric: `${Math.floor(totalMiles / 24901)} laps completed`
    },
    {
      id: 'mega_hub_master',
      title: 'Mega-Hub Master',
      icon: '🛫',
      category: 'Aviation',
      description: 'Connect through 4+ world mega-hubs (ORD, LAX, DEN, DFW, LHR, etc.)',
      unlocked: visitedMegaHubs.size >= 4,
      progress: Math.min(visitedMegaHubs.size, 4),
      maxProgress: 4,
      metric: `${visitedMegaHubs.size} hubs visited`
    },
    {
      id: 'transcon_nomad',
      title: 'Transcontinental Nomad',
      icon: '⚡',
      category: 'Adventure',
      description: 'Fly a single non-stop flight exceeding 2,000 miles',
      unlocked: longestDist >= 2000,
      progress: Math.min(longestDist, 2000),
      maxProgress: 2000,
      metric: `Max: ${longestDist.toLocaleString()} mi`
    },
    {
      id: 'decade_aviator',
      title: 'Decade Aviator',
      icon: '⏳',
      category: 'Heritage',
      description: 'Flight history spanning 5+ calendar years',
      unlocked: yearsSpan >= 5,
      progress: Math.min(yearsSpan, 5),
      maxProgress: 5,
      metric: `${yearsSpan} years span`
    },
    {
      id: 'globe_trotter',
      title: 'Globe Trotter',
      icon: '🌎',
      category: 'Geographic',
      description: 'Touchdown in multiple distinct countries worldwide',
      unlocked: countries.size >= 2,
      progress: Math.min(countries.size, 2),
      maxProgress: 2,
      metric: `${countries.size} countries`
    },
    {
      id: 'airport_connoisseur',
      title: 'Airport Connoisseur',
      icon: '🗺️',
      category: 'Aviation',
      description: 'Takeoff or land at 20+ unique airports globally',
      unlocked: uniqueAirports.size >= 20,
      progress: Math.min(uniqueAirports.size, 20),
      maxProgress: 20,
      metric: `${uniqueAirports.size} / 20 airports`
    },
    {
      id: 'window_seat_loyalist',
      title: 'Window Seat Loyalist',
      icon: '🪟',
      category: 'AvGeek',
      description: 'Log 5+ flights gazing out at the wing & cloud tops',
      unlocked: windowCount >= 5,
      progress: Math.min(windowCount, 5),
      maxProgress: 5,
      metric: `${windowCount} window flights`
    },
    {
      id: 'frequent_flyer_elite',
      title: 'Road Warrior Status',
      icon: '👑',
      category: 'Milestone',
      description: 'Complete 50+ total flights on your travel resume',
      unlocked: totalFlights >= 50,
      progress: Math.min(totalFlights, 50),
      maxProgress: 50,
      metric: `${totalFlights} / 50 flights`
    }
  ];

  const unlockedCount = badgeDefs.filter(b => b.unlocked).length;
  return {
    badges: badgeDefs,
    unlockedCount,
    totalBadges: badgeDefs.length,
    percentage: Math.round((unlockedCount / badgeDefs.length) * 100)
  };
}

// 5. Compute Auto-Trip Groupings (Vacations, Multi-city, Roundtrips)
function computeTrips(flights) {
  if (!flights || flights.length === 0) return [];

  const trips = [];
  let currentTripFlights = [];

  for (let i = 0; i < flights.length; i++) {
    const f = flights[i];
    if (currentTripFlights.length === 0) {
      currentTripFlights.push(f);
      continue;
    }

    const prevFlight = currentTripFlights[currentTripFlights.length - 1];
    const d1 = new Date(prevFlight.date || '1970-01-01');
    const d2 = new Date(f.date || '1970-01-01');
    const daysDiff = Math.abs(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));

    // If within 10 days and returning home or chaining airports, group into same trip
    if (daysDiff <= 8) {
      currentTripFlights.push(f);
    } else {
      // Finalize current trip
      trips.push(createTripSummary(currentTripFlights, trips.length + 1));
      currentTripFlights = [f];
    }
  }

  if (currentTripFlights.length > 0) {
    trips.push(createTripSummary(currentTripFlights, trips.length + 1));
  }

  return trips.reverse(); // Most recent trips first
}

function createTripSummary(tripFlights, tripNum) {
  const origin = tripFlights[0].origin_iata;
  const lastDest = tripFlights[tripFlights.length - 1].dest_iata;
  const isRoundTrip = origin === lastDest;

  const uniqueCities = new Set();
  tripFlights.forEach(f => {
    if (f.dest_city) uniqueCities.add(f.dest_city);
  });

  const cityList = Array.from(uniqueCities).filter(c => c !== tripFlights[0].origin_city);
  const mainCity = cityList[0] || tripFlights[0].dest_city || lastDest;

  const totalMiles = tripFlights.reduce((sum, f) => sum + (f.distance_miles || 0), 0);
  const totalKm = tripFlights.reduce((sum, f) => sum + (f.distance_km || 0), 0);

  const routeChain = [tripFlights[0].origin_iata];
  tripFlights.forEach(f => {
    if (routeChain[routeChain.length - 1] !== f.dest_iata) {
      routeChain.push(f.dest_iata);
    }
  });

  return {
    id: `trip-${tripNum}`,
    title: isRoundTrip ? `Roundtrip to ${mainCity}` : `Journey to ${mainCity}`,
    startDate: tripFlights[0].date,
    endDate: tripFlights[tripFlights.length - 1].date,
    legsCount: tripFlights.length,
    totalMiles,
    totalKm,
    routeChain,
    isRoundTrip,
    flights: tripFlights
  };
}

// 6. Compute AeroLog Wrapped Year in Review
function computeWrapped(flights, yearlyBreakdown) {
  const years = (yearlyBreakdown || []).map(y => y.year);
  const wrappedByYear = {};

  years.forEach(year => {
    const yearFlights = flights.filter(f => (f.date || '').startsWith(year));
    if (yearFlights.length === 0) return;

    const totalMiles = yearFlights.reduce((sum, f) => sum + (f.distance_miles || 0), 0);
    const totalKm = yearFlights.reduce((sum, f) => sum + (f.distance_km || 0), 0);
    const hoursAloft = Number((totalMiles / 500).toFixed(1));
    const earthLaps = Number((totalMiles / 24901).toFixed(2));

    // Top airline
    const airlineCount = {};
    yearFlights.forEach(f => {
      airlineCount[f.airline] = (airlineCount[f.airline] || 0) + 1;
    });
    const topAirline = Object.entries(airlineCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Commercial Flight';

    // Top airport
    const aptCount = {};
    yearFlights.forEach(f => {
      if (f.origin_iata) aptCount[f.origin_iata] = (aptCount[f.origin_iata] || 0) + 1;
      if (f.dest_iata) aptCount[f.dest_iata] = (aptCount[f.dest_iata] || 0) + 1;
    });
    const topApt = Object.entries(aptCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MCI';

    // Longest flight
    const longestFlight = yearFlights.reduce((max, f) => (f.distance_miles > (max ? max.distance_miles : -1) ? f : max), null);

    // Persona
    let persona = 'The Regional Jet-Setter';
    const avgDist = totalMiles / yearFlights.length;
    if (avgDist > 1400) persona = 'The Long-Haul Nomad';
    else if (yearFlights.length > 20) persona = 'The Stratosphere Road Warrior';
    else if (yearFlights.some(f => f.origin_country !== f.dest_country)) persona = 'The Global Adventurer';

    wrappedByYear[year] = {
      year,
      flightCount: yearFlights.length,
      totalMiles,
      totalKm,
      hoursAloft,
      earthLaps,
      topAirline,
      topAirport: topApt,
      longestFlight,
      persona
    };
  });

  return wrappedByYear;
}

module.exports = {
  inferAircraft,
  computeFleetAndSeats,
  computeBadges,
  computeTrips,
  computeWrapped
};

