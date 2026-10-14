import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'globe.gl';
import {
  RotateCw,
  Compass,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// XSS Sanitizer for HTML injected into Globe.gl tooltips
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function GlobeView({ flights = [], selectedFlight = null, onSelectFlight }) {
  const containerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [earthTheme, setEarthTheme] = useState('night'); // 'night' | 'blue-marble'

  // Playback state
  const [showPlayback, setShowPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1 | 2 | 4

  // Sort flights chronologically for playback
  const sortedFlights = useMemo(() => {
    return [...flights].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [flights]);

  // Extract unique airports for points and rings
  const airportsData = useMemo(() => {
    const map = new Map();
    flights.forEach((f) => {
      if (f.origin_iata && f.origin_lat && f.origin_lon) {
        if (!map.has(f.origin_iata)) {
          map.set(f.origin_iata, {
            iata: f.origin_iata,
            name: f.origin_name,
            city: f.origin_city,
            country: f.origin_country,
            lat: f.origin_lat,
            lon: f.origin_lon,
            count: 0
          });
        }
        map.get(f.origin_iata).count += 1;
      }
      if (f.dest_iata && f.dest_lat && f.dest_lon) {
        if (!map.has(f.dest_iata)) {
          map.set(f.dest_iata, {
            iata: f.dest_iata,
            name: f.dest_name,
            city: f.dest_city,
            country: f.dest_country,
            lat: f.dest_lat,
            lon: f.dest_lon,
            count: 0
          });
        }
        map.get(f.dest_iata).count += 1;
      }
    });
    return Array.from(map.values());
  }, [flights]);

  // Build arcs data
  const arcsData = useMemo(() => {
    return flights.map((f) => {
      const isSelected = selectedFlight && selectedFlight.id === f.id;
      return {
        ...f,
        startLat: f.origin_lat,
        startLng: f.origin_lon,
        endLat: f.dest_lat,
        endLng: f.dest_lon,
        color: isSelected ? ['#f59e0b', '#ef4444'] : ['#06b6d4', '#8b5cf6'],
        stroke: isSelected ? 1.6 : 0.7,
        altitude: Math.min(0.45, Math.max(0.12, (f.distance_miles || 2000) / 16000))
      };
    });
  }, [flights, selectedFlight]);

  // Initialize Globe
  useEffect(() => {
    if (!containerRef.current) return;

    // Use WebGL renderer with high performance preference
    const globe = new Globe(containerRef.current, {
      rendererConfig: { antialias: true, powerPreference: 'high-performance' }
    })
      .backgroundColor('rgba(2, 6, 23, 1)')
      .globeImageUrl(
        earthTheme === 'night'
          ? '//unpkg.com/three-globe/example/img/earth-night.jpg'
          : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
      )
      .showAtmosphere(true)
      .atmosphereColor('#38bdf8')
      .atmosphereAltitude(0.18)
      // Arcs
      .arcColor('color')
      .arcStroke('stroke')
      .arcAltitude('altitude')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2400)
      .arcLabel((d) => {
        const safeFlightNum = escapeHtml(d.flight_number || '');
        const safeAirline = escapeHtml(d.airline || '');
        const safeOrigIata = escapeHtml(d.origin_iata || '');
        const safeOrigCity = escapeHtml(d.origin_city || '');
        const safeDestIata = escapeHtml(d.dest_iata || '');
        const safeDestCity = escapeHtml(d.dest_city || '');
        const safeDate = escapeHtml(d.date || '');
        const safeAircraft = escapeHtml(d.aircraft || '');
        const safeFlightClass = escapeHtml(d.flight_class || '');
        const distMiles = (d.distance_miles || 0).toLocaleString();
        const distKm = (d.distance_km || 0).toLocaleString();

        return `
          <div style="background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 10px 14px; font-family: sans-serif; font-size: 13px; color: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.6); backdrop-filter: blur(8px);">
            <div style="font-weight: 700; color: #38bdf8; font-size: 14px; margin-bottom: 4px;">${safeFlightNum} • ${safeAirline}</div>
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${safeOrigIata} (${safeOrigCity}) ➔ ${safeDestIata} (${safeDestCity})</div>
            <div style="color: #94a3b8; font-size: 12px;">📅 ${safeDate} &nbsp;|&nbsp; ✈️ ${distMiles} mi (${distKm} km)</div>
            ${safeAircraft ? `<div style="color: #cbd5e1; font-size: 12px; margin-top: 3px;">🛩️ ${safeAircraft} ${safeFlightClass ? `• ${safeFlightClass}` : ''}</div>` : ''}
          </div>
        `;
      })
      .onArcClick((flight) => {
        if (onSelectFlight) onSelectFlight(flight);
      })
      // Points (Airports)
      .pointsData(airportsData)
      .pointLat('lat')
      .pointLng('lon')
      .pointColor(() => '#38bdf8')
      .pointAltitude(0.01)
      .pointRadius((d) => Math.min(0.5, Math.max(0.18, d.count * 0.05)))
      .pointLabel((d) => {
        const safeIata = escapeHtml(d.iata || '');
        const safeCity = escapeHtml(d.city || '');
        const safeName = escapeHtml(d.name || '');
        const safeCountry = escapeHtml(d.country || '');
        const count = parseInt(d.count, 10) || 0;

        return `
          <div style="background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 6px; padding: 6px 10px; font-family: sans-serif; font-size: 12px; color: #fff;">
            <div style="font-weight: 700; color: #818cf8;">${safeIata} - ${safeCity}</div>
            <div style="color: #94a3b8; font-size: 11px;">${safeName}, ${safeCountry} (${count} connections)</div>
          </div>
        `;
      })
      // Rings for Airport pulses (top 15 major hubs only to keep frame rate silky at 60fps)
      .ringsData(
        airportsData
          .filter((a) => a.count >= 2)
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
      )
      .ringLat('lat')
      .ringLng('lon')
      .ringColor(() => (t) => `rgba(56, 189, 248, ${Math.sqrt(1 - t)})`)
      .ringMaxRadius((d) => Math.min(2.5, Math.max(0.8, d.count * 0.3)))
      .ringPropagationSpeed((d) => Math.min(2.0, Math.max(0.6, d.count * 0.2)))
      .ringRepeatPeriod(1800);

    globe.controls().autoRotate = autoRotate;
    globe.controls().autoRotateSpeed = 0.6;
    globe.pointOfView({ lat: 25, lng: -40, altitude: 2.2 }, 0);

    globeInstanceRef.current = globe;

    const updateSize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          globeInstanceRef.current.width(w);
          globeInstanceRef.current.height(h);
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      if (globeInstanceRef.current) {
        try {
          globeInstanceRef.current._destructor();
        } catch (_) {}
        globeInstanceRef.current = null;
      }
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.globeImageUrl(
        earthTheme === 'night'
          ? '//unpkg.com/three-globe/example/img/earth-night.jpg'
          : '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
      );
    }
  }, [earthTheme]);

  // Update auto-rotation
  useEffect(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.controls().autoRotate = autoRotate && !isPlaying;
    }
  }, [autoRotate, isPlaying]);

  // Update arcs data
  useEffect(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.arcsData(arcsData);
    }
  }, [arcsData]);

  // Update points data
  useEffect(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointsData(airportsData);
      globeInstanceRef.current.ringsData(
        airportsData
          .filter((a) => a.count >= 2)
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
      );
    }
  }, [airportsData]);

  // Auto-focus on selected flight
  useEffect(() => {
    if (!globeInstanceRef.current || !selectedFlight) return;

    const { origin_lat, origin_lon, dest_lat, dest_lon, distance_miles } = selectedFlight;
    if (origin_lat && dest_lat) {
      const midLat = (origin_lat + dest_lat) / 2;
      let midLng = (origin_lon + dest_lon) / 2;
      if (Math.abs(origin_lon - dest_lon) > 180) {
        midLng = ((midLng + 180) % 360) - 180;
      }
      const altitude = Math.min(2.8, Math.max(1.3, (distance_miles || 3000) / 3500));
      globeInstanceRef.current.pointOfView({ lat: midLat, lng: midLng, altitude }, 1400);
    }
  }, [selectedFlight]);

  // Chronological Playback Loop
  useEffect(() => {
    if (!isPlaying || sortedFlights.length === 0) return;

    const intervalTime = Math.max(400, 2200 / playbackSpeed);
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = (prev + 1) % sortedFlights.length;
        const flight = sortedFlights[next];
        if (flight && onSelectFlight) {
          onSelectFlight(flight);
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, sortedFlights, playbackSpeed, onSelectFlight]);

  const handleResetView = () => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointOfView({ lat: 25, lng: -40, altitude: 2.2 }, 1000);
    }
  };

  const handleZoom = (delta) => {
    if (globeInstanceRef.current) {
      const current = globeInstanceRef.current.pointOfView();
      const newAlt = Math.max(0.6, Math.min(4.5, current.altitude + delta));
      globeInstanceRef.current.pointOfView({ ...current, altitude: newAlt }, 400);
    }
  };

  const currentPlayingFlight = sortedFlights[playbackIndex] || selectedFlight;

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/80 shadow-2xl">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Interactive Controls (Top Right) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-lg">
        {/* Playback Toggle */}
        <button
          onClick={() => {
            setShowPlayback(!showPlayback);
            if (!showPlayback) setIsPlaying(true);
            else setIsPlaying(false);
          }}
          title={showPlayback ? 'Close Flight Playback' : 'Launch Chronological Playback'}
          className={`p-2 rounded-lg transition-all text-xs flex items-center justify-center ${
            showPlayback
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? 'Pause Rotation' : 'Enable Auto-Rotation'}
          className={`p-2 rounded-lg transition-all text-xs flex items-center justify-center ${
            autoRotate
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        </button>

        <button
          onClick={handleResetView}
          title="Reset Globe View"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-xs flex items-center justify-center"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowLabels(!showLabels)}
          title={showLabels ? 'Hide Airport Labels' : 'Show Airport Labels'}
          className={`p-2 rounded-lg transition-all text-xs flex items-center justify-center ${
            showLabels
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>

        <div className="w-full h-[1px] bg-slate-800 my-0.5" />

        <button
          onClick={() => handleZoom(-0.5)}
          title="Zoom In"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleZoom(0.5)}
          title="Zoom Out"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={() => setEarthTheme(earthTheme === 'night' ? 'blue-marble' : 'night')}
          title={`Switch to ${earthTheme === 'night' ? 'Day' : 'Night'} Texture`}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center justify-center"
        >
          {earthTheme === 'night' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Chronological Flight Playback Floating Bar (Bottom Center) */}
      {showPlayback && sortedFlights.length > 0 && (
        <div className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-lg bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-cyan-500/40 shadow-2xl flex flex-col gap-2">
          {/* Active Flight Info Banner */}
          {currentPlayingFlight && (
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200 truncate">
                <span className="text-amber-400">{currentPlayingFlight.origin_iata}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="text-amber-400">{currentPlayingFlight.dest_iata}</span>
                <span className="text-slate-400 text-[11px] truncate font-sans ml-1">
                  {currentPlayingFlight.airline} {currentPlayingFlight.flight_number}
                </span>
              </div>
              <span className="font-mono text-cyan-300 text-[11px] shrink-0 font-bold">
                {currentPlayingFlight.date}
              </span>
            </div>
          )}

          {/* Timeline Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 shrink-0">1</span>
            <input
              type="range"
              min={0}
              max={sortedFlights.length - 1}
              value={playbackIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setPlaybackIndex(idx);
                if (sortedFlights[idx] && onSelectFlight) {
                  onSelectFlight(sortedFlights[idx]);
                }
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              {playbackIndex + 1}/{sortedFlights.length}
            </span>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev = Math.max(0, playbackIndex - 1);
                  setPlaybackIndex(prev);
                  if (sortedFlights[prev] && onSelectFlight) onSelectFlight(sortedFlights[prev]);
                }}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                title="Previous Flight"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => {
                  const next = Math.min(sortedFlights.length - 1, playbackIndex + 1);
                  setPlaybackIndex(next);
                  if (sortedFlights[next] && onSelectFlight) onSelectFlight(sortedFlights[next]);
                }}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                title="Next Flight"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
                    playbackSpeed === spd
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowPlayback(false);
                setIsPlaying(false);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition"
            >
              Hide
            </button>
          </div>
        </div>
      )}

      {/* Floating Info Overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800/80 shadow-xl flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>{arcsData.length} Flight Paths</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span>{airportsData.length} Airports Visited</span>
          </div>
          {selectedFlight && (
            <>
              <span className="text-slate-600">|</span>
              <div className="text-amber-400 font-medium truncate max-w-[200px]">
                {selectedFlight.origin_iata} ➔ {selectedFlight.dest_iata}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
