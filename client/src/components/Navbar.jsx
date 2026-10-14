import React, { useRef, useState } from 'react';
import {
  Plane,
  Plus,
  Globe,
  Map,
  Download,
  Upload,
  Trophy,
  Luggage,
  Sparkles,
  Layers,
  QrCode,
  Calendar,
  Shield,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { importFlights, downloadFlightExport } from '../api';

export default function Navbar({
  currentView = 'dashboard',
  onSelectView,
  viewMode,
  setViewMode,
  onOpenAddModal,
  onOpenAccessModal,
  onOpenCalendarModal,
  onOpenBadgesModal,
  onOpenTripsModal,
  onOpenWrappedModal,
  onOpenFleetModal,
  onOpenScanModal,
  onLogout,
  onDataChanged,
  currentUser,
  unlockedBadgesCount = 0,
  totalTripsCount = 0,
  onNavigate
}) {
  const fileInputRef = useRef(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInsightsMenu, setShowInsightsMenu] = useState(false);

  const handleExport = async () => {
    try {
      await downloadFlightExport();
    } catch (err) {
      alert('Failed to export flights: ' + err.message);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        await importFlights(json);
        alert(`Successfully imported ${json.length} flights!`);
        if (onDataChanged) onDataChanged();
      } else {
        alert('Invalid flight data format: expected an array of flights.');
      }
    } catch (err) {
      alert('Error parsing or importing file: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Mode Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/25 border border-cyan-500/40 shrink-0 bg-slate-900">
            <img src="/logo-120.png" alt="AeroLog" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white m-0">AeroLog</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 m-0 hidden sm:block">Global Flight Tracker & Aviation Analytics</p>
          </div>
        </div>

        {/* Center Navigation: Clean Segmented View Switch & Consolidated Insights Menu */}
        <div className="hidden md:flex items-center gap-2">
          {/* Main Views Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => {
                if (onSelectView) onSelectView('dashboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                currentView === 'dashboard'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Map & Logbook</span>
            </button>
            <button
              onClick={() => {
                if (onSelectView) onSelectView('analytics');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                currentView === 'analytics'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Analytics & Rosters</span>
            </button>
          </div>

          {/* Consolidated Insights & Modules Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowInsightsMenu(!showInsightsMenu)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                showInsightsMenu
                  ? 'bg-slate-800 text-white border-slate-700 shadow-md'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Insights</span>
              {unlockedBadgesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] font-mono font-bold text-cyan-300">
                  {unlockedBadgesCount}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showInsightsMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Insights Dropdown Menu */}
            {showInsightsMenu && (
              <div
                className="absolute left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowInsightsMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Aviation Intelligence
                </div>

                {/* Badges */}
                <button
                  onClick={() => {
                    setShowInsightsMenu(false);
                    onOpenBadgesModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/80 flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Passport Badges</div>
                      <div className="text-[10px] text-slate-400">Aviation milestones & stamps</div>
                    </div>
                  </div>
                  {unlockedBadgesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/30">
                      {unlockedBadgesCount}/12
                    </span>
                  )}
                </button>

                {/* Trips */}
                <button
                  onClick={() => {
                    setShowInsightsMenu(false);
                    onOpenTripsModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/80 flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                      <Luggage className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Grouped Trips</div>
                      <div className="text-[10px] text-slate-400">Vacations & roundtrips</div>
                    </div>
                  </div>
                  {totalTripsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                      {totalTripsCount} trips
                    </span>
                  )}
                </button>

                {/* Fleet & Seats */}
                <button
                  onClick={() => {
                    setShowInsightsMenu(false);
                    onOpenFleetModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/80 flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Fleet & Cabins</div>
                      <div className="text-[10px] text-slate-400">Boeing vs Airbus, seat heatmap</div>
                    </div>
                  </div>
                </button>

                {/* Wrapped */}
                <button
                  onClick={() => {
                    setShowInsightsMenu(false);
                    onOpenWrappedModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/80 flex items-center justify-between group transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">AeroLog Wrapped</div>
                      <div className="text-[10px] text-slate-400">Annual year-in-review & personas</div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Admin Console Quick Access (Admin only) */}
          {currentUser?.isAdmin && (
            <button
              onClick={() => {
                if (onNavigate) onNavigate('/admin');
                else if (onSelectView) onSelectView('admin');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                currentView === 'admin'
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900/90 text-cyan-400 border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-300'
              }`}
              title="Manage authenticated users and application data"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
          )}
        </div>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Scan Boarding Pass Button */}
          <button
            onClick={onOpenScanModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition"
            title="Scan Boarding Pass Barcode or Text"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Scan Pass</span>
          </button>

          {/* Sync Calendar Button */}
          <button
            onClick={onOpenCalendarModal}
            title="Sync Google Calendar"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Sync Calendar</span>
          </button>

          {/* Add Flight Primary CTA */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Flight</span>
          </button>

          {/* User Profile / Menu */}
          {currentUser && (
            <div className="relative ml-1 pl-2 border-l border-slate-800">
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 cursor-pointer p-1 rounded-xl hover:bg-slate-900 transition"
              >
                {currentUser.picture ? (
                  <img
                    src={currentUser.picture}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full border border-cyan-500/50 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-300">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                )}
                {currentUser.isAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold uppercase tracking-wider">
                    Admin
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </div>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="font-bold text-xs text-white truncate">{currentUser.name}</div>
                      {currentUser.isAdmin && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold uppercase shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</div>
                  </div>

                  {/* Navigation Links inside Mobile Menu */}
                  <div className="lg:hidden border-b border-slate-800 py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenBadgesModal();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Passport Badges</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenTripsModal();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Luggage className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Grouped Trips</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenWrappedModal();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>AeroLog Wrapped</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenFleetModal();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Aircraft Fleet</span>
                    </button>
                  </div>

                  <div className="py-1">
                    {currentUser?.isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onNavigate) onNavigate('/admin');
                          else if (onSelectView) onSelectView('admin');
                        }}
                        className="w-full px-4 py-1.5 text-left text-xs text-cyan-300 hover:bg-slate-800 flex items-center gap-2 font-medium"
                      >
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Admin Console: Users & Data</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAccessModal();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Security & Allowlist</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleExport();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Export Flights (JSON)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Import Flights (JSON)</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>
    </header>
  );
}
