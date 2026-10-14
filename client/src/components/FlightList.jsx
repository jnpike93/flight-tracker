import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Crosshair, ArrowRight, Plane, Calendar, Tag, ChevronDown } from 'lucide-react';

export default function FlightList({ flights = [], selectedFlight, onSelectFlight, onDeleteFlight }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [airlineFilter, setAirlineFilter] = useState('all');

  // Available years
  const availableYears = useMemo(() => {
    const set = new Set();
    flights.forEach(f => {
      if (f.date) set.add(f.date.substring(0, 4));
    });
    return Array.from(set).sort().reverse();
  }, [flights]);

  // Available airlines
  const availableAirlines = useMemo(() => {
    const set = new Set();
    flights.forEach(f => {
      if (f.airline) set.add(f.airline);
    });
    return Array.from(set).sort();
  }, [flights]);

  // Filtered flights
  const filteredFlights = useMemo(() => {
    return flights.filter(f => {
      if (yearFilter !== 'all' && (!f.date || !f.date.startsWith(yearFilter))) {
        return false;
      }
      if (airlineFilter !== 'all' && f.airline !== airlineFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          f.flight_number?.toLowerCase().includes(term) ||
          f.airline?.toLowerCase().includes(term) ||
          f.origin_iata?.toLowerCase().includes(term) ||
          f.dest_iata?.toLowerCase().includes(term) ||
          f.origin_city?.toLowerCase().includes(term) ||
          f.dest_city?.toLowerCase().includes(term) ||
          f.aircraft?.toLowerCase().includes(term) ||
          f.notes?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [flights, searchTerm, yearFilter, airlineFilter]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col h-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <span>Flight Logbook</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-mono">
              {filteredFlights.length} {filteredFlights.length === 1 ? 'flight' : 'flights'}
            </span>
          </h3>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search flights, routes, airports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 py-2.5 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium mr-1">
          <Filter className="w-3 h-3" /> Filters:
        </div>

        {/* Year Filter */}
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-400"
        >
          <option value="all">All Years</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Airline Filter */}
        <select
          value={airlineFilter}
          onChange={(e) => setAirlineFilter(e.target.value)}
          className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-cyan-400 max-w-[150px] truncate"
        >
          <option value="all">All Airlines</option>
          {availableAirlines.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {(yearFilter !== 'all' || airlineFilter !== 'all' || searchTerm) && (
          <button
            onClick={() => {
              setYearFilter('all');
              setAirlineFilter('all');
              setSearchTerm('');
            }}
            className="text-[11px] text-cyan-400 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Flight Cards Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 max-h-[580px]">
        {filteredFlights.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <Plane className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
            <p>No flights found matching your criteria</p>
          </div>
        ) : (
          filteredFlights.map((f) => {
            const isSelected = selectedFlight && selectedFlight.id === f.id;

            return (
              <div
                key={f.id}
                onClick={() => onSelectFlight && onSelectFlight(f)}
                className={`p-3.5 rounded-xl border transition cursor-pointer relative group ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Top Row: Flight #, Airline, Date, Distance */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {f.flight_number}
                    </span>
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[140px]">
                      {f.airline}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {f.date}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 font-mono">
                      {(f.distance_miles || 0).toLocaleString()} mi
                    </span>
                  </div>
                </div>

                {/* Route Row: Origin ➔ Destination */}
                <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60 mb-2">
                  {/* Origin */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-white">{f.origin_iata}</span>
                    <span className="text-[11px] text-slate-400">({f.origin_city})</span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />

                  {/* Destination */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-white">{f.dest_iata}</span>
                    <span className="text-[11px] text-slate-400">({f.dest_city})</span>
                  </div>
                </div>

                {/* Bottom Row: Aircraft, Class, Notes & Action buttons */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    {f.aircraft && (
                      <span className="truncate max-w-[120px] text-slate-300">🛩️ {f.aircraft}</span>
                    )}
                    {f.flight_class && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {f.flight_class}
                      </span>
                    )}
                    {f.seat && (
                      <span className="font-mono text-cyan-400">Seat {f.seat}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectFlight) onSelectFlight(f);
                      }}
                      title="Focus Flight on 3D Globe"
                      className="p-1 rounded text-cyan-400 hover:bg-slate-800 transition"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete flight ${f.flight_number} (${f.origin_iata} ➔ ${f.dest_iata})?`)) {
                          onDeleteFlight(f.id);
                        }
                      }}
                      title="Delete Flight"
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notes banner if present */}
                {f.notes && (
                  <div className="mt-2 text-[10px] text-slate-400 italic bg-slate-950/40 px-2 py-1 rounded border-l-2 border-cyan-500/60 truncate">
                    "{f.notes}"
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

