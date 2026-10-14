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
import { Globe, Map } from 'lucide-react';
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
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [authConfig, setAuthConfig] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [flights, setFlights] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'analytics'

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
      />
    );
  }

  const clientId = authConfig?.googleClientId || 'temp-dev-client-id';

  // Logged in: Main Application
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        {/* Top Navigation */}
        <Navbar
          currentView={currentView}
          onSelectView={setCurrentView}
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
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Statistics Hero Banner */}
          <StatsCards
            stats={stats}
            flights={flights}
            currentUser={currentUser}
            isAnalyticsView={currentView === 'analytics'}
          />

          {/* Dynamic Content View based on Navigation Tab */}
          {currentView === 'map' ? (
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
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 flex items-center justify-between max-w-7xl mx-auto w-full">
          <span>AeroLog Flight Tracker • Protected by Google OAuth & Access Allowlist</span>
          <span className="font-mono text-[11px] text-cyan-500/80">Logged in as {currentUser.email}</span>
        </footer>

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
