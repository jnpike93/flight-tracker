import React, { useState, useMemo } from 'react';
import {
  Compass,
  X,
  Search,
  Plane,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Luggage,
  Sparkles
} from 'lucide-react';

export default function TripsViewModal({ isOpen, onClose, trips = [], unit = 'miles' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTripId, setExpandedTripId] = useState(null);

  const unitAbbr = unit === 'miles' ? 'mi' : 'km';

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

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.routeChain.some((apt) => apt.toLowerCase().includes(q)) ||
        (t.startDate && t.startDate.includes(q)) ||
        t.flights.some(
          (f) =>
            (f.airline && f.airline.toLowerCase().includes(q)) ||
            (f.flight_number && f.flight_number.toLowerCase().includes(q)) ||
            (f.dest_city && f.dest_city.toLowerCase().includes(q)) ||
            (f.origin_city && f.origin_city.toLowerCase().includes(q))
        )
      );
    });
  }, [trips, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Luggage className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white m-0">Auto-Grouped Trips & Itineraries</h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                  {trips.length} Total Trips
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">Individual flight legs clustered into complete travel journeys</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search trips, cities, airports, or airlines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Showing {filteredTrips.length} of {trips.length} trips
          </span>
        </div>

        {/* Trips List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredTrips.map((trip) => {
            const isExpanded = expandedTripId === trip.id;
            const dist = unit === 'miles' ? trip.totalMiles : trip.totalKm;

            return (
              <div
                key={trip.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-slate-700/80 transition-all overflow-hidden"
              >
                {/* Trip Card Header */}
                <div
                  onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-white m-0">{trip.title}</h4>
                      {trip.isRoundTrip ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-mono">
                          Roundtrip
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          One-Way
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        {formatDate(trip.startDate)} {trip.startDate !== trip.endDate && `→ ${formatDate(trip.endDate)}`}
                      </span>
                    </div>

                    {/* Route Chain */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {trip.routeChain.map((apt, i) => (
                        <React.Fragment key={i}>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono font-bold text-xs text-cyan-300">
                            {apt}
                          </span>
                          {i < trip.routeChain.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Summary Metric & Accordion Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right font-mono">
                      <div className="text-sm font-extrabold text-white">
                        {dist.toLocaleString()} <span className="text-xs text-slate-400">{unitAbbr}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {trip.legsCount} {trip.legsCount === 1 ? 'flight' : 'flights'}
                      </span>
                    </div>

                    <button
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Individual Flight Legs */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-900/50 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Individual Flight Legs in This Journey:
                    </span>
                    {trip.flights.map((f, i) => {
                      const legDist = unit === 'miles' ? f.distance_miles : f.distance_km;
                      return (
                        <div
                          key={f.id || i}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 text-center font-mono text-slate-500 text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                              <span className="text-cyan-300">{f.origin_iata}</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-cyan-300">{f.dest_iata}</span>
                            </div>
                            <span className="text-slate-400 truncate hidden sm:inline">
                              {f.airline} {f.flight_number}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-right">
                            <span className="text-slate-400 text-[11px]">{formatDate(f.date)}</span>
                            <span className="font-bold text-white">
                              {(legDist || 0).toLocaleString()} {unitAbbr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredTrips.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No trips matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Trips are automatically grouped by calendar dates, connection layovers, and return hubs.
          </span>
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

