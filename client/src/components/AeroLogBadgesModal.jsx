import React, { useState } from 'react';
import {
  Award,
  X,
  CheckCircle2,
  Lock,
  Sparkles,
  Trophy,
  Filter,
  Globe2,
  Compass,
  Plane,
  ChevronRight
} from 'lucide-react';

export default function AeroLogBadgesModal({ isOpen, onClose, badgeStats }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'

  if (!isOpen || !badgeStats) return null;

  const { badges = [], unlockedCount = 0, totalBadges = 0, percentage = 0 } = badgeStats;

  const filteredBadges = badges.filter((b) => {
    if (filter === 'unlocked') return b.unlocked;
    if (filter === 'locked') return !b.unlocked;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white m-0">AeroLog Aviation Passport Badges</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                  {unlockedCount} / {totalBadges} Unlocked
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">Milestones and achievements unlocked across your flight history</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Passport Progress Banner */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-cyan-950/40 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 w-full sm:max-w-md">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Passport Completion
              </span>
              <span className="font-mono font-bold text-amber-300">{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-end sm:self-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({totalBadges})
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'unlocked' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unlocked ({unlockedCount})
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'locked' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Locked ({totalBadges - unlockedCount})
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredBadges.map((b) => {
              const pct = Math.round((b.progress / b.maxProgress) * 100);

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    b.unlocked
                      ? 'bg-slate-950/70 border-amber-500/30 hover:border-amber-400/60 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-70 hover:opacity-90'
                  }`}
                >
                  <div>
                    {/* Badge Top Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                            b.unlocked
                              ? 'bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/40 shadow-amber-500/10'
                              : 'bg-slate-900 border border-slate-800 text-slate-600'
                          }`}
                        >
                          {b.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-white m-0">{b.title}</h4>
                            {b.unlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {b.category}
                          </span>
                        </div>
                      </div>

                      {/* Status Stamp */}
                      {b.unlocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold shrink-0">
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 font-medium shrink-0">
                          IN PROGRESS
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mb-3">{b.description}</p>
                  </div>

                  {/* Progress Meter */}
                  <div className="pt-2 border-t border-slate-800/70">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500 font-mono">{b.metric}</span>
                      <span className={`font-mono font-bold ${b.unlocked ? 'text-amber-400' : 'text-slate-400'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          b.unlocked ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-slate-600'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Log more flights to unlock additional passport stamps and achievements!
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

