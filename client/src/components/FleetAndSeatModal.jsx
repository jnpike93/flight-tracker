import React from 'react';
import {
  Plane,
  X,
  Layers,
  Sparkles,
  PieChart,
  BarChart3,
  Armchair,
  Award
} from 'lucide-react';

export default function FleetAndSeatModal({
  isOpen,
  onClose,
  fleetStats
}) {
  if (!isOpen || !fleetStats) return null;

  const { manufacturers = [], bodyTypes = [], topModels = [], seats = {} } = fleetStats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Plane className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white m-0">Aircraft Fleet & Seat Intelligence</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-xs font-bold border border-blue-500/30">
                  AvGeek Specs
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">Breakdown of aircraft manufacturers, airframe types, and seating positions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
          {/* 1. Manufacturer Loyalty */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white m-0">Aircraft Manufacturer Loyalty</h4>
                <p className="text-xs text-slate-400 m-0">Boeing vs. Airbus vs. Embraer vs. Bombardier distribution</p>
              </div>
              <span className="text-xs font-mono text-blue-400 font-bold">{manufacturers.length} manufacturers</span>
            </div>

            {/* Proportional Bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {manufacturers.map((m, i) => {
                const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-cyan-400', 'bg-teal-400'];
                return (
                  <div
                    key={m.brand}
                    className={`h-full ${colors[i % colors.length]} transition-all duration-500`}
                    style={{ width: `${m.percentage}%` }}
                    title={`${m.brand}: ${m.count} flights (${m.percentage}%)`}
                  />
                );
              })}
            </div>

            {/* Manufacturer Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {manufacturers.map((m, i) => {
                const colors = ['text-blue-400', 'text-indigo-400', 'text-cyan-400', 'text-teal-400'];
                return (
                  <div key={m.brand} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className={`text-xs font-bold block ${colors[i % colors.length]}`}>{m.brand}</span>
                    <div className="text-lg font-extrabold text-white font-mono mt-0.5">{m.count}</div>
                    <span className="text-[11px] text-slate-400">{m.percentage}% of flights</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Airframe Body Types & Top Aircraft Models */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Body Types */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-white m-0">Airframe Body Category</h4>
              <div className="space-y-2.5 pt-1">
                {bodyTypes.map((b) => (
                  <div key={b.type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{b.type}</span>
                      <div className="font-mono text-slate-400">
                        <span className="font-bold text-white">{b.count}</span> ({b.percentage}%)
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${Math.max(b.percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seat Position Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-white m-0">Seat Position Distribution</h4>
              {seats.hasLoggedSeats ? (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      Window Seats (A, F, K)
                    </span>
                    <span className="font-mono font-bold text-cyan-300">
                      {seats.window?.count} ({seats.window?.percent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      Aisle Seats (C, D, G, H)
                    </span>
                    <span className="font-mono font-bold text-indigo-300">
                      {seats.aisle?.count} ({seats.aisle?.percent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      Middle Seats (B, E, J)
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {seats.middle?.count} ({seats.middle?.percent}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Record seat numbers (e.g. "12A", "24F") in your flight log to unlock window vs aisle statistics!
                </div>
              )}
            </div>
          </div>

          {/* 3. Top Aircraft Models */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-bold text-sm text-white m-0">Most Flown Aircraft Types</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {topModels.map((m, i) => (
                <div key={m.model} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="w-4 text-center font-mono text-slate-500 text-xs font-bold">{i + 1}</span>
                    <span className="text-slate-200 text-xs font-medium truncate">{m.model}</span>
                  </div>
                  <div className="font-mono text-right shrink-0">
                    <span className="font-bold text-white text-xs">{m.count}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({m.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Aircraft models are calculated from recorded equipment and standard airline fleet configurations.
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

