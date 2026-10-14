import React, { useState, useMemo } from 'react';
import {
  X,
  Plane,
  Globe2,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart3,
  Calendar,
  Award,
  Activity,
  ArrowRight,
  Layers,
  Zap,
  Maximize2
} from 'lucide-react';

export default function StatDetailModal({
  isOpen,
  onClose,
  activeStat = 'distance', // 'distance' | 'flights' | 'planetary' | 'destinations' | 'milestones' | 'yearly' | 'seasonality'
  stats,
  flights = [],
  unit = 'miles'
}) {
  const [currentTab, setCurrentTab] = useState(activeStat);

  // Sync currentTab when activeStat changes
  React.useEffect(() => {
    if (activeStat) setCurrentTab(activeStat);
  }, [activeStat]);

  const unitAbbr = unit === 'miles' ? 'mi' : 'km';
  const totalDistance = stats ? (unit === 'miles' ? stats.totalMiles : stats.totalKm) : 0;

  // Format date
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

  // Relative time helper
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

  // Flight time helper
  const getFlightTime = (flight) => {
    if (!flight) return null;
    if (flight.date && flight.date.includes('T')) {
      const timePart = flight.date.split('T')[1]?.slice(0, 5);
      if (timePart) {
        try {
          const [hStr, mStr] = timePart.split(':');
          let h = parseInt(hStr, 10);
          const m = mStr || '00';
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          return `${h}:${m} ${ampm}`;
        } catch {
          return timePart;
        }
      }
    }
    if (flight.notes) {
      const m = flight.notes.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\s*(am|pm)?\b/i);
      if (m) return m[0].toUpperCase();
    }
    return null;
  };

  // Convert flight distance
  const getDist = (f) => (unit === 'miles' ? (f.distance_miles || 0) : (f.distance_km || 0));

  // 1. Haul category calculations
  const haulBreakdown = useMemo(() => {
    let shortCount = 0, shortDist = 0; // < 500 mi
    let medCount = 0, medDist = 0;     // 500 - 1500 mi
    let longCount = 0, longDist = 0;   // 1500 - 3000 mi
    let ultraCount = 0, ultraDist = 0; // > 3000 mi

    flights.forEach((f) => {
      const d = f.distance_miles || 0;
      const distInUnit = getDist(f);
      if (d < 500) {
        shortCount++;
        shortDist += distInUnit;
      } else if (d < 1500) {
        medCount++;
        medDist += distInUnit;
      } else if (d < 3000) {
        longCount++;
        longDist += distInUnit;
      } else {
        ultraCount++;
        ultraDist += distInUnit;
      }
    });

    const total = flights.length || 1;
    return [
      { label: 'Short-Haul (<500 mi)', count: shortCount, distance: shortDist, percent: Math.round((shortCount / total) * 100), color: 'from-cyan-500 to-blue-500', tag: 'Regional' },
      { label: 'Medium-Haul (500–1,500 mi)', count: medCount, distance: medDist, percent: Math.round((medCount / total) * 100), color: 'from-blue-500 to-indigo-500', tag: 'Continental' },
      { label: 'Long-Haul (1,500–3,000 mi)', count: longCount, distance: longDist, percent: Math.round((longCount / total) * 100), color: 'from-indigo-500 to-purple-500', tag: 'Cross-Country' },
      { label: 'Ultra Long-Haul (>3,000 mi)', count: ultraCount, distance: ultraDist, percent: Math.round((ultraCount / total) * 100), color: 'from-purple-500 to-pink-500', tag: 'Intercontinental' }
    ];
  }, [flights, unit]);

  // 2. Flight Duration spectrum bins
  const durationBreakdown = useMemo(() => {
    let under1 = 0, h1to2 = 0, h2to4 = 0, h4to6 = 0, over6 = 0;
    flights.forEach((f) => {
      const hrs = (f.distance_miles || 0) / 500;
      if (hrs < 1) under1++;
      else if (hrs < 2) h1to2++;
      else if (hrs < 4) h2to4++;
      else if (hrs < 6) h4to6++;
      else over6++;
    });
    const total = flights.length || 1;
    return [
      { label: '< 1 hour', count: under1, percent: Math.round((under1 / total) * 100) },
      { label: '1 – 2 hours', count: h1to2, percent: Math.round((h1to2 / total) * 100) },
      { label: '2 – 4 hours', count: h2to4, percent: Math.round((h2to4 / total) * 100) },
      { label: '4 – 6 hours', count: h4to6, percent: Math.round((h4to6 / total) * 100) },
      { label: '6+ hours', count: over6, percent: Math.round((over6 / total) * 100) }
    ];
  }, [flights]);

  // 3. Year-over-Year calculations
  const yearlyTrajectory = useMemo(() => {
    const list = stats ? (stats.yearlyBreakdown || []) : [];
    let cumulative = 0;
    return list.map((y, i) => {
      const prev = list[i - 1];
      const yoyGrowth = prev && prev.count > 0 ? Math.round(((y.count - prev.count) / prev.count) * 100) : 0;
      const miles = unit === 'miles' ? y.miles : y.km;
      cumulative += miles || 0;
      return {
        ...y,
        yoyGrowth,
        cumulative
      };
    });
  }, [stats?.yearlyBreakdown, unit]);

  const maxYearlyCumulative = useMemo(() => {
    if (!yearlyTrajectory.length) return 1;
    return yearlyTrajectory[yearlyTrajectory.length - 1].cumulative || 1;
  }, [yearlyTrajectory]);

  // 4. Sorted Flights by Distance for Spectrum
  const distanceSpectrum = useMemo(() => {
    return [...flights]
      .filter((f) => (f.distance_miles || 0) > 0)
      .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
  }, [flights]);

  const tabs = [
    { id: 'distance', label: 'Distance & Haul', icon: Compass },
    { id: 'flights', label: 'Flight Volume & Speed', icon: Plane },
    { id: 'planetary', label: 'Cosmic & Space Scale', icon: Globe2 },
    { id: 'destinations', label: 'Geography & Hubs', icon: MapPin },
    { id: 'milestones', label: 'Distance Spectrum', icon: Sparkles },
    { id: 'yearly', label: 'Annual Trajectory', icon: TrendingUp },
    { id: 'seasonality', label: 'Timing & Rhythm', icon: Activity }
  ];

  if (!isOpen || !stats) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25">
              <BarChart3 className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white m-0">Detailed Flight Analytics & Measurements</h3>
              <p className="text-xs text-slate-400 m-0">Expanded interactive graphs, breakdowns, and aviation metrics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* TAB 1: DISTANCE & HAUL SPECTRUM */}
          {currentTab === 'distance' && (
            <div className="space-y-6">
              {/* Distance Summary Hero */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Mileage</span>
                  <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                    {(totalDistance || 0).toLocaleString()} <span className="text-sm font-normal text-slate-300">{unitAbbr}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Logged across {stats.totalFlights} flights</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Average Flight Distance</span>
                  <div className="text-2xl font-black text-indigo-400 mt-1 font-mono">
                    {(unit === 'miles' ? stats.averageDistanceMiles : stats.averageDistanceKm || 0).toLocaleString()}{' '}
                    <span className="text-sm font-normal text-slate-300">{unitAbbr}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">~{stats.averageFlightHours} hours per flight leg</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">CO₂ Footprint Estimate</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                    ~{stats.carbonTons || 0} <span className="text-sm font-normal text-slate-300">metric tons</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Based on ICAO passenger emissions model</span>
                </div>
              </div>

              {/* Haul Category Distribution Graph */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white m-0">Flight Haul Length Distribution</h4>
                    <p className="text-xs text-slate-400 m-0">Categorized by commercial aviation distance thresholds</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{flights.length} total legs</span>
                </div>

                {/* Stacked Proportional Bar */}
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  {haulBreakdown.map((h, i) => (
                    <div
                      key={i}
                      className={`h-full bg-gradient-to-r ${h.color} transition-all duration-500`}
                      style={{ width: `${Math.max(h.percent, 0)}%` }}
                      title={`${h.label}: ${h.count} flights (${h.percent}%)`}
                    />
                  ))}
                </div>

                {/* Legend & Detail Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {haulBreakdown.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${h.color} shrink-0`} />
                        <div>
                          <div className="text-xs font-bold text-slate-200">{h.label}</div>
                          <span className="text-[10px] text-slate-500">{h.tag} • {(h.distance || 0).toLocaleString()} {unitAbbr}</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-white">{h.count}</span>
                        <span className="text-xs text-slate-400 ml-1">({h.percent}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cosmic Comparison Scale */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-white m-0">Planetary & Cosmic Scale Measurements</h4>
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Earth Equator Circumnavigations (24,901 mi each)</span>
                      <span className="font-mono font-bold text-teal-400">{stats.earthCircumnavigations}x completed</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                        style={{ width: `${Math.min((stats.earthCircumnavigations / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Journey to the Moon (238,855 mi total)</span>
                      <span className="font-mono font-bold text-indigo-400">{(stats.moonTrips * 100).toFixed(1)}% of the way</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full"
                        style={{ width: `${Math.min(stats.moonTrips * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLIGHT VOLUME & DURATION SPECTRUM */}
          {currentTab === 'flights' && (
            <div className="space-y-6">
              {/* Flight Time Duration Distribution */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white m-0">Flight Duration Breakdown</h4>
                    <p className="text-xs text-slate-400 m-0">How long you typically spend in the air per flight</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 font-bold">~{stats.estimatedHours} hrs total aloft</span>
                </div>

                <div className="space-y-3 pt-2">
                  {durationBreakdown.map((b, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{b.label}</span>
                        <div className="font-mono text-slate-400">
                          <span className="font-bold text-white">{b.count}</span> flights ({b.percent}%)
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(b.percent, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Airline Flight Count Distribution Chart */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white m-0">Airline Market Share & Preference</h4>
                    <p className="text-xs text-slate-400 m-0">Flights flown by carrier</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {(stats.allAirlines || []).length} airlines
                  </span>
                </div>

                <div className="space-y-2.5 pt-2">
                  {(stats.allAirlines || []).map((a, i) => {
                    const maxFlt = stats?.allAirlines?.[0]?.count || 1;
                    const percentOfMax = Math.round((a.count / maxFlt) * 100);

                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {a.airline_code && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800/40 text-[10px] font-mono font-bold text-cyan-300">
                                {a.airline_code}
                              </span>
                            )}
                            <span className="text-slate-200 font-medium">{a.airline}</span>
                          </div>
                          <div className="font-mono text-right text-xs">
                            <span className="font-bold text-white">{a.count}</span> flights
                            <span className="text-slate-500 text-[10px] ml-1.5">({a.percentage}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentOfMax, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLANETARY & SPACE SCALE */}
          {currentTab === 'planetary' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-white m-0">Cosmic Journey Progress Tracker</h4>
                  <p className="text-xs text-slate-400 m-0">Comparing your total flight distance against celestial distances</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Space Station */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Low Earth Orbit / ISS (254 mi altitude)</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {Math.round((stats.totalMiles || 0) / 254)}x
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Your total mileage is equivalent to flying straight up to the International Space Station {Math.round((stats.totalMiles || 0) / 254)} times!
                    </p>
                  </div>

                  {/* Earth Equator */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Earth Circumnavigations (24,901 mi)</span>
                      <span className="text-xs font-mono font-bold text-teal-400">
                        {stats.earthCircumnavigations} laps
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      You have circled the entire circumference of the globe nearly {Math.round(stats.earthCircumnavigations || 0)} full times!
                    </p>
                  </div>

                  {/* Earth Core */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Through Earth's Core (7,917 mi diameter)</span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {((stats.totalMiles || 0) / 7917).toFixed(1)}x
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Equivalent to drilling straight through the center of the Earth and out the other side {((stats.totalMiles || 0) / 7917).toFixed(1)} times.
                    </p>
                  </div>

                  {/* The Moon */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Earth to Moon (238,855 mi)</span>
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {stats.moonTrips} trips
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      You have covered {(stats.moonTrips * 100).toFixed(1)}% of the total distance between the Earth and the Moon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GEOGRAPHY & AIRPORT HUBS */}
          {currentTab === 'destinations' && (
            <div className="space-y-6">
              {/* Domestic vs International Ratio */}
              {stats.domesticVsInternational && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white m-0">Domestic vs. International Flight Split</h4>
                      <p className="text-xs text-slate-400 m-0">Based on flight country origins and destinations</p>
                    </div>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {stats.uniqueCountriesCount} countries visited
                    </span>
                  </div>

                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${stats.domesticVsInternational.domesticPercent}%` }}
                      title={`Domestic: ${stats.domesticVsInternational.domestic} flights`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${stats.domesticVsInternational.internationalPercent}%` }}
                      title={`International: ${stats.domesticVsInternational.international} flights`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <span className="text-xs font-bold text-slate-200">Domestic Flights</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-amber-300">
                        {stats.domesticVsInternational.domestic} ({stats.domesticVsInternational.domesticPercent}%)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-teal-400" />
                        <span className="text-xs font-bold text-slate-200">International Flights</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-teal-300">
                        {stats.domesticVsInternational.international} ({stats.domesticVsInternational.internationalPercent}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Airport Hubs Chart */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white m-0">Top Airport Hubs (Departures vs Arrivals)</h4>
                    <p className="text-xs text-slate-400 m-0">Your most frequent connection points</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    {(stats.allAirports || []).length} airports visited
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  {(stats.allAirports || []).slice(0, 8).map((apt, i) => {
                    const maxV = stats?.allAirports?.[0]?.visits || 1;
                    const percent = Math.round((apt.visits / maxV) * 100);

                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800/40 text-[10px] font-mono font-bold text-indigo-300">
                              {apt.iata}
                            </span>
                            <span className="text-slate-200 font-medium">{apt.city || apt.name}</span>
                          </div>
                          <div className="font-mono text-right text-xs">
                            <span className="font-bold text-white">{apt.visits}</span> visits
                            <span className="text-slate-500 text-[10px] ml-1.5">
                              ({apt.departures} dep / {apt.arrivals} arr)
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DISTANCE SPECTRUM CHART */}
          {currentTab === 'milestones' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white m-0">Flight Distance Spectrum</h4>
                    <p className="text-xs text-slate-400 m-0">Every flight arranged from shortest to longest leg</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    Range: {getDist(stats.shortestFlight)} – {getDist(stats.longestFlight)} {unitAbbr}
                  </span>
                </div>

                {/* Visual spectrum bars */}
                <div className="h-40 flex items-end gap-1 pt-6 pb-2 px-1 border-b border-slate-800 overflow-x-auto">
                  {distanceSpectrum.map((f, i) => {
                    const maxDist = getDist(stats.longestFlight) || 1;
                    const d = getDist(f);
                    const height = Math.max(Math.round((d / maxDist) * 100), 5);
                    const isLongest = f.id === stats.longestFlight?.id;
                    const isShortest = f.id === stats.shortestFlight?.id;

                    return (
                      <div
                        key={f.id || i}
                        className="flex-1 min-w-[5px] max-w-[14px] flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[10px] whitespace-nowrap flex flex-col items-center shadow-xl">
                          <span className="font-bold text-cyan-400">{f.origin_iata} → {f.dest_iata} ({d.toLocaleString()} {unitAbbr})</span>
                          <span className="text-slate-400">{f.airline} • {formatDate(f.date)}</span>
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isLongest
                              ? 'bg-gradient-to-t from-indigo-500 to-purple-400 shadow-md shadow-indigo-500/30'
                              : isShortest
                              ? 'bg-gradient-to-t from-purple-500 to-pink-400'
                              : 'bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-cyan-400 group-hover:to-white'
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Key Points: All 4 Landmarks at a glance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* First Logged Flight */}
                  {stats.earliestFlight && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase">First Logged Flight</span>
                          <span className="text-[10px] font-mono text-cyan-300 font-semibold">({formatRelativeTime(stats.earliestFlight.date)})</span>
                        </div>
                        <div className="font-mono font-bold text-sm text-white">
                          {stats.earliestFlight.origin_iata} → {stats.earliestFlight.dest_iata}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {stats.earliestFlight.airline} • {formatDate(stats.earliestFlight.date)}
                          {getFlightTime(stats.earliestFlight) ? ` • ${getFlightTime(stats.earliestFlight)}` : ''}
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-cyan-300">
                        {getDist(stats.earliestFlight).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                  )}

                  {/* Most Recent Flight */}
                  {stats.latestFlight && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">Most Recent Flight</span>
                          <span className="text-[10px] font-mono text-emerald-300 font-semibold">({formatRelativeTime(stats.latestFlight.date)})</span>
                        </div>
                        <div className="font-mono font-bold text-sm text-white">
                          {stats.latestFlight.origin_iata} → {stats.latestFlight.dest_iata}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {stats.latestFlight.airline} • {formatDate(stats.latestFlight.date)}
                          {getFlightTime(stats.latestFlight) ? ` • ${getFlightTime(stats.latestFlight)}` : ''}
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-300">
                        {getDist(stats.latestFlight).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                  )}

                  {/* Shortest Leg */}
                  {stats.shortestFlight && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-400 uppercase block">Shortest Leg</span>
                        <div className="font-mono font-bold text-sm text-white">
                          {stats.shortestFlight.origin_iata} → {stats.shortestFlight.dest_iata}
                        </div>
                        <span className="text-[11px] text-slate-400">{stats.shortestFlight.airline} • {formatDate(stats.shortestFlight.date)}</span>
                      </div>
                      <span className="font-mono text-base font-black text-purple-300">
                        {getDist(stats.shortestFlight).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                  )}

                  {/* Longest Leg */}
                  {stats.longestFlight && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase block">Longest Leg</span>
                        <div className="font-mono font-bold text-sm text-white">
                          {stats.longestFlight.origin_iata} → {stats.longestFlight.dest_iata}
                        </div>
                        <span className="text-[11px] text-slate-400">{stats.longestFlight.airline} • {formatDate(stats.longestFlight.date)}</span>
                      </div>
                      <span className="font-mono text-base font-black text-indigo-300">
                        {getDist(stats.longestFlight).toLocaleString()} {unitAbbr}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ANNUAL TRAJECTORY & YOY GROWTH */}
          {currentTab === 'yearly' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white m-0">Cumulative Mileage Growth Trajectory</h4>
                    <p className="text-xs text-slate-400 m-0">How your total lifetime flight mileage expanded year over year</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {(totalDistance || 0).toLocaleString()} {unitAbbr} total
                  </span>
                </div>

                {/* Cumulative Bar Curve */}
                <div className="h-44 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-800">
                  {yearlyTrajectory.map((y) => {
                    const heightPercent = Math.max(Math.round((y.cumulative / maxYearlyCumulative) * 100), 8);
                    return (
                      <div key={y.year} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none z-20 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[10px] whitespace-nowrap flex flex-col items-center shadow-xl">
                          <span className="font-bold text-cyan-400">{y.year}: +{(unit === 'miles' ? y.miles : y.km).toLocaleString()} {unitAbbr}</span>
                          <span className="text-slate-400">Total so far: {y.cumulative.toLocaleString()} {unitAbbr}</span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400 font-bold mb-1 opacity-80">
                          {Math.round(y.cumulative / 1000)}k
                        </span>

                        <div className="w-full max-w-[48px] bg-slate-800/60 rounded-t-lg overflow-hidden flex flex-col justify-end p-0.5">
                          <div
                            className="w-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-blue-400 rounded-t-md transition-all duration-500"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>

                        <span className="text-[10px] font-mono mt-2 font-medium text-slate-400">{y.year}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Year-over-Year Growth Table */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-300 block mb-2">Year-over-Year Activity Breakdown</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {yearlyTrajectory.map((y) => (
                      <div key={y.year} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold font-mono text-cyan-300">{y.year}</span>
                          <span className="font-mono text-[10px] text-slate-400">{y.count} flights</span>
                        </div>
                        <div className="font-mono text-slate-300 text-[11px]">
                          {(unit === 'miles' ? y.miles : y.km || 0).toLocaleString()} {unitAbbr}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: TIMING & RHYTHM */}
          {currentTab === 'seasonality' && (
            <div className="space-y-6">
              {/* Day of Week */}
              {stats.dayOfWeekDistribution && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white m-0">Weekly Travel Rhythm</h4>
                      <p className="text-xs text-slate-400 m-0">Flight frequencies mapped across days of the week</p>
                    </div>
                    {stats.favoriteDay && (
                      <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/40">
                        Favorite: {stats.favoriteDay}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-2 pt-2 text-center">
                    {stats.dayOfWeekDistribution.map((d) => (
                      <div key={d.day} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between h-24">
                        <span className="text-xs font-bold text-slate-400 font-mono">{d.day}</span>
                        <div className="text-xl font-extrabold text-white font-mono">{d.count}</div>
                        <span className="text-[10px] font-mono text-indigo-400 font-semibold">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Seasonality */}
              {stats.monthlySeasonality && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white m-0">Annual Seasonality (Months)</h4>
                      <p className="text-xs text-slate-400 m-0">Peak vs off-peak travel months throughout the year</p>
                    </div>
                    {stats.peakMonth && (
                      <span className="text-xs font-mono font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-950 border border-teal-800/40">
                        Peak: {stats.peakMonth}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                    {stats.monthlySeasonality.map((m) => {
                      const isPeak = m.month === stats.peakMonth;
                      return (
                        <div
                          key={m.month}
                          className={`p-3 rounded-xl border flex flex-col justify-between h-20 ${
                            isPeak
                              ? 'bg-teal-950/60 border-teal-600/80 shadow-md shadow-teal-500/20'
                              : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-mono font-bold ${isPeak ? 'text-teal-300' : 'text-slate-400'}`}>
                              {m.month}
                            </span>
                            {isPeak && <span className="text-[9px] font-bold text-teal-300">Peak</span>}
                          </div>
                          <div className="text-lg font-black text-white font-mono">{m.count}</div>
                          <span className="text-[10px] font-mono text-slate-400">{m.percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Click any tab above to explore full flight graphs and measurements.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

