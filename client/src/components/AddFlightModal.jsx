import React, { useState, useEffect, useRef } from 'react';
import { X, Plane, Calendar, MapPin, Search, ArrowRight, Check, AlertCircle, Sparkles } from 'lucide-react';
import { searchAirports, lookupFlightNumber, addFlight } from '../api';
import confetti from 'canvas-confetti';

export default function AddFlightModal({ isOpen, onClose, onFlightAdded }) {
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [airlineCode, setAirlineCode] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Origin
  const [originSearch, setOriginSearch] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  // Destination
  const [destSearch, setDestSearch] = useState('');
  const [selectedDest, setSelectedDest] = useState(null);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Extra details
  const [aircraft, setAircraft] = useState('');
  const [flightClass, setFlightClass] = useState('Economy');
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');
  const [addReturnTrip, setAddReturnTrip] = useState(false);
  const [returnDate, setReturnDate] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  // Debounced flight number lookup
  useEffect(() => {
    if (!flightNumber.trim() || flightNumber.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await lookupFlightNumber(flightNumber.trim());
        if (res.airlineName && !airline) {
          setAirline(res.airlineName);
        }
        if (res.airlineCode) {
          setAirlineCode(res.airlineCode);
        }
        // If route suggestion exists and user hasn't selected yet
        if (res.suggestedOrigin && !selectedOrigin) {
          const originRes = await searchAirports(res.suggestedOrigin);
          if (originRes.length > 0) {
            setSelectedOrigin(originRes[0]);
            setOriginSearch(`${originRes[0].iata} - ${originRes[0].city}`);
          }
        }
        if (res.suggestedDest && !selectedDest) {
          const destRes = await searchAirports(res.suggestedDest);
          if (destRes.length > 0) {
            setSelectedDest(destRes[0]);
            setDestSearch(`${destRes[0].iata} - ${destRes[0].city}`);
          }
        }
        if (res.suggestedAircraft && !aircraft) {
          setAircraft(res.suggestedAircraft);
        }
      } catch (e) {
        console.error('Flight lookup error:', e);
      } finally {
        setLookupLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [flightNumber]);

  // Search origin airports
  useEffect(() => {
    if (!showOriginDropdown) return;
    const timer = setTimeout(async () => {
      try {
        const results = await searchAirports(originSearch);
        setOriginSuggestions(results);
      } catch (err) {
        console.error('Error searching origin:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [originSearch, showOriginDropdown]);

  // Search dest airports
  useEffect(() => {
    if (!showDestDropdown) return;
    const timer = setTimeout(async () => {
      try {
        const results = await searchAirports(destSearch);
        setDestSuggestions(results);
      } catch (err) {
        console.error('Error searching dest:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [destSearch, showDestDropdown]);

  // Calculate Great Circle Distance in real-time
  useEffect(() => {
    if (selectedOrigin && selectedDest) {
      const R = 3958.8; // Radius in miles
      const dLat = ((selectedDest.lat - selectedOrigin.lat) * Math.PI) / 180;
      const dLon = ((selectedDest.lon - selectedOrigin.lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((selectedOrigin.lat * Math.PI) / 180) *
          Math.cos((selectedDest.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const miles = Math.round(R * c);
      const km = Math.round(miles * 1.609344);
      const estHours = (miles / 500).toFixed(1);
      setCalculatedDistance({ miles, km, estHours });
    } else {
      setCalculatedDistance(null);
    }
  }, [selectedOrigin, selectedDest]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!flightNumber.trim()) {
      setError('Please enter a flight number (e.g., UA 895, BA 178)');
      return;
    }
    if (!selectedOrigin) {
      setError('Please select an origin departure airport');
      return;
    }
    if (!selectedDest) {
      setError('Please select a destination arrival airport');
      return;
    }
    if (selectedOrigin.iata === selectedDest.iata) {
      setError('Origin and destination cannot be the same airport');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        flight_number: flightNumber.trim().toUpperCase(),
        airline: airline.trim() || undefined,
        airline_code: airlineCode || undefined,
        date,
        origin_iata: selectedOrigin.iata,
        dest_iata: selectedDest.iata,
        aircraft: aircraft.trim() || undefined,
        flight_class: flightClass,
        seat: seat.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const newFlight = await addFlight(payload);

      // Add return flight if requested
      if (addReturnTrip && returnDate) {
        await addFlight({
          flight_number: `${flightNumber.trim().toUpperCase()} Return`,
          airline: airline.trim() || undefined,
          airline_code: airlineCode || undefined,
          date: returnDate,
          origin_iata: selectedDest.iata,
          dest_iata: selectedOrigin.iata,
          aircraft: aircraft.trim() || undefined,
          flight_class: flightClass,
          seat: seat.trim() || undefined,
          notes: notes ? `Return: ${notes}` : 'Return trip'
        });
      }

      // Celebrate with confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (_) {}

      if (onFlightAdded) onFlightAdded(newFlight);
      handleResetAndClose();
    } catch (err) {
      setError(err.message || 'Failed to add flight');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setFlightNumber('');
    setAirline('');
    setAirlineCode('');
    setSelectedOrigin(null);
    setSelectedDest(null);
    setOriginSearch('');
    setDestSearch('');
    setAircraft('');
    setNotes('');
    setSeat('');
    setAddReturnTrip(false);
    setReturnDate('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log New Flight</h2>
              <p className="text-xs text-slate-400">Record a flight to update your global map & stats</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Flight Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Flight Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. UA 895, BA 178"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm uppercase tracking-wider font-mono font-medium"
                  required
                />
                {lookupLoading && (
                  <div className="absolute right-3 top-3 text-xs text-cyan-400 animate-spin">⟳</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Flight Date <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-400 text-sm font-sans"
                  required
                />
              </div>
            </div>
          </div>

          {/* Airline Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Airline</label>
              {airline && (
                <span className="text-[11px] text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-detected
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. United Airlines, British Airways"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm"
            />
          </div>

          {/* Route: Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin Airport */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Departure Airport (Origin) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Search IATA or City (e.g. SFO)"
                value={originSearch}
                onFocus={() => setShowOriginDropdown(true)}
                onChange={(e) => {
                  setOriginSearch(e.target.value);
                  setShowOriginDropdown(true);
                  if (selectedOrigin && e.target.value !== selectedOrigin.iata) {
                    setSelectedOrigin(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none ${
                  selectedOrigin ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-700 focus:border-cyan-400'
                }`}
              />
              {selectedOrigin && (
                <div className="mt-1 text-[11px] text-cyan-400 flex items-center gap-1 truncate font-mono">
                  ✓ {selectedOrigin.name} ({selectedOrigin.country})
                </div>
              )}

              {/* Suggestions Dropdown */}
              {showOriginDropdown && originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 divide-y divide-slate-800">
                  {originSuggestions.map((a) => (
                    <div
                      key={a.iata}
                      onClick={() => {
                        setSelectedOrigin(a);
                        setOriginSearch(`${a.iata} - ${a.city}`);
                        setShowOriginDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px]">
                            {a.iata}
                          </span>
                          <span>{a.city}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{a.name}</div>
                      </div>
                      <div className="text-[10px] text-slate-500">{a.country}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Airport */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Arrival Airport (Destination) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Search IATA or City (e.g. LHR)"
                value={destSearch}
                onFocus={() => setShowDestDropdown(true)}
                onChange={(e) => {
                  setDestSearch(e.target.value);
                  setShowDestDropdown(true);
                  if (selectedDest && e.target.value !== selectedDest.iata) {
                    setSelectedDest(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none ${
                  selectedDest ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-slate-700 focus:border-cyan-400'
                }`}
              />
              {selectedDest && (
                <div className="mt-1 text-[11px] text-cyan-400 flex items-center gap-1 truncate font-mono">
                  ✓ {selectedDest.name} ({selectedDest.country})
                </div>
              )}

              {/* Suggestions Dropdown */}
              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 divide-y divide-slate-800">
                  {destSuggestions.map((a) => (
                    <div
                      key={a.iata}
                      onClick={() => {
                        setSelectedDest(a);
                        setDestSearch(`${a.iata} - ${a.city}`);
                        setShowDestDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px]">
                            {a.iata}
                          </span>
                          <span>{a.city}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{a.name}</div>
                      </div>
                      <div className="text-[10px] text-slate-500">{a.country}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live Calculated Distance Badge */}
          {calculatedDistance && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-cyan-300">{selectedOrigin.iata}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono font-bold text-indigo-300">{selectedDest.iata}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-white text-sm">
                  {calculatedDistance.miles.toLocaleString()} miles
                </span>{' '}
                <span className="text-slate-400">({calculatedDistance.km.toLocaleString()} km)</span>
                <span className="text-slate-500 ml-2">~{calculatedDistance.estHours}h flying</span>
              </div>
            </div>
          )}

          {/* Optional Details: Aircraft, Class, Seat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Aircraft</label>
              <input
                type="text"
                placeholder="e.g. Boeing 777-300ER"
                value={aircraft}
                onChange={(e) => setAircraft(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cabin Class</label>
              <select
                value={flightClass}
                onChange={(e) => setFlightClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="Economy">Economy</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Business">Business</option>
                <option value="First">First</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Seat Number</label>
              <input
                type="text"
                placeholder="e.g. 14A"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-400 font-mono uppercase"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / Memories</label>
            <input
              type="text"
              placeholder="e.g. Summer vacation with family, great sunset above clouds"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Add Return Trip Checkbox */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={addReturnTrip}
                onChange={(e) => setAddReturnTrip(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
              />
              <span>Also log return flight ({selectedDest?.iata || 'DEST'} ➔ {selectedOrigin?.iata || 'ORIGIN'})</span>
            </label>
            {addReturnTrip && (
              <div className="mt-2 pl-6">
                <label className="block text-[11px] text-slate-400 mb-1">Return Flight Date</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
                  required={addReturnTrip}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plane className="w-3.5 h-3.5" />
                  Log Flight
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

