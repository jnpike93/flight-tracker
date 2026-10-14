import React, { useState, useMemo } from 'react';
import {
  Plane,
  Globe2,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Calendar,
  CalendarDays,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
  Award,
  Activity,
  History,
  Camera,
  Maximize2,
  Building2,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import TopStatsSnapshotModal from './TopStatsSnapshotModal';
import StatDetailModal from './StatDetailModal';

export default function StatsCards({
  stats,
  flights = [],
  currentUser,
  forceShowDetails = false,
  isAnalyticsView = false
}) {
  const [unit, setUnit] = useState('miles'); // 'miles' | 'km'
  const [showDetailedStats, setShowDetailedStats] = useState(isAnalyticsView || forceShowDetails);
  const [activeRosterTab, setActiveRosterTab] = useState('airlines'); // 'airlines' | 'airports' | 'trends' | 'milestones' | 'patterns'
  const [airlineSearch, setAirlineSearch] = useState('');
  const [airportSearch, setAirportSearch] = useState('');
  const [airlineSort, setAirlineSort] = useState('count'); // 'count' | 'distance'
  const [airportSort, setAirportSort] = useState('visits'); // 'visits' | 'city'
  const [yearlyMetric, setYearlyMetric] = useState('count'); // 'count' | 'distance'
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeDetailStat, setActiveDetailStat] = useState('distance');

  const totalDistance = stats ? (unit === 'miles' ? stats.totalMiles : stats.totalKm) : 0;
  const unitLabel = unit === 'miles' ? 'miles' : 'km';
  const unitAbbr = unit === 'miles' ? 'mi' : 'km';

  const handleOpenDetail = (statKey) => {
    setActiveDetailStat(statKey);
    setIsDetailModalOpen(true);
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Relative time helper (e.g. "9.2 years ago", "9 days ago")
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'Upcoming';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.round(diffDays / 30)} mos ago`;
        return `${(diffDays / 365.25).toFixed(1)} yrs ago`;
      }
      return '';
    } catch {
      return '';
    }
  };

  // Format 24h to 12h time
  const formatTimeStr = (time24) => {
    try {
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr || '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    } catch {
      return time24;
    }
  };

  // Flight departure time extractor
  const getFlightTime = (flight) => {
    if (!flight) return null;
    if (flight.date && flight.date.includes('T')) {
      const timePart = flight.date.split('T')[1]?.slice(0, 5);
      if (timePart) return formatTimeStr(timePart);
    }
    if (flight.notes) {
      const m = flight.notes.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\s*(am|pm)?\b/i);
      if (m) return m[0].toUpperCase();
    }
    return null;
  };

  // Convert distance helper for a flight
  const getFlightDist = (flight) => {
    if (!flight) return 0;
    return unit === 'miles' ? (flight.distance_miles || 0) : (flight.distance_km || 0);
  };

  // Filtered & Sorted Airlines
  const allAirlines = stats ? (stats.allAirlines || stats.topAirlines || []) : [];
  const filteredAirlines = useMemo(() => {
    return allAirlines
      .filter((a) => {
        if (!airlineSearch) return true;
        const q = airlineSearch.toLowerCase();
        return (
          (a.airline && a.airline.toLowerCase().includes(q)) ||
          (a.airline_code && a.airline_code.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (airlineSort === 'distance') {
          const distA = unit === 'miles' ? a.total_miles : a.total_km;
          const distB = unit === 'miles' ? b.total_miles : b.total_km;
          return (distB || 0) - (distA || 0);
        }
        return (b.count || 0) - (a.count || 0);
      });
  }, [allAirlines, airlineSearch, airlineSort, unit]);

  // Filtered & Sorted Airports
  const allAirports = stats ? (stats.allAirports || stats.topAirports || []) : [];
  const filteredAirports = useMemo(() => {
    return allAirports
      .filter((apt) => {
        if (!airportSearch) return true;
        const q = airportSearch.toLowerCase();
        return (
          (apt.iata && apt.iata.toLowerCase().includes(q)) ||
          (apt.city && apt.city.toLowerCase().includes(q)) ||
          (apt.country && apt.country.toLowerCase().includes(q)) ||
          (apt.name && apt.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (airportSort === 'city') {
          return (a.city || '').localeCompare(b.city || '');
        }
        return (b.visits || 0) - (a.visits || 0);
      });
  }, [allAirports, airportSearch, airportSort]);

  // Yearly data calculation
  const yearlyData = stats ? (stats.yearlyBreakdown || []) : [];
  const maxYearlyValue = useMemo(() => {
    if (!yearlyData.length) return 1;
    return Math.max(
      ...yearlyData.map((y) => (yearlyMetric === 'count' ? y.count : (unit === 'miles' ? y.miles : y.km) || 0)),
      1
    );
  }, [yearlyData, yearlyMetric, unit]);

  const maxAirportVisits = useMemo(() => {
    if (!allAirports.length) return 1;
    return Math.max(...allAirports.map((a) => a.visits || 0), 1);
  }, [allAirports]);

  const maxAirlineFlights = useMemo(() => {
    if (!allAirlines.length) return 1;
    return Math.max(...allAirlines.map((a) => a.count || 0), 1);
  }, [allAirlines]);

  // Top home hub for quick context
  const topHub = allAirports.length > 0 ? allAirports[0] : null;

  // Whether detailed section should be visible
  const isDetailsOpen = isAnalyticsView || showDetailedStats;

  if (!stats) return null;

  return (
    <div className="space-y-3">
      {/* 1. Primary Usable-At-A-Glance KPI Bar */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 shadow-xl">
        {/* Top 4 Core Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-stretch">
          {/* Total Distance */}
          <div
            onClick={() => handleOpenDetail('distance')}
            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/60 transition cursor-pointer group flex flex-col justify-between"
            title="Click to open interactive distance and haul distribution chart"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Distance</span>
                <Maximize2 className="w-2.5 h-2.5 text-cyan-400/60 group-hover:text-cyan-400 transition" />
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUnit(unit === 'miles' ? 'km' : 'miles');
                }}
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 transition"
                title="Toggle Miles / Kilometers"
              >
                {unit === 'miles' ? 'MI' : 'KM'}
              </button>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {(totalDistance || 0).toLocaleString()}
              <span className="text-xs text-cyan-400 font-medium ml-1">{unitAbbr}</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>~{stats.estimatedHours} hrs aloft</span>
              <span className="text-cyan-400 font-semibold group-hover:underline">Explore →</span>
            </div>
          </div>

          {/* Total Flights */}
          <div
            onClick={() => handleOpenDetail('flights')}
            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/60 transition cursor-pointer group flex flex-col justify-between"
            title="Click to open flight duration and speed metrics"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Flights Logged</span>
                <Maximize2 className="w-2.5 h-2.5 text-blue-400/60 group-hover:text-blue-400 transition" />
              </span>
              <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                <Plane className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {stats.totalFlights || 0}
              <span className="text-xs text-blue-400 font-medium ml-1">flights</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>
                {stats.domesticVsInternational ? `${stats.domesticVsInternational.domestic} Dom • ${stats.domesticVsInternational.international} Intl` : `${allAirlines.length} airlines`}
              </span>
              <span className="text-blue-400 font-semibold group-hover:underline">Explore →</span>
            </div>
          </div>

          {/* Planetary Scale */}
          <div
            onClick={() => handleOpenDetail('planetary')}
            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-teal-500/60 transition cursor-pointer group flex flex-col justify-between"
            title="Click to view cosmic and planetary scale"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Planetary Scale</span>
                <Maximize2 className="w-2.5 h-2.5 text-teal-400/60 group-hover:text-teal-400 transition" />
              </span>
              <div className="p-1 rounded bg-teal-500/10 text-teal-400">
                <Globe2 className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {stats.earthCircumnavigations || 0}x
              <span className="text-xs text-teal-400 font-medium ml-1">Earth</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>
                {stats.moonTrips > 0 ? `${(stats.moonTrips * 100).toFixed(1)}% to Moon` : 'Equator laps'}
              </span>
              <span className="text-teal-400 font-semibold group-hover:underline">Explore →</span>
            </div>
          </div>

          {/* Destinations */}
          <div
            onClick={() => handleOpenDetail('destinations')}
            className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 transition cursor-pointer group flex flex-col justify-between"
            title="Click to view airport hubs and connections chart"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Destinations</span>
                <Maximize2 className="w-2.5 h-2.5 text-amber-400/60 group-hover:text-amber-400 transition" />
              </span>
              <div className="p-1 rounded bg-amber-500/10 text-amber-400">
                <MapPin className="w-3 h-3" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {stats.uniqueAirportsCount || allAirports.length}
              <span className="text-xs text-amber-400 font-medium ml-1">airports</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>
                {topHub ? `Top: ${topHub.iata} (${topHub.visits}x)` : `${stats.uniqueCountriesCount || 1} countries`}
              </span>
              <span className="text-amber-400 font-semibold group-hover:underline">Explore →</span>
            </div>
          </div>
        </div>

        {/* 2. Landmark Flight Milestones (Swipeable on mobile, grid on tablet/desktop) */}
        {(stats.earliestFlight || stats.latestFlight || stats.longestFlight || stats.shortestFlight) && (
          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-2.5 border-t border-slate-800/80 mt-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none snap-x">
            {/* First Flight Logged */}
            {stats.earliestFlight && (
              <div
                onClick={() => handleOpenDetail('milestones')}
                className="min-w-[240px] sm:min-w-0 snap-start flex-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer group flex flex-col justify-between"
                title="Click to view flight distance spectrum chart"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <History className="w-3 h-3 text-cyan-400" />
                      First Logged Flight
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 font-semibold">
                      {formatRelativeTime(stats.earliestFlight.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 my-1 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.earliestFlight.origin_iata}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.earliestFlight.dest_iata}
                    </span>
                    <span className="text-slate-400 text-[10px] truncate min-w-0 ml-1">
                      {stats.earliestFlight.origin_city} → {stats.earliestFlight.dest_city}
                    </span>
                  </div>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate pr-1">
                    {formatDate(stats.earliestFlight.date)}
                    {getFlightTime(stats.earliestFlight) ? ` • ${getFlightTime(stats.earliestFlight)}` : ''}
                  </span>
                  <span className="font-mono text-slate-300 shrink-0">
                    {getFlightDist(stats.earliestFlight).toLocaleString()} {unitAbbr}
                  </span>
                </div>
              </div>
            )}

            {/* Most Recent Flight */}
            {stats.latestFlight && (
              <div
                onClick={() => handleOpenDetail('milestones')}
                className="min-w-[240px] sm:min-w-0 snap-start flex-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group flex flex-col justify-between"
                title="Click to view flight distance spectrum chart"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      Most Recent Flight
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-semibold">
                      {formatRelativeTime(stats.latestFlight.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 my-1 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.latestFlight.origin_iata}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.latestFlight.dest_iata}
                    </span>
                    <span className="text-slate-400 text-[10px] truncate min-w-0 ml-1">
                      {stats.latestFlight.origin_city} → {stats.latestFlight.dest_city}
                    </span>
                  </div>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate pr-1">
                    {formatDate(stats.latestFlight.date)}
                    {getFlightTime(stats.latestFlight) ? ` • ${getFlightTime(stats.latestFlight)}` : ''}
                  </span>
                  <span className="font-mono text-slate-300 shrink-0">
                    {getFlightDist(stats.latestFlight).toLocaleString()} {unitAbbr}
                  </span>
                </div>
              </div>
            )}

            {/* Longest Flight */}
            {stats.longestFlight && (
              <div
                onClick={() => handleOpenDetail('milestones')}
                className="min-w-[240px] sm:min-w-0 snap-start flex-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group flex flex-col justify-between"
                title="Click to view flight distance spectrum chart"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Compass className="w-3 h-3 text-amber-400" />
                      Longest Flight
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 font-bold">
                      {getFlightDist(stats.longestFlight).toLocaleString()} {unitAbbr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 my-1 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.longestFlight.origin_iata}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.longestFlight.dest_iata}
                    </span>
                    <span className="text-slate-400 text-[10px] truncate min-w-0 ml-1">
                      {stats.longestFlight.origin_city} → {stats.longestFlight.dest_city}
                    </span>
                  </div>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate pr-1">{stats.longestFlight.airline}</span>
                  <span className="text-slate-500 shrink-0">{formatDate(stats.longestFlight.date)}</span>
                </div>
              </div>
            )}

            {/* Shortest Flight */}
            {stats.shortestFlight && (
              <div
                onClick={() => handleOpenDetail('milestones')}
                className="min-w-[240px] sm:min-w-0 snap-start flex-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/50 transition cursor-pointer group flex flex-col justify-between"
                title="Click to view flight distance spectrum chart"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Plane className="w-3 h-3 text-purple-400" />
                      Shortest Flight
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">
                      {getFlightDist(stats.shortestFlight).toLocaleString()} {unitAbbr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 my-1 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.shortestFlight.origin_iata}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono font-bold text-[10px] shrink-0">
                      {stats.shortestFlight.dest_iata}
                    </span>
                    <span className="text-slate-400 text-[10px] truncate min-w-0 ml-1">
                      {stats.shortestFlight.origin_city} → {stats.shortestFlight.dest_city}
                    </span>
                  </div>
                </div>
                <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate pr-1">{stats.shortestFlight.airline}</span>
                  <span className="text-slate-500 shrink-0">{formatDate(stats.shortestFlight.date)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Ticker: Top 5 Snapshot & Detailed Rosters Toggle */}
        {!isAnalyticsView && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                Spanning {stats.timeSpan?.totalYears || 1} years of flights ({stats.timeSpan?.totalDays || 0} days)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy Top 5 Snapshot */}
              <button
                onClick={() => setIsSnapshotModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition active:scale-95"
                title="Create a compact Retina graphic of your top 5 stats and copy to clipboard"
              >
                <Camera className="w-3 h-3 text-cyan-400" />
                <span>Copy Top 5 Snapshot</span>
              </button>

              {/* Show / Hide Detailed Rosters */}
              <button
                onClick={() => setShowDetailedStats(!showDetailedStats)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
              >
                <BarChart3 className="w-3 h-3 text-cyan-400" />
                <span>{showDetailedStats ? 'Hide Rosters' : 'Explore Rosters & Trends'}</span>
                {showDetailedStats ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Organized Tabbed Rosters & Analytics Hub (Focused, Uncluttered Interface) */}
      {isDetailsOpen && (
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-2xl space-y-4">
          {/* Hub Tab Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
              <button
                onClick={() => setActiveRosterTab('airlines')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeRosterTab === 'airlines'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Airlines</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeRosterTab === 'airlines' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {allAirlines.length}
                </span>
              </button>

              <button
                onClick={() => setActiveRosterTab('airports')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeRosterTab === 'airports'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Airports & Hubs</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeRosterTab === 'airports' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {allAirports.length}
                </span>
              </button>

              <button
                onClick={() => setActiveRosterTab('trends')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeRosterTab === 'trends'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Annual Trends</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${activeRosterTab === 'trends' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {yearlyData.length}y
                </span>
              </button>

              <button
                onClick={() => setActiveRosterTab('milestones')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeRosterTab === 'milestones'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Milestones & Routes</span>
              </button>

              <button
                onClick={() => setActiveRosterTab('patterns')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  activeRosterTab === 'patterns'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Travel Patterns</span>
              </button>
            </div>

            {/* Quick Snapshot CTA in Header */}
            <button
              onClick={() => setIsSnapshotModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copy Top 5 Snapshot</span>
            </button>
          </div>

          {/* TAB 1: Airlines Flown */}
          {activeRosterTab === 'airlines' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search airlines or code (e.g. DL, United, Virgin)..."
                    value={airlineSearch}
                    onChange={(e) => setAirlineSearch(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAirlineSort(airlineSort === 'count' ? 'distance' : 'count')}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                    <span>Sort: {airlineSort === 'count' ? 'By Flights' : 'By Distance'}</span>
                  </button>
                  <button
                    onClick={() => handleOpenDetail('flights')}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-cyan-400 transition"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Deep Chart</span>
                  </button>
                </div>
              </div>

              {/* Airlines List */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredAirlines.map((a, i) => {
                    const dist = unit === 'miles' ? a.total_miles : a.total_km;
                    const percentOfTop = Math.round(((a.count || 0) / maxAirlineFlights) * 100);

                    return (
                      <div
                        key={a.airline || i}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                            {a.airline_code ? (
                              <span className="w-9 shrink-0 text-center py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-800/40">
                                {a.airline_code}
                              </span>
                            ) : (
                              <span className="w-9 shrink-0 text-center font-mono text-slate-500 text-[10px]">
                                #{i + 1}
                              </span>
                            )}
                            <span className="text-slate-200 font-medium text-xs truncate">{a.airline}</span>
                          </div>
                          <div className="text-right whitespace-nowrap shrink-0">
                            <span className="font-bold text-cyan-400 font-mono text-xs">{a.count}</span>
                            <span className="text-slate-400 font-mono text-[11px] ml-1">
                              {a.count === 1 ? 'flight' : 'flights'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Mileage */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentOfTop, 5)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                            {(dist || 0).toLocaleString()} {unitAbbr} ({a.percentage || 0}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredAirlines.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No airlines found matching "{airlineSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Airports & Hubs */}
          {activeRosterTab === 'airports' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search airports, cities, or IATA (e.g. ORD, Austin, AKL)..."
                    value={airportSearch}
                    onChange={(e) => setAirportSearch(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAirportSort(airportSort === 'visits' ? 'city' : 'visits')}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                    <span>Sort: {airportSort === 'visits' ? 'By Visits' : 'By City'}</span>
                  </button>
                  <button
                    onClick={() => handleOpenDetail('destinations')}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-cyan-400 transition"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Hubs Chart</span>
                  </button>
                </div>
              </div>

              {/* Airports List */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredAirports.map((apt, i) => {
                    const percentOfTop = Math.round(((apt.visits || 0) / maxAirportVisits) * 100);

                    return (
                      <div
                        key={apt.iata || i}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                            <span className="w-10 shrink-0 text-center py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-800/40">
                              {apt.iata}
                            </span>
                            <span className="text-slate-200 font-medium text-xs truncate">
                              {apt.city || apt.name}
                            </span>
                            {apt.country && apt.country !== 'United States' && (
                              <span className="text-[10px] text-slate-500 truncate shrink-0">({apt.country})</span>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap shrink-0">
                            <span className="font-bold text-indigo-400 font-mono text-xs">{apt.visits}</span>
                            <span className="text-slate-400 font-mono text-[11px] ml-1">
                              {apt.visits === 1 ? 'visit' : 'visits'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Breakdown */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(percentOfTop, 5)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                            {apt.departures || 0} dep • {apt.arrivals || 0} arr ({apt.percentage || 0}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredAirports.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No airports found matching "{airportSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Annual History & Trends */}
          {activeRosterTab === 'trends' && yearlyData.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    Flight frequency and mileage logged per calendar year
                  </span>
                  {stats.busiestYear && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/50 text-[10px] font-mono text-amber-300 font-bold flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" />
                      Peak Year: {stats.busiestYear.year} ({stats.busiestYear.count} flights)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setYearlyMetric('count')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        yearlyMetric === 'count'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Flights
                    </button>
                    <button
                      onClick={() => setYearlyMetric('distance')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        yearlyMetric === 'distance'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Distance ({unitAbbr})
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenDetail('yearly')}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-cyan-400 transition"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Cumulative Trajectory</span>
                  </button>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-52 flex items-end gap-2 sm:gap-4 pt-8 pb-3 px-2 border-b border-slate-800/80 overflow-visible">
                {yearlyData.map((y) => {
                  const val = yearlyMetric === 'count' ? y.count : (unit === 'miles' ? y.miles : y.km) || 0;
                  const heightPercent = Math.max(Math.round((val / maxYearlyValue) * 100), 8);
                  const isPeak = stats.busiestYear && stats.busiestYear.year === y.year;

                  return (
                    <div
                      key={y.year}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      onClick={() => handleOpenDetail('yearly')}
                      title="Click to view annual trajectory"
                    >
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 shadow-xl text-[10px] text-slate-200 whitespace-nowrap flex flex-col items-center">
                        <span className="font-bold text-cyan-400">{y.year}: {y.count} flights</span>
                        <span className="text-slate-400 font-mono">
                          {unit === 'miles' ? (y.miles || 0).toLocaleString() : (y.km || 0).toLocaleString()} {unitAbbr} ({y.percentage}%)
                        </span>
                      </div>

                      {/* Bar Value Label */}
                      <span className="text-[10px] font-mono text-slate-400 font-bold mb-1 opacity-80 group-hover:opacity-100 group-hover:text-cyan-400 transition">
                        {yearlyMetric === 'count' ? y.count : `${Math.round(val / 1000)}k`}
                      </span>

                      {/* Bar Container */}
                      <div className="w-full max-w-[54px] bg-slate-800/60 rounded-t-lg overflow-hidden flex flex-col justify-end p-0.5">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            isPeak
                              ? 'bg-gradient-to-t from-cyan-600 via-cyan-400 to-amber-300 shadow-md shadow-cyan-500/20'
                              : 'bg-gradient-to-t from-cyan-600/70 to-cyan-400/90 group-hover:from-cyan-500 group-hover:to-cyan-300'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* Year Label */}
                      <div className="h-6 flex items-center justify-center">
                        <span className={`text-[10px] font-mono font-medium ${isPeak ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {y.year}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Milestones & Top Routes */}
          {activeRosterTab === 'milestones' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-stretch">
                {/* First Logged Flight */}
                {stats.earliestFlight && (
                  <div
                    onClick={() => handleOpenDetail('milestones')}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/60 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <History className="w-3 h-3 text-cyan-400" />
                          First Logged Flight
                        </span>
                        <span className="text-[11px] font-mono text-cyan-300 font-medium">
                          {formatRelativeTime(stats.earliestFlight.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 my-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.earliestFlight.origin_iata}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.earliestFlight.dest_iata}
                        </span>
                        <span className="text-slate-400 text-[11px] truncate min-w-0 ml-1">
                          {stats.earliestFlight.origin_city} → {stats.earliestFlight.dest_city}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate pr-1">
                        {stats.earliestFlight.airline} {stats.earliestFlight.flight_number}
                        {getFlightTime(stats.earliestFlight) ? ` • ${getFlightTime(stats.earliestFlight)}` : ''}
                      </span>
                      <span className="font-mono text-slate-300 shrink-0">
                        {getFlightDist(stats.earliestFlight).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                  </div>
                )}

                {/* Most Recent Flight */}
                {stats.latestFlight && (
                  <div
                    onClick={() => handleOpenDetail('milestones')}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/60 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          Most Recent Flight
                        </span>
                        <span className="text-[11px] font-mono text-emerald-300 font-medium">
                          {formatRelativeTime(stats.latestFlight.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 my-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.latestFlight.origin_iata}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.latestFlight.dest_iata}
                        </span>
                        <span className="text-slate-400 text-[11px] truncate min-w-0 ml-1">
                          {stats.latestFlight.origin_city} → {stats.latestFlight.dest_city}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate pr-1">
                        {stats.latestFlight.airline} {stats.latestFlight.flight_number}
                        {getFlightTime(stats.latestFlight) ? ` • ${getFlightTime(stats.latestFlight)}` : ''}
                      </span>
                      <span className="font-mono text-slate-300 shrink-0">
                        {getFlightDist(stats.latestFlight).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                  </div>
                )}

                {/* Longest Flight */}
                {stats.longestFlight && (
                  <div
                    onClick={() => handleOpenDetail('milestones')}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <Compass className="w-3 h-3 text-amber-400" />
                          Longest Flight
                        </span>
                        <span className="text-[11px] font-mono text-amber-300 font-bold">
                          {getFlightDist(stats.longestFlight).toLocaleString()} {unitAbbr}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 my-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.longestFlight.origin_iata}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.longestFlight.dest_iata}
                        </span>
                        <span className="text-slate-400 text-[11px] truncate min-w-0 ml-1">
                          {stats.longestFlight.origin_city} → {stats.longestFlight.dest_city}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate pr-1">{stats.longestFlight.airline}</span>
                      <span className="text-slate-500 shrink-0">{formatDate(stats.longestFlight.date)}</span>
                    </div>
                  </div>
                )}

                {/* Shortest Flight */}
                {stats.shortestFlight && (
                  <div
                    onClick={() => handleOpenDetail('milestones')}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/60 transition cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-purple-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <Plane className="w-3 h-3 text-purple-400" />
                          Shortest Flight
                        </span>
                        <span className="text-[11px] font-mono text-purple-300 font-bold">
                          {getFlightDist(stats.shortestFlight).toLocaleString()} {unitAbbr}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 my-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.shortestFlight.origin_iata}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono font-bold text-[11px] shrink-0">
                          {stats.shortestFlight.dest_iata}
                        </span>
                        <span className="text-slate-400 text-[11px] truncate min-w-0 ml-1">
                          {stats.shortestFlight.origin_city} → {stats.shortestFlight.dest_city}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate pr-1">{stats.shortestFlight.airline}</span>
                      <span className="text-slate-500 shrink-0">{formatDate(stats.shortestFlight.date)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Frequented Routes */}
              {stats.topRoutes && stats.topRoutes.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      Top Frequented Route Corridors
                    </span>
                    <button
                      onClick={() => handleOpenDetail('destinations')}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>Explore all connections</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {stats.topRoutes.slice(0, 4).map((r, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                          <span className="text-amber-300">{r.apt1}</span>
                          <span className="text-slate-500">⇄</span>
                          <span className="text-amber-300">{r.apt2}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-white">{r.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Travel Patterns & Sky Residence */}
          {activeRosterTab === 'patterns' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs items-stretch">
              {/* Day of Week */}
              {stats.dayOfWeekDistribution && (
                <div
                  onClick={() => handleOpenDetail('seasonality')}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                        Day of Week Rhythm
                      </span>
                      <Maximize2 className="w-3 h-3 text-indigo-400/60 group-hover:text-indigo-400 transition" />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {stats.dayOfWeekDistribution.map((d) => (
                        <div key={d.day} className="flex items-center gap-2">
                          <span className="w-7 text-[10px] font-mono text-slate-400">{d.day}</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                d.day === stats.favoriteDay ? 'bg-indigo-400' : 'bg-slate-600'
                              }`}
                              style={{ width: `${Math.max(d.percentage * 2.5, 3)}%` }}
                            />
                          </div>
                          <span className="w-6 text-right font-mono text-[10px] text-slate-400">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Seasonality */}
              {stats.monthlySeasonality && (
                <div
                  onClick={() => handleOpenDetail('seasonality')}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-teal-500/60 transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-teal-400" />
                        Monthly Seasonality
                      </span>
                      <Maximize2 className="w-3 h-3 text-teal-400/60 group-hover:text-teal-400 transition" />
                    </div>
                    <div className="grid grid-cols-12 gap-1 items-end h-28 pt-2 border-b border-slate-800/60 pb-1">
                      {stats.monthlySeasonality.map((m) => {
                        const isPeak = m.month === stats.peakMonth;
                        return (
                          <div key={m.month} className="flex flex-col items-center justify-end h-full group relative">
                            <div
                              className={`w-full rounded-t-sm transition-all duration-300 ${
                                isPeak ? 'bg-teal-400 shadow-sm shadow-teal-500/30' : 'bg-teal-700/70 group-hover:bg-teal-500'
                              }`}
                              style={{ height: `${Math.max(m.percentage * 2.8, 8)}%` }}
                              title={`${m.month}: ${m.count} flights (${m.percentage}%)`}
                            />
                            <span className={`text-[9px] font-mono mt-1 ${isPeak ? 'text-teal-300 font-bold' : 'text-slate-500'}`}>
                              {m.month.slice(0, 1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono text-center pt-2">
                    Peak Month: {stats.peakMonth || 'N/A'}
                  </div>
                </div>
              )}

              {/* Sky Residence */}
              <div
                onClick={() => handleOpenDetail('distance')}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/60 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      Sky Residence & Aloft Time
                    </span>
                    <Maximize2 className="w-3 h-3 text-purple-400/60 group-hover:text-purple-400 transition" />
                  </div>
                  <div className="space-y-2 pt-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total Aloft Time</span>
                      <span className="font-mono font-bold text-purple-300">
                        {stats.totalDaysAloft ? `${stats.totalDaysAloft} continuous days` : `~${stats.estimatedHours} hrs`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Average Flight Time</span>
                      <span className="font-mono text-slate-200">
                        ~{stats.averageFlightHours || '1.8'} hrs
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Average Leg Distance</span>
                      <span className="font-mono text-slate-200">
                        {unit === 'miles' ? (stats.averageDistanceMiles || 0).toLocaleString() : (stats.averageDistanceKm || 0).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                    {stats.cabinBreakdown && stats.cabinBreakdown.length > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400">Preferred Class</span>
                        <span className="font-mono text-cyan-400">
                          {stats.cabinBreakdown[0].flight_class || 'Economy'} ({stats.cabinBreakdown[0].count})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snapshot Modal */}
      {isSnapshotModalOpen && (
        <TopStatsSnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
          stats={stats}
          currentUser={currentUser}
          unit={unit}
        />
      )}

      {/* Interactive Graph & Measurement Detail Modal */}
      {isDetailModalOpen && stats && (
        <StatDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          activeStat={activeDetailStat}
          stats={stats}
          flights={flights}
          unit={unit}
        />
      )}
    </div>
  );
}
