import React, { useState, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import {
  X,
  Calendar,
  Sparkles,
  Plane,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  RefreshCw,
  CheckSquare,
  Square
} from 'lucide-react';
import { scanGoogleCalendar, scanICSCalendar, confirmCalendarImport } from '../api';
import confetti from 'canvas-confetti';

export default function CalendarSyncModal({ isOpen, onClose, onFlightsImported, authConfig }) {
  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'file'
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Time range & filter keyword
  const [timeRangeYears, setTimeRangeYears] = useState('10');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Scanned results
  const [detectedFlights, setDetectedFlights] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [scannedStats, setScannedStats] = useState(null);

  const fileInputRef = useRef(null);

  // Google OAuth Calendar Login
  const handleGoogleCalendarLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: async (tokenResponse) => {
      setError(null);
      setLoading(true);
      setSuccess(null);
      try {
        const years = parseInt(timeRangeYears, 10) || 10;
        const timeMin = new Date(Date.now() - years * 365 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        const result = await scanGoogleCalendar(tokenResponse.access_token, timeMin, timeMax, searchKeyword);
        setScannedStats({
          totalScanned: result.totalEventsScanned,
          found: result.detectedFlightsCount
        });
        setDetectedFlights(result.flights);

        // Auto-select all flights that aren't already logged
        const newSet = new Set();
        result.flights.forEach((f, idx) => {
          if (!f.alreadyLogged) newSet.add(idx);
        });
        setSelectedIndices(newSet);

        if (result.flights.length === 0) {
          setError(`Scanned ${result.totalEventsScanned} calendar events over the past ${years} years, but found no flight confirmations matching airport codes or flight numbers.`);
        }
      } catch (err) {
        console.error('Calendar scan error:', err);
        setError(err.message || 'Failed to scan Google Calendar');
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      setError('Google Calendar authorization failed: ' + (err.error_description || err.error || 'Access denied'));
    }
  });

  // Handle .ics File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);
    setSuccess(null);

    try {
      const text = await file.text();
      const result = await scanICSCalendar(text);

      setScannedStats({
        totalScanned: result.totalEventsScanned,
        found: result.detectedFlightsCount
      });
      setDetectedFlights(result.flights);

      const newSet = new Set();
      result.flights.forEach((f, idx) => {
        if (!f.alreadyLogged) newSet.add(idx);
      });
      setSelectedIndices(newSet);

      if (result.flights.length === 0) {
        setError(`Parsed ${result.totalEventsScanned} events from "${file.name}", but found no flight bookings matching airport codes.`);
      }
    } catch (err) {
      setError('Failed to parse calendar file: ' + err.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Toggle selection
  const toggleSelect = (index) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleSelectAllNew = () => {
    const next = new Set();
    detectedFlights.forEach((f, idx) => {
      if (!f.alreadyLogged) next.add(idx);
    });
    setSelectedIndices(next);
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  // Submit confirmed import
  const handleConfirmImport = async () => {
    const flightsToImport = Array.from(selectedIndices).map(i => detectedFlights[i]);
    if (flightsToImport.length === 0) {
      setError('Please select at least one flight to import');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const res = await confirmCalendarImport(flightsToImport);
      setSuccess(`Successfully imported ${res.count} flights into your logbook!`);

      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {}

      if (onFlightsImported) onFlightsImported();

      // Clear detected after short delay
      setTimeout(() => {
        setDetectedFlights([]);
        setSelectedIndices(new Set());
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to import flights');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Historic Flight Calendar Sync</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/30">
                  Auto-Detect
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Scan your calendar events to automatically identify and import historic flights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('google')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'google'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Google Calendar Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import .ICS / Calendar Export</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Action Area based on Tab */}
          {activeTab === 'google' ? (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">Time Range to Scan</div>
                  <div className="text-[11px] text-slate-400">Scan calendar events backwards in time</div>
                </div>
                <select
                  value={timeRangeYears}
                  onChange={(e) => setTimeRangeYears(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="2">Past 2 Years</option>
                  <option value="5">Past 5 Years</option>
                  <option value="10">Past 10 Years (Recommended)</option>
                  <option value="20">All Time (Past 20 Years)</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">Filter Keyword (Optional)</div>
                  <div className="text-[11px] text-slate-400">Target a specific airline or destination (e.g. "Icelandair", "Reykjavik", "Delta", or leave blank)</div>
                </div>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="e.g. Icelandair, Delta, Iceland..."
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-600 sm:w-64"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm">
                  Requires read-only calendar permission to search for airline bookings and IATA airport codes in your schedule.
                </p>
                <button
                  onClick={() => handleGoogleCalendarLogin()}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Scanning Google Calendar...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Connect & Scan Calendar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ICS File Upload Tab */
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white">Upload Calendar Archive (.ics)</span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Export your Google Calendar (from Google Takeout or Settings ➔ Export) or Apple Calendar, and drop the <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">.ics</code> file here.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 p-6 rounded-2xl text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900/80 group"
              >
                <Upload className="w-8 h-8 mx-auto text-slate-500 group-hover:text-cyan-400 transition mb-2" />
                <div className="text-xs font-semibold text-slate-300 group-hover:text-white">
                  Click to select .ics calendar file
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Supports iCalendar (.ics) format from Google, Apple, or Outlook</div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".ics,text/calendar"
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Results Section */}
          {detectedFlights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Detected Flights ({detectedFlights.length})</span>
                  <span className="text-[11px] text-cyan-400 font-normal">
                    {selectedIndices.size} selected for import
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleSelectAllNew}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Select All New
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-[11px] text-slate-400 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Scrollable Flights Preview */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {detectedFlights.map((f, idx) => {
                  const isSelected = selectedIndices.has(idx);

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-500/60 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-cyan-300">{f.flight_number}</span>
                            <span className="text-slate-300 font-medium">{f.airline}</span>
                            <span className="text-[11px] text-slate-500 font-mono">📅 {f.date}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span className="font-mono text-white font-semibold">{f.origin_iata}</span>
                            <span>({f.origin_city})</span>
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                            <span className="font-mono text-white font-semibold">{f.dest_iata}</span>
                            <span>({f.dest_city})</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400 text-xs">
                          {f.distance_miles.toLocaleString()} mi
                        </div>
                        {f.alreadyLogged && (
                          <span className="text-[10px] text-amber-400 font-medium">Already logged</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Import Button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {selectedIndices.size} flight{selectedIndices.size === 1 ? '' : 's'} ready to add
                </div>

                <button
                  onClick={handleConfirmImport}
                  disabled={importing || selectedIndices.size === 0}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Adding to Logbook...</span>
                    </>
                  ) : (
                    <>
                      <Plane className="w-3.5 h-3.5" />
                      <span>Import {selectedIndices.size} Flights</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

