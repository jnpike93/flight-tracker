import React, { useState } from 'react';
import {
  QrCode,
  X,
  Sparkles,
  Plane,
  ArrowRight,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { addFlight, parseBoardingPass } from '../api';

export default function BoardingPassScanModal({
  isOpen,
  onClose,
  onFlightAdded
}) {
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [parsedFlight, setParsedFlight] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setError(null);
    setParsedFlight(null);

    try {
      const data = await parseBoardingPass(rawText.trim());
      setParsedFlight(data.flight);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSaveFlight = async () => {
    if (!parsedFlight) return;
    setSaving(true);
    try {
      await addFlight(parsedFlight);
      if (onFlightAdded) onFlightAdded();
      onClose();
    } catch (err) {
      setError('Failed to save flight: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSample = () => {
    // Standard IATA Bar Coded Boarding Pass string sample:
    // Format: M1PIKE/JAKE MR        EABC123 AUSMDWWN 0142 268Y012A0001 147
    setRawText('M1PIKE/JAKE MR        EABC123 AUSMDWWN 0142 268Y012A0001 147');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <QrCode className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white m-0">Boarding Pass Scanner</h3>
              <p className="text-xs text-slate-400 m-0">Paste barcode data (BCBP/PDF417) or confirmation text</p>
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
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Boarding Pass Barcode / Text:
            </label>
            <button
              onClick={handleLoadSample}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Paste Sample BCBP
            </button>
          </div>

          <textarea
            rows={3}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste IATA barcode string (e.g. M1PIKE/JAKE AUSMDWWN 0142...) or text confirmation..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />

          <button
            onClick={handleParse}
            disabled={parsing || !rawText.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
          >
            {parsing ? 'Decoding Barcode...' : 'Decode & Extract Flight'}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedFlight && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Flight Detected Successfully
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {parsedFlight.airline} {parsedFlight.flight_number}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold text-sm">
                    {parsedFlight.origin_iata}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono font-bold text-sm">
                    {parsedFlight.dest_iata}
                  </span>
                </div>
                <div className="font-mono text-right text-xs">
                  <div className="font-bold text-white">{(parsedFlight.distance_miles || 0).toLocaleString()} mi</div>
                  {parsedFlight.seat && <div className="text-slate-400 text-[11px]">Seat: {parsedFlight.seat}</div>}
                </div>
              </div>

              <button
                onClick={handleSaveFlight}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {saving ? 'Adding to Logbook...' : 'Add This Flight to Logbook'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
