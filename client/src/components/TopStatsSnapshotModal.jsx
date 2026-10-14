import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Camera,
  Copy,
  Check,
  Download,
  X,
  Plane,
  Globe2,
  MapPin,
  Calendar,
  Compass,
  Award,
  Sparkles,
  History,
  ArrowRight
} from 'lucide-react';

export default function TopStatsSnapshotModal({
  isOpen,
  onClose,
  stats,
  currentUser,
  unit = 'miles'
}) {
  const cardRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState('idle'); // 'idle' | 'copying' | 'copied' | 'error'
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !stats) return null;

  const unitAbbr = unit === 'miles' ? 'mi' : 'km';
  const totalDistance = unit === 'miles' ? stats.totalMiles : stats.totalKm;

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

  // Top 5 Airlines
  const top5Airlines = (stats.allAirlines || stats.topAirlines || []).slice(0, 5);

  // Top 5 Airports
  const top5Airports = (stats.allAirports || stats.topAirports || []).slice(0, 5);

  // Top 5 Routes
  const top5Routes = (stats.topRoutes || []).slice(0, 5);

  // Top 5 Years (sorted by flight count desc)
  const top5Years = [...(stats.yearlyBreakdown || [])]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  // Helper to generate canvas
  const generateCanvas = async () => {
    if (!cardRef.current) return null;
    return await html2canvas(cardRef.current, {
      backgroundColor: '#020617', // slate-950
      scale: 2, // 2x retina crisp resolution
      useCORS: true,
      logging: false
    });
  };

  // Copy screenshot directly to system clipboard
  const handleCopyToClipboard = async () => {
    setCopyStatus('copying');
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error('Could not render image canvas');

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCopyStatus('error');
          return;
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 3000);
          } else {
            // Fallback: download if clipboard item API not available
            handleDownload();
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 3000);
          }
        } catch (clipErr) {
          console.warn('Clipboard write failed, downloading file instead:', clipErr);
          handleDownload();
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 3000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot capture failed:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  // Download image file
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `aerolog-top5-stats-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white m-0">Top 5 Flight Stats Snapshot</h3>
              <p className="text-[11px] text-slate-400 m-0">Compact, high-res graphic ready to copy and share</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
              onClick={handleCopyToClipboard}
              disabled={copyStatus === 'copying'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {copyStatus === 'copying' ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Capturing...</span>
                </>
              ) : copyStatus === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-950" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Screenshot</span>
                </>
              )}
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="p-4 sm:p-6 overflow-x-auto flex justify-center bg-slate-950/50">
          {/* THE CAPTURE TARGET CARD */}
          <div
            ref={cardRef}
            className="w-[660px] max-w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl text-slate-100 flex flex-col gap-4 select-none"
            style={{ minWidth: '640px' }}
          >
            {/* 1. Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
                  <Plane className="w-5 h-5 text-slate-950 font-bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-white tracking-tight">AeroLog</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Top 5 Passport
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {currentUser?.name || currentUser?.email || 'Aviator'} • Flight Intelligence
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Total Volume</span>
                <span className="text-base font-extrabold text-cyan-400 font-mono">
                  {(totalDistance || 0).toLocaleString()} <span className="text-xs text-slate-300">{unitAbbr}</span>
                </span>
              </div>
            </div>

            {/* 2. Top 4 Metric Badges */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Flights</span>
                <span className="text-base font-extrabold text-white font-mono">{stats.totalFlights || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Airports</span>
                <span className="text-base font-extrabold text-indigo-300 font-mono">{stats.uniqueAirportsCount || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Countries</span>
                <span className="text-base font-extrabold text-teal-300 font-mono">{stats.uniqueCountriesCount || 1}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Earth Circ.</span>
                <span className="text-base font-extrabold text-amber-300 font-mono">{stats.earthCircumnavigations || 0}x</span>
              </div>
            </div>

            {/* 3. 2x2 Grid of Top 5 Lists */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Top 5 Airlines */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                    <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-cyan-400" />
                      Top 5 Airlines Flown
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">Flights</span>
                  </div>
                  <div className="space-y-1.5">
                    {top5Airlines.map((a, i) => {
                      const dist = unit === 'miles' ? a.total_miles : a.total_km;
                      return (
                        <div key={a.airline || i} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className="w-4 text-center font-mono font-bold text-slate-500 text-[10px]">
                              {i + 1}
                            </span>
                            {a.airline_code && (
                              <span className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono font-bold text-[9px] border border-cyan-800/40">
                                {a.airline_code}
                              </span>
                            )}
                            <span className="text-slate-300 font-medium truncate">{a.airline}</span>
                          </div>
                          <div className="font-mono text-right whitespace-nowrap">
                            <span className="font-bold text-white">{a.count}</span>
                            <span className="text-slate-500 text-[10px] ml-1">({(dist || 0).toLocaleString()} {unitAbbr})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top 5 Airports */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                    <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      Top 5 Airports Visited
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">Visits</span>
                  </div>
                  <div className="space-y-1.5">
                    {top5Airports.map((apt, i) => (
                      <div key={apt.iata || i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className="w-4 text-center font-mono font-bold text-slate-500 text-[10px]">
                            {i + 1}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono font-bold text-[9px] border border-indigo-800/40">
                            {apt.iata}
                          </span>
                          <span className="text-slate-300 font-medium truncate">{apt.city || apt.name}</span>
                        </div>
                        <div className="font-mono text-right whitespace-nowrap">
                          <span className="font-bold text-white">{apt.visits}</span>
                          <span className="text-slate-500 text-[10px] ml-1">({apt.departures}d/{apt.arrivals}a)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top 5 Routes */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                    <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      Top 5 Routes
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">Roundtrip</span>
                  </div>
                  <div className="space-y-1.5">
                    {top5Routes.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 text-center font-mono font-bold text-slate-500 text-[10px]">
                            {i + 1}
                          </span>
                          <span className="font-mono font-bold text-amber-300">{r.apt1}</span>
                          <span className="text-slate-600 text-[10px]">⇄</span>
                          <span className="font-mono font-bold text-amber-300">{r.apt2}</span>
                        </div>
                        <div className="font-mono text-right whitespace-nowrap">
                          <span className="font-bold text-white">{r.count}</span>
                          <span className="text-slate-500 text-[10px] ml-1">flights</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top 5 Flying Years */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                    <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-400" />
                      Top 5 Busiest Years
                    </span>
                    <span className="text-[10px] font-mono text-teal-400 font-bold">Volume</span>
                  </div>
                  <div className="space-y-1.5">
                    {top5Years.map((y, i) => {
                      const dist = unit === 'miles' ? y.miles : y.km;
                      return (
                        <div key={y.year || i} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 text-center font-mono font-bold text-slate-500 text-[10px]">
                              {i + 1}
                            </span>
                            <span className="font-mono font-bold text-teal-300">{y.year}</span>
                            {i === 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                Peak
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-right whitespace-nowrap">
                            <span className="font-bold text-white">{y.count}</span>
                            <span className="text-slate-500 text-[10px] ml-1">flights ({(dist || 0).toLocaleString()} {unitAbbr})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Footer Strip: Earliest, Latest & Longest Flights */}
            <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px]">
              {/* Earliest */}
              {stats.earliestFlight && (
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-cyan-400 font-bold uppercase block text-[9px]">Earliest Logged</span>
                  <div className="font-mono font-bold text-white truncate">
                    {stats.earliestFlight.origin_iata} → {stats.earliestFlight.dest_iata}
                  </div>
                  <span className="text-slate-400">{formatDate(stats.earliestFlight.date)}</span>
                </div>
              )}

              {/* Latest */}
              {stats.latestFlight && (
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-emerald-400 font-bold uppercase block text-[9px]">Latest Logged</span>
                  <div className="font-mono font-bold text-white truncate">
                    {stats.latestFlight.origin_iata} → {stats.latestFlight.dest_iata}
                  </div>
                  <span className="text-slate-400">{formatDate(stats.latestFlight.date)}</span>
                </div>
              )}

              {/* Longest Leg */}
              {stats.longestFlight && (
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-indigo-400 font-bold uppercase block text-[9px]">Longest Leg</span>
                  <div className="font-mono font-bold text-white truncate">
                    {stats.longestFlight.origin_iata} → {stats.longestFlight.dest_iata}
                  </div>
                  <span className="text-slate-400">
                    {(unit === 'miles' ? stats.longestFlight.distance_miles : stats.longestFlight.distance_km || 0).toLocaleString()} {unitAbbr}
                  </span>
                </div>
              )}
            </div>

            {/* Verification Watermark */}
            <div className="flex items-center justify-between pt-1 text-[9px] text-slate-500 font-mono">
              <span>Verified by AeroLog Global Flight Tracker</span>
              <span>Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click <strong>Copy Screenshot</strong> to paste image directly anywhere.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

