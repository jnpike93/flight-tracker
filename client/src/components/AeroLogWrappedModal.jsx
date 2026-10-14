import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  Plane,
  Globe2,
  MapPin,
  Calendar,
  Compass,
  Award,
  ArrowRight
} from 'lucide-react';

export default function AeroLogWrappedModal({
  isOpen,
  onClose,
  wrapped = {},
  currentUser,
  unit = 'miles'
}) {
  const years = Object.keys(wrapped).sort().reverse();
  const [selectedYear, setSelectedYear] = useState(years[0] || '2024');
  const [copyStatus, setCopyStatus] = useState('idle');
  const cardRef = useRef(null);

  if (!isOpen) return null;

  const currentYearData = wrapped[selectedYear] || Object.values(wrapped)[0];
  if (!currentYearData) return null;

  const unitAbbr = unit === 'miles' ? 'mi' : 'km';
  const totalDist = unit === 'miles' ? currentYearData.totalMiles : currentYearData.totalKm;

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

  const handleCopyCard = async () => {
    if (!cardRef.current) return;
    setCopyStatus('copying');
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#020617',
        scale: 2,
        useCORS: true,
        logging: false
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCopyStatus('error');
          return;
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 3000);
          } else {
            handleDownload();
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 3000);
          }
        } catch {
          handleDownload();
          setCopyStatus('copied');
          setTimeout(() => setCopyStatus('idle'), 3000);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#020617',
      scale: 2,
      useCORS: true
    });
    const link = document.createElement('a');
    link.download = `aerolog-wrapped-${selectedYear}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white m-0">AeroLog Wrapped</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30">
                  Year in the Sky
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">Your annual commercial aviation recap & traveler persona</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCard}
              disabled={copyStatus === 'copying'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {copyStatus === 'copied' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Card</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Year Selector Ribbon */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Select Year:</span>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition shrink-0 ${
                selectedYear === y
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Card Display Area */}
        <div className="p-6 overflow-y-auto flex justify-center bg-slate-950/40">
          {/* THE CAPTURE TARGET WRAPPED CARD */}
          <div
            ref={cardRef}
            className="w-[520px] max-w-full rounded-3xl bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 border border-purple-500/40 p-6 shadow-2xl text-white flex flex-col gap-5 select-none relative overflow-hidden"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm">
                  ✈
                </div>
                <div>
                  <h4 className="font-black text-sm m-0 tracking-tight">AeroLog Wrapped</h4>
                  <span className="text-[10px] text-purple-300 font-mono">
                    {currentUser?.name || currentUser?.email || 'Aviator'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-300 bg-clip-text text-transparent font-mono">
                  {selectedYear}
                </span>
              </div>
            </div>

            {/* Persona Callout */}
            <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-center space-y-1 relative z-10">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest block">
                Your Aviation Persona
              </span>
              <div className="text-lg font-black text-white tracking-tight">
                {currentYearData.persona}
              </div>
            </div>

            {/* Hero Volume Grid */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Flights</span>
                <div className="text-3xl font-black text-white font-mono mt-0.5">
                  {currentYearData.flightCount}
                </div>
                <span className="text-[11px] text-purple-300">~{currentYearData.hoursAloft} hours in the air</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Distance</span>
                <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                  {totalDist.toLocaleString()} <span className="text-xs text-slate-300">{unitAbbr}</span>
                </div>
                <span className="text-[11px] text-teal-300">{currentYearData.earthLaps}x around the Earth</span>
              </div>
            </div>

            {/* Highlights List */}
            <div className="space-y-2 relative z-10 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-purple-400" />
                  <span className="text-slate-400">Carrier of the Year</span>
                </div>
                <span className="font-bold text-white font-mono">{currentYearData.topAirline}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400">Most Frequented Hub</span>
                </div>
                <span className="font-bold text-cyan-300 font-mono">{currentYearData.topAirport}</span>
              </div>

              {currentYearData.longestFlight && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-400">Longest Flight Leg</span>
                  </div>
                  <div className="font-mono text-right">
                    <span className="font-bold text-white">
                      {currentYearData.longestFlight.origin_iata} → {currentYearData.longestFlight.dest_iata}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-1.5">
                      ({(unit === 'miles' ? currentYearData.longestFlight.distance_miles : currentYearData.longestFlight.distance_km || 0).toLocaleString()} {unitAbbr})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Watermark */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 font-mono relative z-10">
              <span>AeroLog Annual Travel Intelligence</span>
              <span>Generated {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

