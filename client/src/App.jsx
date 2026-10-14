import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import GlobeView from './components/GlobeView';
import FlightMap2D from './components/FlightMap2D';
import StatsCards from './components/StatsCards';
import FlightList from './components/FlightList';
import AddFlightModal from './components/AddFlightModal';
import AccessModal from './components/AccessModal';
import CalendarSyncModal from './components/CalendarSyncModal';
import AeroLogBadgesModal from './components/AeroLogBadgesModal';
import TripsViewModal from './components/TripsViewModal';
import AeroLogWrappedModal from './components/AeroLogWrappedModal';
import FleetAndSeatModal from './components/FleetAndSeatModal';
import BoardingPassScanModal from './components/BoardingPassScanModal';
import LoginScreen from './components/LoginScreen';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import AdminUsersPage from './components/AdminUsersPage';
import {
  Globe,
  Map,
  ShieldAlert,
  Plane,
  BarChart3,
  Sparkles,
  Plus,
  Trophy,
  Luggage,
  Layers,
  Calendar,
  QrCode,
  X
} from 'lucide-react';
import {
  fetchFlights,
  fetchStats,
  deleteFlight,
  fetchAuthConfig,
  fetchCurrentUser,
  getStoredUser,
  clearSession
} from './api';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(() => window.location.pathname);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [authConfig, setAuthConfig] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync client-side route on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => setCurrentRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
    window.scrollTo(0, 0);
  };

  const [flights, setFlights] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'analytics'
  const [mobileTab, setMobileTab] = useState('map'); // 'map' | 'flights' | 'stats'
  const [isMobileInsightsOpen, setIsMobileInsightsOpen] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [isTripsModalOpen, setIsTripsModalOpen] = useState(false);
  const [isWrappedModalOpen, setIsWrappedModalOpen] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Check auth configuration and validate existing session
  useEffect(() => {
    async function initAuth() {
      try {
        const config = await fetchAuthConfig();
        setAuthConfig(config);

        if (currentUser) {
          try {
            const me = await fetchCurrentUser();
            setCurrentUser(me.user);
          } catch (e) {
            console.warn('Session expired or invalid:', e.message);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setAuthLoading(false);
      }
    }
    initAuth();
  }, []);

  // Load flights and stats when user is authenticated
  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [flightsData, statsData] = await Promise.all([
        fetchFlights(),
        fetchStats()
      ]);
      setFlights(flightsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load flight tracker data:', err);
      if (err.message.includes('Session invalid') || err.message.includes('Failed to load flights')) {
        setCurrentUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Keyboard shortcut: Press "A" or "+" to open Add Flight modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        currentUser &&
        (e.key === 'a' || e.key === 'A') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setFlights([]);
    setStats(null);
    setSelectedFlight(null);
  };

  const handleDeleteFlight = async (id) => {
    try {
      await deleteFlight(id);
      if (selectedFlight && selectedFlight.id === id) {
        setSelectedFlight(null);
      }
      await loadData();
    } catch (err) {
      alert('Failed to delete flight: ' + err.message);
    }
  };

  const handleFlightAdded = async () => {
    await loadData();
  };

  // Public legal documents (accessible by any visitor or crawler without auth)
  if (currentRoute === '/privacy') {
    return <PrivacyPolicy onBack={() => navigateTo('/')} />;
  }
  if (currentRoute === '/termsofservice' || currentRoute === '/terms') {
    return <TermsOfService onBack={() => navigateTo('/')} />;
  }

  // Loading initial auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 gap-3">
        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading AeroLog security...</span>
      </div>
    );
  }

  // Not logged in: Show Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        authConfig={authConfig}
        onLoginSuccess={handleLoginSuccess}
        onNavigate={navigateTo}
      />
    );
  }

  const clientId = authConfig?.googleClientId || 'temp-dev-client-id';

  // Administrator Console View / Route
  if (currentRoute === '/admin' || currentView === 'admin') {
    if (!currentUser.isAdmin) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Administrator Access Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The user directory and system administration console is restricted to verified administrators.
            </p>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                navigateTo('/');
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Return to Flight Tracker
            </button>
          </div>
        </div>
      );
    }

    return (
      <AdminUsersPage
        currentUser={currentUser}
        onBack={() => {
          setCurrentView('dashboard');
          navigateTo('/');
        }}
      />
    );
  }

  // Logged in: Main Application
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        {/* Top Navigation */}
        <Navbar
          currentView={currentView}
          onSelectView={setCurrentView}
          onNavigate={navigateTo}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenAccessModal={() => setIsAccessModalOpen(true)}
          onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
          onOpenBadgesModal={() => setIsBadgesModalOpen(true)}
          onOpenTripsModal={() => setIsTripsModalOpen(true)}
          onOpenWrappedModal={() => setIsWrappedModalOpen(true)}
          onOpenFleetModal={() => setIsFleetModalOpen(true)}
          onOpenScanModal={() => setIsScanModalOpen(true)}
          onLogout={handleLogout}
          onDataChanged={loadData}
          currentUser={currentUser}
          totalFlights={stats?.totalFlights || 0}
          totalMiles={stats?.totalMiles || 0}
          unlockedBadgesCount={stats?.badgeStats?.unlockedCount || 0}
          totalTripsCount={stats?.trips?.length || 0}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 md:pb-6 flex flex-col gap-3 sm:gap-4">
          {/* MOBILE VIEW (md:hidden) */}
          <div className="md:hidden flex flex-col gap-3">
            {/* Mobile Tab Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner gap-1 sticky top-[57px] z-30 backdrop-blur-md">
              <button
                onClick={() => setMobileTab('map')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  mobileTab === 'map' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setMobileTab('flights')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  mobileTab === 'flights' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Flights ({flights.length})</span>
              </button>
              <button
                onClick={() => setMobileTab('stats')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  mobileTab === 'stats' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
            </div>

            {/* Mobile Tab 1: Map & 3D Globe */}
            {mobileTab === 'map' && (
              <div className="flex flex-col gap-2.5">
                {/* Compact Stats Pill Bar */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Total Distance</span>
                    <span className="font-mono font-bold text-xs text-cyan-300">
                      {(stats?.totalMiles || 0).toLocaleString()} mi
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Total Flights</span>
                    <span className="font-mono font-bold text-xs text-white">
                      {flights.length} flights
                    </span>
                  </div>
                </div>

                {/* Map Container */}
                <div className="h-[calc(100vh-275px)] min-h-[380px] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                  {/* Floating 2D/3D Mode Switcher */}
                  <div className="absolute top-2.5 left-2.5 z-30 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-xl">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        viewMode === '2d'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>2D</span>
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        viewMode === '3d'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>3D</span>
                    </button>
                  </div>

                  {viewMode === '3d' ? (
                    <GlobeView
                      flights={flights}
                      selectedFlight={selectedFlight}
                      onSelectFlight={(f) => setSelectedFlight(f)}
                    />
                  ) : (
                    <FlightMap2D
                      flights={flights}
                      selectedFlight={selectedFlight}
                      onSelectFlight={(f) => setSelectedFlight(f)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Mobile Tab 2: Flight Logbook */}
            {mobileTab === 'flights' && (
              <div className="h-[calc(100vh-200px)] min-h-[460px]">
                <FlightList
                  flights={flights}
                  selectedFlight={selectedFlight}
                  onSelectFlight={(f) => {
                    setSelectedFlight(f);
                    setMobileTab('map');
                  }}
                  onDeleteFlight={handleDeleteFlight}
                />
              </div>
            )}

            {/* Mobile Tab 3: Detailed Stats & Analytics */}
            {mobileTab === 'stats' && (
              <div className="space-y-4">
                <StatsCards
                  stats={stats}
                  flights={flights}
                  currentUser={currentUser}
                  forceShowDetails={true}
                  isAnalyticsView={true}
                />
              </div>
            )}
          </div>

          {/* DESKTOP VIEW (hidden md:flex flex-col gap-4) */}
          <div className="hidden md:flex flex-col gap-4">
            {/* Statistics Hero Banner */}
            <StatsCards
              stats={stats}
              flights={flights}
              currentUser={currentUser}
              isAnalyticsView={currentView === 'analytics'}
            />

            {/* Dynamic Content View based on Navigation Tab */}
            {currentView === 'dashboard' || currentView === 'map' ? (
              /* Visual Map / Globe + Flight Logbook Split */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
                {/* Map / Globe View (7-8 cols on desktop) */}
                <div className="lg:col-span-7 xl:col-span-8 h-[540px] sm:h-[620px] sticky top-20 relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                  {/* Floating 2D Map / 3D Globe Mode Switcher */}
                  <div className="absolute top-3 left-3 z-30 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-xl">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        viewMode === '2d'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>2D Map</span>
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        viewMode === '3d'
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>3D Globe</span>
                    </button>
                  </div>

                  {viewMode === '3d' ? (
                    <GlobeView
                      flights={flights}
                      selectedFlight={selectedFlight}
                      onSelectFlight={(f) => setSelectedFlight(f)}
                    />
                  ) : (
                    <FlightMap2D
                      flights={flights}
                      selectedFlight={selectedFlight}
                      onSelectFlight={(f) => setSelectedFlight(f)}
                    />
                  )}
                </div>

                {/* Flight Logbook & Filter Panel (4-5 cols on desktop) */}
                <div className="lg:col-span-5 xl:col-span-4 h-[620px]">
                  <FlightList
                    flights={flights}
                    selectedFlight={selectedFlight}
                    onSelectFlight={(f) => setSelectedFlight(f)}
                    onDeleteFlight={handleDeleteFlight}
                  />
                </div>
              </div>
            ) : (
              /* Dedicated Analytics & Rosters Logbook Table View */
              <div className="h-[520px] mt-2">
                <FlightList
                  flights={flights}
                  selectedFlight={selectedFlight}
                  onSelectFlight={(f) => setSelectedFlight(f)}
                  onDeleteFlight={handleDeleteFlight}
                />
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="hidden md:flex border-t border-slate-800/80 py-4 px-6 text-xs text-slate-500 flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <span>AeroLog Flight Tracker</span>
            <span>•</span>
            <button
              onClick={() => navigateTo('/privacy')}
              className="text-cyan-400 hover:underline hover:text-cyan-300 cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('/termsofservice')}
              className="text-cyan-400 hover:underline hover:text-cyan-300 cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
          <span className="font-mono text-[11px] text-cyan-500/80">Logged in as {currentUser.email}</span>
        </footer>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
          <button
            onClick={() => setMobileTab('map')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              mobileTab === 'map' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="text-[10px]">Map</span>
          </button>
          <button
            onClick={() => setMobileTab('flights')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              mobileTab === 'flights' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Plane className="w-4 h-4" />
              {flights.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-bold font-mono">
                  {flights.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Flights</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex flex-col items-center justify-center -mt-3 w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-teal-400 text-slate-950 shadow-lg shadow-cyan-500/30 active:scale-95 transition"
            title="Add Flight"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>
          <button
            onClick={() => setMobileTab('stats')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              mobileTab === 'stats' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px]">Stats</span>
          </button>
          <button
            onClick={() => setIsMobileInsightsOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-slate-400 hover:text-white transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[10px]">Insights</span>
          </button>
        </nav>

        {/* Mobile Insights Drawer / Modal */}
        {isMobileInsightsOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMobileInsightsOpen(false)}
          >
            <div
              className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">Aviation Insights &amp; Tools</h3>
                </div>
                <button
                  onClick={() => setIsMobileInsightsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setIsMobileInsightsOpen(false);
                    setIsBadgesModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-left active:bg-slate-800 transition"
                >
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">Badges</div>
                    <div className="text-[10px] text-slate-400">{stats?.badgeStats?.unlockedCount || 0}/12 stamps</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileInsightsOpen(false);
                    setIsTripsModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-left active:bg-slate-800 transition"
                >
                  <Luggage className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">Trips</div>
                    <div className="text-[10px] text-slate-400">{stats?.trips?.length || 0} grouped</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileInsightsOpen(false);
                    setIsFleetModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-left active:bg-slate-800 transition"
                >
                  <Layers className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">Fleet</div>
                    <div className="text-[10px] text-slate-400">Aircraft &amp; seats</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileInsightsOpen(false);
                    setIsWrappedModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-left active:bg-slate-800 transition"
                >
                  <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">Wrapped</div>
                    <div className="text-[10px] text-slate-400">Year in review</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileInsightsOpen(false);
                    setIsCalendarModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-left active:bg-slate-800 transition"
                >
                  <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">Sync Calendar</div>
                    <div className="text-[10px] text-slate-400">Import flights</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileInsightsOpen(false);
                    setIsScanModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-left active:bg-slate-800 transition"
                >
                  <QrCode className="w-5 h-5 text-teal-400 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-white">Scan Pass</div>
                    <div className="text-[10px] text-slate-400">Boarding pass</div>
                  </div>
                </button>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setIsMobileInsightsOpen(false)}
                  className="w-full py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <AddFlightModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onFlightAdded={handleFlightAdded}
        />

        <AccessModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          currentUser={currentUser}
        />

        <CalendarSyncModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          onFlightsImported={loadData}
          authConfig={authConfig}
        />

        <AeroLogBadgesModal
          isOpen={isBadgesModalOpen}
          onClose={() => setIsBadgesModalOpen(false)}
          badgeStats={stats?.badgeStats}
        />

        <TripsViewModal
          isOpen={isTripsModalOpen}
          onClose={() => setIsTripsModalOpen(false)}
          trips={stats?.trips || []}
        />

        <AeroLogWrappedModal
          isOpen={isWrappedModalOpen}
          onClose={() => setIsWrappedModalOpen(false)}
          wrapped={stats?.wrapped || {}}
          currentUser={currentUser}
        />

        <FleetAndSeatModal
          isOpen={isFleetModalOpen}
          onClose={() => setIsFleetModalOpen(false)}
          fleetStats={stats?.fleetStats}
        />

        <BoardingPassScanModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onFlightAdded={handleFlightAdded}
        />
      </div>
    </GoogleOAuthProvider>
  );
}
