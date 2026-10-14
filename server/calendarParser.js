// Flight Parser for Calendar Events (Google Calendar API & .ics files)

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
  { match: /\b(?:air tahiti nui)\b/i, code: 'TN', name: 'Air Tahiti Nui' },
  { match: /\b(?:aircalin)\b/i, code: 'SB', name: 'Aircalin' },
  { match: /\b(?:air vanuatu)\b/i, code: 'NF', name: 'Air Vanuatu' },
  { match: /\b(?:air niugini)\b/i, code: 'PX', name: 'Air Niugini' },

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
  { match: /\b(?:porter|porter airlines)\b/i, code: 'PD', name: 'Porter Airlines' },
  { match: /\b(?:flair|flair airlines)\b/i, code: 'F8', name: 'Flair Airlines' },
  { match: /\b(?:air transat)\b/i, code: 'TS', name: 'Air Transat' },

  // Latin America & Caribbean
  { match: /\b(?:aeromexico|amx)\b/i, code: 'AM', name: 'Aeromexico' },
  { match: /\b(?:volaris|voi)\b/i, code: 'Y4', name: 'Volaris' },
  { match: /\b(?:vivaaerobus|viva aerobus|viv)\b/i, code: 'VB', name: 'VivaAerobus' },
  { match: /\b(?:copa|copa airlines|cmp)\b/i, code: 'CM', name: 'Copa Airlines' },
  { match: /\b(?:avianca|ava)\b/i, code: 'AV', name: 'Avianca' },
  { match: /\b(?:latam|tam|lan)\b/i, code: 'LA', name: 'LATAM Airlines' },
  { match: /\b(?:gol|gol transportes aereos)\b/i, code: 'G3', name: 'Gol' },
  { match: /\b(?:azul|azul brazilian)\b/i, code: 'AD', name: 'Azul Brazilian Airlines' },
  { match: /\b(?:aerolineas argentinas)\b/i, code: 'AR', name: 'Aerolineas Argentinas' },

  // Europe & UK
  { match: /\b(?:british airways|speedbird|baw)\b/i, code: 'BA', name: 'British Airways' },
  { match: /\b(?:air france|afr)\b/i, code: 'AF', name: 'Air France' },
  { match: /\b(?:lufthansa|dlh)\b/i, code: 'LH', name: 'Lufthansa' },
  { match: /\b(?:klm|klm royal dutch airlines)\b/i, code: 'KL', name: 'KLM Royal Dutch Airlines' },
  { match: /\b(?:swiss|swiss air|swiss international)\b/i, code: 'LX', name: 'SWISS' },
  { match: /\b(?:austrian|austrian airlines)\b/i, code: 'OS', name: 'Austrian Airlines' },
  { match: /\b(?:brussels airlines)\b/i, code: 'SN', name: 'Brussels Airlines' },
  { match: /\b(?:eurowings)\b/i, code: 'EW', name: 'Eurowings' },
  { match: /\b(?:iberia|ibe)\b/i, code: 'IB', name: 'Iberia' },
  { match: /\b(?:aer lingus|ein)\b/i, code: 'EI', name: 'Aer Lingus' },
  { match: /\b(?:air europa)\b/i, code: 'UX', name: 'Air Europa' },
  { match: /\b(?:tap|tap air portugal)\b/i, code: 'TP', name: 'TAP Air Portugal' },
  { match: /\b(?:ita airways|alitalia)\b/i, code: 'AZ', name: 'ITA Airways' },
  { match: /\b(?:ryanair|rya)\b/i, code: 'FR', name: 'Ryanair' },
  { match: /\b(?:easyjet|ezy)\b/i, code: 'U2', name: 'easyJet' },
  { match: /\b(?:wizz|wizz air)\b/i, code: 'W6', name: 'Wizz Air' },
  { match: /\b(?:vueling)\b/i, code: 'VY', name: 'Vueling Airlines' },
  { match: /\b(?:norwegian|norwegian air)\b/i, code: 'DY', name: 'Norwegian Air' },
  { match: /\b(?:icelandair|icelandic|icelandic air|iceair)\b/i, code: 'FI', name: 'Icelandair' },
  { match: /\b(?:play|fly play)\b/i, code: 'OG', name: 'PLAY' },
  { match: /\b(?:sas|scandinavian airlines)\b/i, code: 'SK', name: 'Scandinavian Airlines' },
  { match: /\b(?:finnair|fin)\b/i, code: 'AY', name: 'Finnair' },
  { match: /\b(?:lot|lot polish airlines)\b/i, code: 'LO', name: 'LOT Polish Airlines' },
  { match: /\b(?:turkish|turkish airlines|thy)\b/i, code: 'TK', name: 'Turkish Airlines' },
  { match: /\b(?:pegasus|pegasus airlines)\b/i, code: 'PC', name: 'Pegasus Airlines' },
  { match: /\b(?:aegean|aegean airlines)\b/i, code: 'A3', name: 'Aegean Airlines' },
  { match: /\b(?:airbaltic|air baltic)\b/i, code: 'BT', name: 'airBaltic' },
  { match: /\b(?:condor)\b/i, code: 'DE', name: 'Condor' },
  { match: /\b(?:transavia)\b/i, code: 'HV', name: 'Transavia' },

  // Middle East
  { match: /\b(?:emirates|uae)\b/i, code: 'EK', name: 'Emirates' },
  { match: /\b(?:qatar|qatar airways|qtr)\b/i, code: 'QR', name: 'Qatar Airways' },
  { match: /\b(?:etihad|etihad airways|etd)\b/i, code: 'EY', name: 'Etihad Airways' },
  { match: /\b(?:flydubai)\b/i, code: 'FZ', name: 'Flydubai' },
  { match: /\b(?:air arabia)\b/i, code: 'G9', name: 'Air Arabia' },
  { match: /\b(?:saudia|saudi arabian airlines)\b/i, code: 'SV', name: 'Saudia' },
  { match: /\b(?:gulf air)\b/i, code: 'GF', name: 'Gulf Air' },
  { match: /\b(?:oman air)\b/i, code: 'WY', name: 'Oman Air' },
  { match: /\b(?:kuwait airways)\b/i, code: 'KU', name: 'Kuwait Airways' },
  { match: /\b(?:royal jordanian)\b/i, code: 'RJ', name: 'Royal Jordanian' },
  { match: /\b(?:middle east airlines|mea)\b/i, code: 'ME', name: 'Middle East Airlines' },
  { match: /\b(?:el al|elal)\b/i, code: 'LY', name: 'EL AL Israel Airlines' },

  // Asia
  { match: /\b(?:singapore airlines|sia)\b/i, code: 'SQ', name: 'Singapore Airlines' },
  { match: /\b(?:scoot)\b/i, code: 'TR', name: 'Scoot' },
  { match: /\b(?:cathay pacific|cpa)\b/i, code: 'CX', name: 'Cathay Pacific' },
  { match: /\b(?:hk express|hong kong express)\b/i, code: 'UO', name: 'HK Express' },
  { match: /\b(?:ana|all nippon|all nippon airways)\b/i, code: 'NH', name: 'All Nippon Airways' },
  { match: /\b(?:jal|japan airlines)\b/i, code: 'JL', name: 'Japan Airlines' },
  { match: /\b(?:skymark|skymark airlines)\b/i, code: 'BC', name: 'Skymark Airlines' },
  { match: /\b(?:peach|peach aviation)\b/i, code: 'MM', name: 'Peach Aviation' },
  { match: /\b(?:korean air|kal)\b/i, code: 'KE', name: 'Korean Air' },
  { match: /\b(?:asiana|asiana airlines)\b/i, code: 'OZ', name: 'Asiana Airlines' },
  { match: /\b(?:jeju air)\b/i, code: '7C', name: 'Jeju Air' },
  { match: /\b(?:jin air)\b/i, code: 'LJ', name: 'Jin Air' },
  { match: /\b(?:eva air)\b/i, code: 'BR', name: 'EVA Air' },
  { match: /\b(?:china airlines)\b/i, code: 'CI', name: 'China Airlines' },
  { match: /\b(?:starlux|starlux airlines)\b/i, code: 'JX', name: 'Starlux Airlines' },
  { match: /\b(?:thai airways|tha)\b/i, code: 'TG', name: 'Thai Airways' },
  { match: /\b(?:malaysia airlines|mas)\b/i, code: 'MH', name: 'Malaysia Airlines' },
  { match: /\b(?:airasia|air asia)\b/i, code: 'AK', name: 'AirAsia' },
  { match: /\b(?:philippine airlines|pal)\b/i, code: 'PR', name: 'Philippine Airlines' },
  { match: /\b(?:cebu pacific)\b/i, code: '5J', name: 'Cebu Pacific' },
  { match: /\b(?:vietnam airlines|hvn)\b/i, code: 'VN', name: 'Vietnam Airlines' },
  { match: /\b(?:vietjet|vietjet air)\b/i, code: 'VJ', name: 'VietJet Air' },
  { match: /\b(?:garuda|garuda indonesia)\b/i, code: 'GA', name: 'Garuda Indonesia' },
  { match: /\b(?:citilink)\b/i, code: 'QG', name: 'Citilink' },
  { match: /\b(?:lion air)\b/i, code: 'JT', name: 'Lion Air' },
  { match: /\b(?:air india|aic)\b/i, code: 'AI', name: 'Air India' },
  { match: /\b(?:indigo)\b/i, code: '6E', name: 'IndiGo' },
  { match: /\b(?:spicejet)\b/i, code: 'SG', name: 'SpiceJet' },
  { match: /\b(?:vistara)\b/i, code: 'UK', name: 'Vistara' },
  { match: /\b(?:srilankan|sri lankan airlines)\b/i, code: 'UL', name: 'SriLankan Airlines' },
  { match: /\b(?:air china)\b/i, code: 'CA', name: 'Air China' },
  { match: /\b(?:china eastern)\b/i, code: 'MU', name: 'China Eastern Airlines' },
  { match: /\b(?:china southern)\b/i, code: 'CZ', name: 'China Southern Airlines' },
  { match: /\b(?:hainan airlines)\b/i, code: 'HU', name: 'Hainan Airlines' },
  { match: /\b(?:xiamenair|xiamen airlines)\b/i, code: 'MF', name: 'XiamenAir' },
  { match: /\b(?:sichuan airlines)\b/i, code: '3U', name: 'Sichuan Airlines' },
  { match: /\b(?:shenzhen airlines)\b/i, code: 'ZH', name: 'Shenzhen Airlines' },
  { match: /\b(?:shandong airlines)\b/i, code: 'SC', name: 'Shandong Airlines' },

  // Africa
  { match: /\b(?:ethiopian|ethiopian airlines)\b/i, code: 'ET', name: 'Ethiopian Airlines' },
  { match: /\b(?:egyptair|msr)\b/i, code: 'MS', name: 'EgyptAir' },
  { match: /\b(?:royal air maroc|ram)\b/i, code: 'AT', name: 'Royal Air Maroc' },
  { match: /\b(?:south african airways|saa)\b/i, code: 'SA', name: 'South African Airways' },
  { match: /\b(?:kenya airways)\b/i, code: 'KQ', name: 'Kenya Airways' },
  { match: /\b(?:rwandair)\b/i, code: 'WB', name: 'RwandAir' },
  { match: /\b(?:air algerie)\b/i, code: 'AH', name: 'Air Algerie' },
  { match: /\b(?:tunisair)\b/i, code: 'TU', name: 'Tunisair' }
];

const MAJOR_AIRLINE_CODES = {
  // North America
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  WN: 'Southwest Airlines',
  AS: 'Alaska Airlines',
  B6: 'JetBlue Airways',
  NK: 'Spirit Airlines',
  F9: 'Frontier Airlines',
  HA: 'Hawaiian Airlines',
  G4: 'Allegiant Air',
  SY: 'Sun Country Airlines',
  MX: 'Breeze Airways',
  XP: 'Avelo Airlines',
  AC: 'Air Canada',
  WS: 'WestJet',
  PD: 'Porter Airlines',
  F8: 'Flair Airlines',
  TS: 'Air Transat',
  AM: 'Aeromexico',
  Y4: 'Volaris',
  VB: 'VivaAerobus',

  // Central & South America
  CM: 'Copa Airlines',
  AV: 'Avianca',
  LA: 'LATAM Airlines',
  G3: 'Gol',
  AD: 'Azul Brazilian Airlines',
  AR: 'Aerolineas Argentinas',

  // Europe & UK
  BA: 'British Airways',
  VS: 'Virgin Atlantic',
  VX: 'Virgin America',
  AF: 'Air France',
  KL: 'KLM Royal Dutch Airlines',
  LH: 'Lufthansa',
  LX: 'SWISS',
  OS: 'Austrian Airlines',
  SN: 'Brussels Airlines',
  EW: 'Eurowings',
  IB: 'Iberia',
  EI: 'Aer Lingus',
  UX: 'Air Europa',
  TP: 'TAP Air Portugal',
  AZ: 'ITA Airways',
  FR: 'Ryanair',
  U2: 'easyJet',
  W6: 'Wizz Air',
  VY: 'Vueling Airlines',
  DY: 'Norwegian Air',
  D8: 'Norwegian Air Sweden',
  FI: 'Icelandair',
  OG: 'PLAY',
  SK: 'Scandinavian Airlines',
  AY: 'Finnair',
  LO: 'LOT Polish Airlines',
  TK: 'Turkish Airlines',
  PC: 'Pegasus Airlines',
  A3: 'Aegean Airlines',
  BT: 'airBaltic',
  DE: 'Condor',
  HV: 'Transavia',
  TO: 'Transavia France',

  // Australia, New Zealand & Pacific
  VA: 'Virgin Australia',
  QF: 'Qantas',
  JQ: 'Jetstar Airways',
  NZ: 'Air New Zealand',
  ZL: 'Regional Express',
  QQ: 'Alliance Airlines',
  FJ: 'Fiji Airways',
  TN: 'Air Tahiti Nui',
  SB: 'Aircalin',
  NF: 'Air Vanuatu',
  PX: 'Air Niugini',

  // Middle East
  EK: 'Emirates',
  QR: 'Qatar Airways',
  EY: 'Etihad Airways',
  FZ: 'Flydubai',
  G9: 'Air Arabia',
  SV: 'Saudia',
  GF: 'Gulf Air',
  WY: 'Oman Air',
  KU: 'Kuwait Airways',
  RJ: 'Royal Jordanian',
  ME: 'Middle East Airlines',
  LY: 'EL AL Israel Airlines',

  // Asia
  SQ: 'Singapore Airlines',
  TR: 'Scoot',
  CX: 'Cathay Pacific',
  UO: 'HK Express',
  NH: 'All Nippon Airways',
  JL: 'Japan Airlines',
  BC: 'Skymark Airlines',
  MM: 'Peach Aviation',
  KE: 'Korean Air',
  OZ: 'Asiana Airlines',
  '7C': 'Jeju Air',
  LJ: 'Jin Air',
  BR: 'EVA Air',
  CI: 'China Airlines',
  JX: 'Starlux Airlines',
  TG: 'Thai Airways',
  MH: 'Malaysia Airlines',
  AK: 'AirAsia',
  D7: 'AirAsia X',
  PR: 'Philippine Airlines',
  '5J': 'Cebu Pacific',
  VN: 'Vietnam Airlines',
  VJ: 'VietJet Air',
  GA: 'Garuda Indonesia',
  QG: 'Citilink',
  JT: 'Lion Air',
  AI: 'Air India',
  '6E': 'IndiGo',
  SG: 'SpiceJet',
  UK: 'Vistara',
  IX: 'Air India Express',
  UL: 'SriLankan Airlines',
  CA: 'Air China',
  MU: 'China Eastern Airlines',
  CZ: 'China Southern Airlines',
  HU: 'Hainan Airlines',
  MF: 'XiamenAir',
  '3U': 'Sichuan Airlines',
  ZH: 'Shenzhen Airlines',
  SC: 'Shandong Airlines',

  // Africa
  ET: 'Ethiopian Airlines',
  MS: 'EgyptAir',
  AT: 'Royal Air Maroc',
  SA: 'South African Airways',
  KQ: 'Kenya Airways',
  WB: 'RwandAir',
  AH: 'Air Algerie',
  TU: 'Tunisair'
};

const CITY_ALIASES = {
  // Australia & New Zealand
  'AUCKLAND': 'AKL',
  'AUKLAND': 'AKL',
  'WELLINGTON': 'WLG',
  'CHRISTCHURCH': 'CHC',
  'QUEENSTOWN': 'ZQN',
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
  'NADI': 'NAN',
  'FIJI': 'NAN',
  'PORT MORESBY': 'POM',

  // Iceland & Atlantic
  'REYKJAVIK': 'KEF',
  'REYKJAVÍK': 'KEF',
  'REYJAVIK': 'KEF',
  'REIKJAVIK': 'KEF',
  'REYKAVIK': 'KEF',
  'ICELAND': 'KEF',
  'KEFLAVIK': 'KEF',

  // United States & Canada
  'KANSAS CITY': 'MCI',
  'AUSTIN': 'AUS',
  'CHICAGO': 'ORD',
  'MIDWAY': 'MDW',
  'NEW YORK': 'JFK',
  'LOS ANGELES': 'LAX',
  'SAN FRANCISCO': 'SFO',
  'SAN FRANSISCO': 'SFO',
  'OAKLAND': 'OAK',
  'LONG BEACH': 'LGB',
  'SAN JOSE': 'SJC',
  'SAN DIEGO': 'SAN',
  'SEATTLE': 'SEA',
  'DENVER': 'DEN',
  'ATLANTA': 'ATL',
  'DALLAS': 'DFW',
  'DALLAS LOVE': 'DAL',
  'LOVE FIELD': 'DAL',
  'HOUSTON': 'IAH',
  'HOBBY': 'HOU',
  'HOUSTON HOBBY': 'HOU',
  'MIAMI': 'MIA',
  'ORLANDO': 'MCO',
  'LAS VEGAS': 'LAS',
  'MINNEAPOLIS': 'MSP',
  'MINNEAPOLIS-ST. PAUL': 'MSP',
  'DETROIT': 'DTW',
  'PHOENIX': 'PHX',
  'HONOLULU': 'HNL',
  'HAWAII': 'HNL',
  'MAUI': 'OGG',
  'KAHULUI': 'OGG',
  'BOSTON': 'BOS',
  'PHILADELPHIA': 'PHL',
  'PITTSBURGH': 'PIT',
  'SALT LAKE CITY': 'SLC',
  'ST. LOUIS': 'STL',
  'SAINT LOUIS': 'STL',
  'WASHINGTON': 'IAD',
  'WASHINGTON DULLES': 'IAD',
  'DULLES': 'IAD',
  'REAGAN': 'DCA',
  'NATIONAL': 'DCA',
  'TORONTO': 'YYZ',
  'VANCOUVER': 'YVR',
  'MONTREAL': 'YUL',
  'CALGARY': 'YYC',

  // Mexico & Caribbean
  'CANCUN': 'CUN',
  'CANCÚN': 'CUN',
  'MEXICO CITY': 'MEX',
  'CABO': 'SJD',
  'ARUBA': 'AUA',

  // Europe
  'LONDON': 'LHR',
  'HEATHROW': 'LHR',
  'GATWICK': 'LGW',
  'PARIS': 'CDG',
  'AMSTERDAM': 'AMS',
  'FRANKFURT': 'FRA',
  'MUNICH': 'MUC',
  'DUBLIN': 'DUB',
  'MADRID': 'MAD',
  'BARCELONA': 'BCN',
  'ROME': 'FCO',
  'MILAN': 'MXP',
  'ZURICH': 'ZRH',
  'VIENNA': 'VIE',

  // Asia
  'TOKYO': 'HND',
  'HANEDA': 'HND',
  'NARITA': 'NRT',
  'SINGAPORE': 'SIN',
  'HONG KONG': 'HKG',
  'SEOUL': 'ICN',
  'INCHEON': 'ICN',
  'TAIPEI': 'TPE',
  'BANGKOK': 'BKK',
  'MANILA': 'MNL',
  'CLARK': 'CRK'
};

// 3-letter strings that occur in English vocabulary, addresses, calendar metadata, time zones, days, and months.
// Must NEVER be matched as standalone IATA codes unless explicitly enclosed in parentheses like (MCI) or (AUS).
const IATA_STOPWORDS = new Set([
  'CRK', 'POM', 'OAK', 'BLV', 'TER', 'STE', 'APT', 'EXT', 'DIV', 'CTR',
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'ALL', 'CAN', 'HAD', 'HER',
  'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD',
  'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY',
  'SHE', 'TOO', 'USE', 'AIR', 'CAR', 'BUS', 'CAB', 'HOT', 'MAP', 'BAR',
  'BED', 'BOX', 'EAT', 'EYE', 'FAT', 'FLY', 'FUN', 'GOD', 'GUN', 'GUY',
  'HIT', 'ICE', 'JOB', 'KEY', 'KID', 'LAW', 'LEG', 'LIE', 'LIP', 'LOT',
  'LOW', 'NET', 'OIL', 'PAY', 'RED', 'RUN', 'SEA', 'SET', 'SUN', 'TOP',
  'WAR', 'WIN', 'YES', 'YET', 'BIG', 'DOG', 'CAT', 'DRY', 'FAR', 'FEW',
  'FIT', 'PAN', 'PET', 'POT', 'RAW', 'RIB', 'ROD', 'ROW', 'SAD', 'SKY',
  'SON', 'TAX', 'TEA', 'TIE', 'TOE', 'VAN', 'WET', 'ARM', 'BAG', 'BEG',
  'BOW', 'CRY', 'CUP', 'DAM', 'DIG', 'DIP', 'DOT', 'EAR', 'FAN', 'FED',
  'FEE', 'FOG', 'FOX', 'GAP', 'GEL', 'GEM', 'GUM', 'HAT', 'HEN', 'HIP',
  'HOG', 'HOP', 'HUG', 'HUT', 'INK', 'JAM', 'JAR', 'JAW', 'JET', 'JOY',
  'JUG', 'LAB', 'LAP', 'LOG', 'MAD', 'MUD', 'MUG', 'NOD', 'NUT', 'ODD',
  'PAD', 'PAL', 'PEG', 'PEN', 'PIN', 'PIT', 'POD', 'POP', 'PUP', 'RAG',
  'RAM', 'RAT', 'RID', 'RIM', 'RIP', 'ROB', 'ROT', 'RUB', 'RUG', 'RUT',
  'SAP', 'SAW', 'SEW', 'SIN', 'SIP', 'SIR', 'SIX', 'SKI', 'SOB', 'SOS',
  'SOW', 'SPY', 'SUB', 'SUE', 'SUM', 'TAB', 'TAG', 'TAP', 'TAR', 'TIN',
  'TIP', 'TOY', 'TUB', 'TUG', 'URN', 'VET', 'VOW', 'WAX', 'WEB', 'WIG',
  'WIP', 'YAK', 'YAM', 'YAP', 'ZIP',
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'GMT', 'UTC', 'AM', 'PM',
  'PNR', 'REF', 'CONF', 'RES', 'NON', 'STOP', 'VIA', 'MIN', 'HRS', 'SEC',
  'GATE', 'SEAT', 'ROW', 'BAG', 'BAGS', 'TIK', 'TKT', 'FLT', 'DOC', 'PDF',
  'APP', 'WEB', 'NET', 'ORG', 'COM', 'GOV', 'MIL', 'EDU', 'TXT'
]);

// Known verified flight numbers for precision origin/destination inference
const KNOWN_FLIGHT_ROUTES = {
  'VA 1413': { origin: 'SYD', dest: 'CNS' },
  'VA 770': { origin: 'CNS', dest: 'BNE' },
  'JQ 133': { origin: 'OOL', dest: 'AKL' },
  'NZ 1220': { origin: 'ZQN', dest: 'AKL' },
  'DL 64': { origin: 'AKL', dest: 'LAX' },
  'DL 1318': { origin: 'LAX', dest: 'MCI' },
  'FI 852': { origin: 'ORD', dest: 'KEF' },
  'FI 853': { origin: 'KEF', dest: 'ORD' },
  'UA 1641': { origin: 'MCI', dest: 'ORD' },
  'UA 1338': { origin: 'ORD', dest: 'MCI' },
  'UA 5892': { origin: 'MCI', dest: 'ORD' },
  'UA 3478': { origin: 'ORD', dest: 'MCI' },
  'UA 303': { origin: 'MCI', dest: 'ORD' },
  'UA 1905': { origin: 'ORD', dest: 'PIT' },
  'UA 2390': { origin: 'PIT', dest: 'ORD' },
  'UA 310': { origin: 'ORD', dest: 'MCI' },
  'UA 669': { origin: 'AUS', dest: 'IAH' },
  'UA 1114': { origin: 'IAH', dest: 'CUN' },
  'UA 1058': { origin: 'CUN', dest: 'IAH' },
  'UA 1179': { origin: 'IAH', dest: 'AUS' },
  'AS 291': { origin: 'MCI', dest: 'SEA' },
  'AS 564': { origin: 'SEA', dest: 'MCI' },
  'AA 4529': { origin: 'MCI', dest: 'IAD' },
  'AA 4248': { origin: 'MCI', dest: 'AUS' },
  'AA 3546': { origin: 'AUS', dest: 'MCI' },
  'AA 1255': { origin: 'MCI', dest: 'MIA' },
  'AA 2187': { origin: 'AUA', dest: 'MIA' },
  'AA 1397': { origin: 'MIA', dest: 'MCI' },
  'WN 636': { origin: 'MCI', dest: 'AUS' },
  'WN 2196': { origin: 'AUS', dest: 'MCI' },
  'WN 358': { origin: 'MCI', dest: 'AUS' },
  'WN 2745': { origin: 'AUS', dest: 'MCI' },
  'WN 3651': { origin: 'MDW', dest: 'MCI' },
  'WN 2124': { origin: 'MCI', dest: 'ORD' },
  'WN 4282': { origin: 'MCI', dest: 'AUS' },
  'WN 3131': { origin: 'AUS', dest: 'MCI' },
  'WN 3110': { origin: 'MCI', dest: 'AUS' },
  'WN 4363': { origin: 'AUS', dest: 'MCI' },
  'WN 2881': { origin: 'MCI', dest: 'AUS' },
  'WN 846': { origin: 'AUS', dest: 'MCI' },
  'WN 3641': { origin: 'AUS', dest: 'MCI' },
  'WN 884': { origin: 'MCI', dest: 'AUS' },
  'WN 658': { origin: 'AUS', dest: 'MCI' },
  'WN 712': { origin: 'MCI', dest: 'AUS' },
  'WN 1131': { origin: 'AUS', dest: 'MCI' },
  'WN 101': { origin: 'AUS', dest: 'MCI' },
  'WN 1158': { origin: 'MCI', dest: 'AUS' },
  'WN 1840': { origin: 'AUS', dest: 'MCI' },
  'WN 1889': { origin: 'ORD', dest: 'AUS' },
  'WN 3225': { origin: 'AUS', dest: 'MCI' },
  'WN 2427': { origin: 'DCA', dest: 'MCI' },
  'WN 2931': { origin: 'MCI', dest: 'ORD' },
  'WN 142': { origin: 'MDW', dest: 'AUS' },
  'WN 6199': { origin: 'MCI', dest: 'LGB' },
  'WN 3463': { origin: 'LGB', dest: 'OAK' },
  'WN 2471': { origin: 'OAK', dest: 'LAS' },
  'WN 2915': { origin: 'LAS', dest: 'MCI' },
  'WN 5250': { origin: 'MCI', dest: 'AUS' },
  'WN 854': { origin: 'AUS', dest: 'MCI' },
  'WN 254': { origin: 'MCI', dest: 'AUS' },
  'WN 1350': { origin: 'AUS', dest: 'MCI' },
  'WN 945': { origin: 'MCI', dest: 'DEN' },
  'WN 1678': { origin: 'DEN', dest: 'ONT' },
  'WN 20': { origin: 'ONT', dest: 'DEN' },
  'WN 1371': { origin: 'DEN', dest: 'MCI' },
  'WN 1095': { origin: 'MCI', dest: 'LAX' },
  'WN 1526': { origin: 'LAX', dest: 'MCI' },
  'WN 574': { origin: 'MCI', dest: 'LAX' },
  'WN 575': { origin: 'LAX', dest: 'MCI' },
  'DL 1613': { origin: 'MCI', dest: 'MSP' },
  'DL 1679': { origin: 'MCI', dest: 'DTW' },
  'DL 2844': { origin: 'DTW', dest: 'MCI' }
};

function findAirportByFuzzyCity(cityStr, db) {
  if (!cityStr || typeof cityStr !== 'string') return null;
  const rawClean = cityStr.replace(/\b(?:airport|intl|international|aerodrome|airfield|terminal)\b|\(|\)/gi, '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!rawClean || rawClean.length < 3) return null;

  const candidates = [rawClean];
  const withoutCity = rawClean.replace(/\bCITY\b/gi, '').trim();
  if (withoutCity && withoutCity !== rawClean && withoutCity.length >= 3) {
    candidates.push(withoutCity);
  }

  for (const clean of candidates) {
    // 1. Direct alias check
    if (CITY_ALIASES[clean]) {
      const aliasApt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(CITY_ALIASES[clean]);
      if (aliasApt) return aliasApt;
    }

    // 2. Exact match on city column
    const exactCity = db.prepare(`
      SELECT * FROM airports
      WHERE UPPER(city) = ?
      ORDER BY CASE WHEN UPPER(name) LIKE '%INTERNATIONAL%' OR UPPER(name) LIKE '%INTL%' THEN 1 ELSE 2 END ASC
      LIMIT 1
    `).get(clean);
    if (exactCity) return exactCity;

    // 3. Comma-separated query (e.g. "Austin, TX" or "Cairns, Queensland")
    if (clean.includes(',')) {
      const cityPart = clean.split(',')[0].trim();
      if (cityPart && cityPart.length >= 3) {
        if (CITY_ALIASES[cityPart]) {
          const aliasApt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(CITY_ALIASES[cityPart]);
          if (aliasApt) return aliasApt;
        }
        const cityMatch = db.prepare(`
          SELECT * FROM airports
          WHERE UPPER(city) = ?
          ORDER BY CASE WHEN UPPER(name) LIKE '%INTERNATIONAL%' OR UPPER(name) LIKE '%INTL%' THEN 1 ELSE 2 END ASC
          LIMIT 1
        `).get(cityPart);
        if (cityMatch) return cityMatch;
      }
    }

    // 4. Exact match on airport name
    const exactName = db.prepare(`
      SELECT * FROM airports
      WHERE UPPER(name) = ? OR UPPER(name) = ?
      LIMIT 1
    `).get(clean, `${clean} AIRPORT`);
    if (exactName) return exactName;
  }

  return null;
}

function findAirportFromText(str, db) {
  if (!str || typeof str !== 'string') return null;

  // 1. Explicit IATA code in parentheses: "(MCI)", "(SYD)", "(ORD)", "(AUS)"
  const parenMatch = str.match(/\(([A-Z]{3})\)/);
  if (parenMatch) {
    const code = parenMatch[1];
    const apt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(code);
    if (apt) return apt;
  }

  // 2. Airport keyword followed by code: "Airport: MCI" or "Airport MCI"
  const prefixMatch = str.match(/\b(?:Airport|Code|Dep|Arr)\s*:?\s*([A-Z]{3})\b/i);
  if (prefixMatch) {
    const code = prefixMatch[1].toUpperCase();
    if (!IATA_STOPWORDS.has(code)) {
      const apt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(code);
      if (apt) return apt;
    }
  }

  // 3. Scan for standalone uppercase 3-letter IATA codes, excluding common words and abbreviations
  const iataMatches = Array.from(str.matchAll(/\b([A-Z]{3})\b/g)).map(m => m[1]);
  for (const code of iataMatches) {
    if (IATA_STOPWORDS.has(code)) continue;
    const apt = db.prepare('SELECT * FROM airports WHERE iata = ?').get(code);
    if (apt) return apt;
  }

  // 4. Match full phrase against known cities / airport names
  return findAirportByFuzzyCity(str, db);
}

// Determines if location text is an actual airport rather than a street address, hotel, or city
function isExplicitAirportLocation(loc) {
  if (!loc || typeof loc !== 'string') return false;
  if (/\(([A-Z]{3})\)/.test(loc)) return true;
  if (/\b(?:airport|airfield|aerodrome|terminal\s*[0-9A-Za-z]|intl\s+airport|international\s+airport)\b/i.test(loc)) return true;
  return false;
}

// Sanity check to prevent impossible routes from being detected
function validateRoutePlausibility(airlineCode, orig, dest, distanceMiles) {
  if (!orig || !dest || orig.iata === dest.iata) return false;
  if (distanceMiles > 9800) return false; // Above longest commercial flight in the world

  // Clark (CRK) in Philippines
  if (orig.iata === 'CRK' || dest.iata === 'CRK') {
    const validCrkCodes = new Set(['PR', '5J', 'AK', 'EK', 'QR', 'TR', 'OZ', '7C', 'LJ']);
    if (!validCrkCodes.has(airlineCode)) return false;
  }

  // Port Moresby (POM) in Papua New Guinea
  if (orig.iata === 'POM' || dest.iata === 'POM') {
    const validPomCodes = new Set(['PX', 'QF', 'PR', 'CG']);
    if (!validPomCodes.has(airlineCode)) return false;
  }

  // Southwest Airlines (WN)
  if (airlineCode === 'WN') {
    if (distanceMiles > 3500) return false;
    if (orig.lon < -170 || orig.lon > -50 || orig.lat < 5 || orig.lat > 65) return false;
    if (dest.lon < -170 || dest.lon > -50 || dest.lat < 5 || dest.lat > 65) return false;
  }

  // Alaska Airlines (AS)
  if (airlineCode === 'AS') {
    if (distanceMiles > 4500) return false;
    if (orig.lon < -175 || orig.lon > -50) return false;
    if (dest.lon < -175 || dest.lon > -50) return false;
  }

  // Virgin Australia (VA)
  if (airlineCode === 'VA') {
    if (orig.iata === 'CRK' || dest.iata === 'CRK') return false;
    if (orig.iata === 'POM' || dest.iata === 'POM') return false;
    if (distanceMiles > 4500) return false;
  }

  return true;
}

function parseICS(icsText) {
  const events = [];
  const lines = icsText.replace(/\r\n /g, '').split(/\r?\n/);

  let inEvent = false;
  let cur = {};

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      cur = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (inEvent && (cur.summary || cur.description)) {
        events.push(cur);
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        cur.summary = line.substring(8).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        cur.description = line.substring(12).trim();
      } else if (line.startsWith('LOCATION:')) {
        cur.location = line.substring(9).trim();
      } else if (line.startsWith('DTSTART')) {
        const parts = line.split(':');
        const dt = parts[parts.length - 1];
        if (dt) {
          const y = dt.substring(0, 4);
          const m = dt.substring(4, 6);
          const d = dt.substring(6, 8);
          cur.date = `${y}-${m}-${d}`;
        }
      }
    }
  }

  return events;
}

// Extract flight candidate from calendar event
function extractFlightFromEvent(event, db, userEmail) {
  const summary = event.summary || '';
  const desc = event.description || '';
  const loc = event.location || '';
  const text = `${summary} ${desc} ${loc}`;

  // 1. REJECT explicit non-flight events (hotels, dining, reminders, drives, car rentals)
  const nonFlightRegex = /\b(?:hotel|motel|resort|inn\b|suites\b|hostel|lodge|airbnb|vrbo|stay\s+at|check-in\s+at\s+hotel|lodging|restaurant|dinner|lunch|breakfast|brunch|bar\b|grill|cafe|bistro|brewery|table\s+for|reservation\s+at|reservation\s+for|opentable|resy|memories\s+from|anniversary|birthday|dentist|doctor|appointment|meeting|drive\s+to|road\s+trip|car\s+rental|rental\s+car|hertz|avis|enterprise|budget\s+rent|alamo\s+rent|national\s+car|train|amtrak|ferry|cruise|boat|tour\b|safari|cabin|cottage|campground|campsite|hike|trail|national\s+park|state\s+park)\b/i;
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

  // 1. Explicit IATA route pair (e.g. MCI to ORD, ORD -> KEF, SYD - CNS)
  const routeMatch = text.match(/\b([A-Z]{3})\s*(?:to|->|=>|➔|–|—|-|\/|>|✈️|✈)\s*([A-Z]{3})\b/i);
  if (routeMatch) {
    const c1 = routeMatch[1].toUpperCase();
    const c2 = routeMatch[2].toUpperCase();
    if (!IATA_STOPWORDS.has(c1) && !IATA_STOPWORDS.has(c2)) {
      const a1 = db.prepare('SELECT iata FROM airports WHERE iata = ?').get(c1);
      const a2 = db.prepare('SELECT iata FROM airports WHERE iata = ?').get(c2);
      if (a1 && a2 && a1.iata !== a2.iata) {
        originIata = a1.iata;
        destIata = a2.iata;
      }
    }
  }

  // 2. City Route pair in summary or text (e.g. "Flight: Chicago - Reykjavík", "Sydney to Auckland")
  if (!originIata || !destIata) {
    const cityRouteRegex = /(?:(?:from|departing)\s+)?([A-Za-z\s]{3,30}?)\s+(?:to|->|=>|➔|–|—|-|\/|>|✈️|✈)\s+([A-Za-z\s]{3,30}?)(?:\s+(?:on|with|via|operated\s+by|operated|at|#|\d)\b|\(|\-|,|$)/gi;
    let m;
    while ((m = cityRouteRegex.exec(text)) !== null) {
      let origRaw = m[1].replace(/^(?:Flight|Fly|Flying|Trip|Vacation)\s+(?:to\s+)?/i, '').replace(/Flight|Trip|Vacation|\d+|\//gi, '').trim();
      let destRaw = m[2].replace(/\s+(?:on|with|via|operated\s+by|operated|at)\b.*$/i, '').trim();
      destRaw = destRaw.replace(/Flight|Trip|Vacation|\d+|\//gi, '').trim();

      if (!origRaw || !destRaw) continue;

      const origApt = findAirportByFuzzyCity(origRaw, db) || findAirportFromText(origRaw, db);
      const destApt = findAirportByFuzzyCity(destRaw, db) || findAirportFromText(destRaw, db);

      if (origApt && destApt && origApt.iata !== destApt.iata) {
        if (!originIata) originIata = origApt.iata;
        if (!destIata) destIata = destApt.iata;
        break;
      }
    }
  }

  // 3. Flight to [City]
  if (!destIata) {
    const destCityMatch = text.match(/(?:Flight|Fly|Flying)\s+to\s+([A-Za-z\s]+?)(?:\s+(?:on|with|via|operated|at)\b|\(|\-|,|$)/i);
    if (destCityMatch) {
      const city = destCityMatch[1].replace(/Virgin|Australia|Qantas|Jetstar|Icelandair|Delta|United|Southwest|American|Airways|Airlines/gi, '').trim();
      const apt = findAirportByFuzzyCity(city, db) || findAirportFromText(city, db);
      if (apt) destIata = apt.iata;
    }
  }

  // 4. Flight from [City] or Departing [City]
  if (!originIata) {
    const origCityMatch = text.match(/(?:(?:Flight|Trip)\s+from|(?:Departing|Depart|Departs|Leaving)(?:\s+from)?)\s+([A-Za-z\s]+?)(?:\s+(?:to|on|with|via|operated|at)\b|\(|\-|,|$)/i);
    if (origCityMatch) {
      const city = origCityMatch[1].replace(/Virgin|Australia|Qantas|Jetstar|Icelandair|Delta|United|Southwest|American|Airways|Airlines/gi, '').trim();
      const apt = findAirportByFuzzyCity(city, db) || findAirportFromText(city, db);
      if (apt && apt.iata !== destIata) originIata = apt.iata;
    }
  }

  // 5. Check description From / To
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

  // 6. Check location ONLY IF it explicitly refers to an airport
  // (Prevents street addresses, vacation spots like Port Douglas, or hotel locations from hijacking airports)
  if ((!originIata || !destIata) && loc && isExplicitAirportLocation(loc)) {
    const locApt = findAirportFromText(loc, db);
    if (locApt) {
      if (!originIata && destIata && locApt.iata !== destIata) originIata = locApt.iata;
      else if (!destIata && originIata && locApt.iata !== originIata) destIata = locApt.iata;
    }
  }

  // 7. If flight number is verified, look up route from known routes or previous logged flights
  if (flightNumber) {
    const cleanFn = flightNumber.toUpperCase().replace(/\s+/g, ' ');
    const knownRoute = KNOWN_FLIGHT_ROUTES[cleanFn];
    if (knownRoute) {
      if (!originIata && destIata === knownRoute.dest) originIata = knownRoute.origin;
      else if (!destIata && originIata === knownRoute.origin) destIata = knownRoute.dest;
      else if (!originIata && !destIata) {
        originIata = knownRoute.origin;
        destIata = knownRoute.dest;
      }
    }

    if (!originIata && destIata) {
      const prev = db.prepare('SELECT origin_iata FROM flights WHERE UPPER(flight_number) = ? AND dest_iata = ? LIMIT 1').get(cleanFn, destIata);
      if (prev) originIata = prev.origin_iata;
    }
  }

  // 8. If destination is known, check sequential itinerary continuity from previous logged flight
  if (!originIata && destIata && date) {
    try {
      const lastFlight = db.prepare(`
        SELECT dest_iata FROM flights
        WHERE date <= ? AND (user_email = ? OR user_email IS NULL)
        ORDER BY date DESC, id DESC
        LIMIT 1
      `).get(date, userEmail ? userEmail.toLowerCase() : null);

      if (lastFlight && lastFlight.dest_iata && lastFlight.dest_iata !== destIata) {
        originIata = lastFlight.dest_iata;
      }
    } catch (_) {}
  }

  // 9. If still missing origin and destination is not MCI, default domestic US flights on WN/UA/DL/AA to home base (MCI)
  if (!originIata && destIata && destIata !== 'MCI' && (airlineCode === 'WN' || airlineCode === 'UA' || airlineCode === 'DL' || airlineCode === 'AA')) {
    originIata = 'MCI';
  }

  if (originIata === 'RKV' && (airlineCode === 'FI' || airlineCode === 'OG' || destIata !== 'KEF')) originIata = 'KEF';
  if (destIata === 'RKV' && (airlineCode === 'FI' || airlineCode === 'OG' || originIata !== 'KEF')) destIata = 'KEF';

  if (!originIata || !destIata) return null;

  // Reject if NO airline identified AND NO flight number digits found
  if (!airlineCode && !flightNumber) {
    return null;
  }

  const orig = db.prepare('SELECT * FROM airports WHERE iata = ?').get(originIata);
  const dest = db.prepare('SELECT * FROM airports WHERE iata = ?').get(destIata);
  if (!orig || !dest || orig.iata === dest.iata) return null;

  // Distance calculation
  const R = 3958.8;
  const dLat = ((dest.lat - orig.lat) * Math.PI) / 180;
  const dLon = ((dest.lon - orig.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((orig.lat * Math.PI) / 180) *
      Math.cos((dest.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = Math.round(R * c);
  const km = Math.round(miles * 1.609344);

  // 10. Rigorous route plausibility check
  if (!validateRoutePlausibility(airlineCode, orig, dest, miles)) {
    return null;
  }

  if (!airlineName) airlineName = airlineCode ? (MAJOR_AIRLINE_CODES[airlineCode] || 'Commercial Flight') : 'Commercial Flight';
  if (!flightNumber) flightNumber = airlineCode ? `${airlineCode} ${orig.iata}-${dest.iata}` : `${orig.iata} - ${dest.iata}`;

  // Seat extraction
  let seat = '';
  const seatMatch = text.match(/\bSeat\s*:?\s*([0-9]{1,3}[A-Z])\b/i);
  if (seatMatch) seat = seatMatch[1].toUpperCase();

  // Duplicate check
  const existing = userEmail ? db.prepare(`
    SELECT id FROM flights
    WHERE date = ? AND origin_iata = ? AND dest_iata = ? AND user_email = ?
  `).get(date, orig.iata, dest.iata, userEmail.toLowerCase()) : null;

  return {
    rawSummary: summary,
    flight_number: flightNumber,
    airline: airlineName,
    airline_code: airlineCode,
    date,
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
    distance_miles: miles,
    distance_km: km,
    seat,
    aircraft: '',
    flight_class: 'Economy',
    alreadyLogged: !!existing
  };
}

module.exports = {
  parseICS,
  extractFlightFromEvent,
  findAirportByFuzzyCity,
  findAirportFromText,
  validateRoutePlausibility,
  isExplicitAirportLocation,
  CITY_ALIASES,
  IATA_STOPWORDS
};
