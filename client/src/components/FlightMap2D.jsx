import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Plane,
  ArrowRight,
  Crosshair
} from 'lucide-react';

// Great circle arc calculation between two lat/lon coordinates
function getGreatCirclePoints(lat1, lon1, lat2, lon2, numPoints = 50) {
  const points = [];
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const phi1 = lat1 * toRad;
  const lambda1 = lon1 * toRad;
  const phi2 = lat2 * toRad;
  const lambda2 = lon2 * toRad;

  const deltaLambda = lambda2 - lambda1;
  const cosDeltaLambda = Math.cos(deltaLambda);
  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const sinPhi2 = Math.sin(phi2);
  const cosPhi2 = Math.cos(phi2);

  const d = Math.acos(
    Math.min(1, Math.max(-1, sinPhi1 * sinPhi2 + cosPhi1 * cosPhi2 * cosDeltaLambda))
  );

  if (d === 0 || isNaN(d)) {
    return [[lat1, lon1], [lat2, lon2]];
  }

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * cosPhi1 * Math.cos(lambda1) + B * cosPhi2 * Math.cos(lambda2);
    const y = A * cosPhi1 * Math.sin(lambda1) + B * cosPhi2 * Math.sin(lambda2);
    const z = A * sinPhi1 + B * sinPhi2;

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg;
    const lon = Math.atan2(y, x) * toDeg;

    points.push([lat, lon]);
  }

  return points;
}

// Split coordinates at international date line to avoid cross-globe horizontal lines
function splitAntimeridian(points) {
  const segments = [];
  let current = [];

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      const prevLon = points[i - 1][1];
      const curLon = points[i][1];
      if (Math.abs(curLon - prevLon) > 180) {
        if (current.length > 0) segments.push(current);
        current = [];
      }
    }
    current.push(points[i]);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

// XSS Sanitizer for HTML injected into Leaflet tooltips & popups
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function FlightMap2D({ flights = [], selectedFlight = null, onSelectFlight }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const routesLayerGroupRef = useRef(null);
  const airportsLayerGroupRef = useRef(null);

  const [mapTheme, setMapTheme] = useState('dark'); // 'dark' | 'satellite' | 'voyager'
  const [showAirportLabels, setShowAirportLabels] = useState(true);

  // Basemap tile definitions
  const tileSources = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  };

  // Extract unique airports for pin markers
  const uniqueAirports = useMemo(() => {
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
        map.get(f.origin_iata).count++;
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
        map.get(f.dest_iata).count++;
      }
    });
    return Array.from(map.values());
  }, [flights]);

  // 1. Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create map with initial center over North America / Atlantic
    const map = L.map(mapContainerRef.current, {
      center: [28, -40],
      zoom: 2.5,
      minZoom: 1.5,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true
    });

    // Basemap Layer
    const tileLayer = L.tileLayer(tileSources[mapTheme], {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for flights and markers
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    airportsLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Auto-fit initial bounds to flight routes
    if (flights.length > 0) {
      const validPoints = flights
        .filter((f) => f.origin_lat && f.origin_lon && f.dest_lat && f.dest_lon)
        .flatMap((f) => [[f.origin_lat, f.origin_lon], [f.dest_lat, f.dest_lon]]);

      if (validPoints.length > 0) {
        try {
          const bounds = L.latLngBounds(validPoints);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
        } catch (_) {}
      }
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update basemap tile when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(tileSources[mapTheme]);
  }, [mapTheme]);

  // 3. Render Flight Routes & Airport Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routesGroup = routesLayerGroupRef.current;
    const airportsGroup = airportsLayerGroupRef.current;
    if (!map || !routesGroup || !airportsGroup) return;

    routesGroup.clearLayers();
    airportsGroup.clearLayers();

    // Draw Flight Routes (Curved Great-Circle Geodesics)
    flights.forEach((f) => {
      if (!f.origin_lat || !f.origin_lon || !f.dest_lat || !f.dest_lon) return;

      const isSelected = selectedFlight && selectedFlight.id === f.id;
      const rawPoints = getGreatCirclePoints(f.origin_lat, f.origin_lon, f.dest_lat, f.dest_lon);
      const segments = splitAntimeridian(rawPoints);

      segments.forEach((seg) => {
        const polyline = L.polyline(seg, {
          color: isSelected ? '#f59e0b' : '#06b6d4',
          weight: isSelected ? 3.5 : 1.8,
          opacity: isSelected ? 0.95 : 0.6,
          dashArray: isSelected ? null : undefined,
          lineCap: 'round',
          lineJoin: 'round'
        });

        // Hover Tooltip with flight info
        const flightLabel = escapeHtml(f.flight_number || (f.airline_code ? f.airline_code + ' Flight' : 'Flight'));
        const origLabel = escapeHtml(f.origin_iata);
        const destLabel = escapeHtml(f.dest_iata);
        const airlineLabel = escapeHtml(f.airline || '');
        const distanceStr = (f.distance_miles || 0).toLocaleString();

        const tooltipContent = `
          <div style="font-family: ui-sans-serif, system-ui; font-size: 11px; padding: 2px 4px;">
            <div style="font-weight: 800; color: #06b6d4; font-family: monospace;">${flightLabel}</div>
            <div style="color: #ffffff; font-weight: 700; margin-top: 1px;">
              ${origLabel} <span style="color: #94a3b8;">➔</span> ${destLabel}
            </div>
            <div style="color: #94a3b8; font-size: 10px; margin-top: 1px;">
              ${airlineLabel} • ${distanceStr} mi
            </div>
          </div>
        `;

        polyline.bindTooltip(tooltipContent, {
          sticky: true,
          className: 'aero-leaflet-tooltip'
        });

        // Hover and Click Handlers
        polyline.on('mouseover', () => {
          if (!isSelected) {
            polyline.setStyle({
              color: '#38bdf8',
              weight: 3,
              opacity: 0.9
            });
          }
        });

        polyline.on('mouseout', () => {
          if (!isSelected) {
            polyline.setStyle({
              color: '#06b6d4',
              weight: 1.8,
              opacity: 0.6
            });
          }
        });

        polyline.on('click', () => {
          if (onSelectFlight) onSelectFlight(f);
        });

        routesGroup.addLayer(polyline);
      });
    });

    // Draw Airport Markers
    uniqueAirports.forEach((apt) => {
      if (!apt.lat || !apt.lon) return;

      const isConnectedToSelected =
        selectedFlight &&
        (selectedFlight.origin_iata === apt.iata || selectedFlight.dest_iata === apt.iata);

      const safeIata = escapeHtml(apt.iata);
      const safeCity = escapeHtml(apt.city || apt.name || '');
      const safeCountry = escapeHtml(apt.country || '');

      const markerHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
        ">
          <div style="
            width: ${isConnectedToSelected ? '12px' : '8px'};
            height: ${isConnectedToSelected ? '12px' : '8px'};
            background-color: ${isConnectedToSelected ? '#f59e0b' : '#38bdf8'};
            border-radius: 50%;
            border: 2px solid ${isConnectedToSelected ? '#ffffff' : '#0f172a'};
            box-shadow: 0 0 8px ${isConnectedToSelected ? 'rgba(245, 158, 11, 0.9)' : 'rgba(56, 189, 248, 0.7)'};
          "></div>
          ${
            showAirportLabels
              ? `<span style="
                  position: absolute;
                  top: -14px;
                  left: 8px;
                  font-family: monospace;
                  font-size: 9px;
                  font-weight: 800;
                  color: ${isConnectedToSelected ? '#fef08a' : '#cbd5e1'};
                  background-color: rgba(15, 23, 42, 0.75);
                  padding: 1px 3px;
                  border-radius: 4px;
                  white-space: nowrap;
                  border: 1px solid rgba(51, 65, 85, 0.4);
                  pointer-events: none;
                ">${safeIata}</span>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-airport-pin',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([apt.lat, apt.lon], { icon: customIcon });

      const popupContent = `
        <div style="font-family: ui-sans-serif, system-ui; font-size: 11px; padding: 2px;">
          <div style="font-weight: 800; font-size: 13px; color: #38bdf8; font-family: monospace;">${safeIata}</div>
          <div style="font-weight: 700; color: #ffffff;">${safeCity}</div>
          <div style="color: #94a3b8; font-size: 10px;">${safeCountry}</div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #334155; font-size: 10px; color: #cbd5e1;">
            <b>${parseInt(apt.count, 10) || 0}</b> visits logged
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'aero-leaflet-popup'
      });

      airportsGroup.addLayer(marker);
    });
  }, [flights, selectedFlight, uniqueAirports, showAirportLabels]);

  // Center on selected flight when it changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedFlight) return;
    if (!selectedFlight.origin_lat || !selectedFlight.dest_lat) return;

    try {
      const lat1 = selectedFlight.origin_lat;
      const lon1 = selectedFlight.origin_lon;
      const lat2 = selectedFlight.dest_lat;
      const lon2 = selectedFlight.dest_lon;

      if (Math.abs(lon1 - lon2) > 180) {
        // Crosses antimeridian: center on mid-latitude and wrap longitude
        const midLat = (lat1 + lat2) / 2;
        let midLon = (lon1 + lon2) / 2;
        if (midLon > 0) midLon -= 180;
        else midLon += 180;
        map.setView([midLat, midLon], 3, { animate: true, duration: 0.8 });
      } else {
        const bounds = L.latLngBounds([
          [lat1, lon1],
          [lat2, lon2]
        ]);
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 7, animate: true, duration: 0.8 });
      }
    } catch (_) {}
  }, [selectedFlight]);

  // Reset view to encompass all logged flights
  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || flights.length === 0) return;

    const validPoints = flights
      .filter((f) => f.origin_lat && f.dest_lat)
      .flatMap((f) => [[f.origin_lat, f.origin_lon], [f.dest_lat, f.dest_lon]]);

    if (validPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(validPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6, animate: true });
      } catch (_) {}
    }
  };

  const handleZoom = (delta) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  };

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl bg-slate-950 overflow-hidden shadow-2xl">
      {/* Leaflet DOM Node */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Interactive Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-xl">
        {/* Reset View Bounds */}
        <button
          onClick={handleResetBounds}
          title="Fit All Logged Flights into View"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs flex items-center justify-center"
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => handleZoom(1)}
          title="Zoom In"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoom(-1)}
          title="Zoom Out"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Toggle Airport Labels */}
        <button
          onClick={() => setShowAirportLabels(!showAirportLabels)}
          title={showAirportLabels ? 'Hide Airport Labels' : 'Show Airport Labels'}
          className={`p-2 rounded-lg transition text-xs flex items-center justify-center ${
            showAirportLabels
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span className="font-mono text-[10px] font-bold">IATA</span>
        </button>

        <div className="w-full h-[1px] bg-slate-800 my-0.5" />

        {/* Theme Switcher: Dark / Satellite / Street */}
        <button
          onClick={() => {
            const nextTheme = mapTheme === 'dark' ? 'satellite' : mapTheme === 'satellite' ? 'voyager' : 'dark';
            setMapTheme(nextTheme);
          }}
          title={`Switch Map Texture (Current: ${mapTheme})`}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-[11px] font-bold flex items-center justify-center"
        >
          {mapTheme === 'dark' ? '🌙' : mapTheme === 'satellite' ? '🛰️' : '🗺️'}
        </button>
      </div>

      {/* Selected Flight Floating Card (Bottom Center) */}
      {selectedFlight && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-amber-500/40 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white">
                {selectedFlight.origin_iata} <span className="text-amber-400">➔</span> {selectedFlight.dest_iata}
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                {selectedFlight.flight_number || selectedFlight.airline}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{selectedFlight.origin_city} to {selectedFlight.dest_city}</span>
              <span>•</span>
              <span className="font-mono">{(selectedFlight.distance_miles || 0).toLocaleString()} mi</span>
            </div>
          </div>
          <button
            onClick={() => onSelectFlight && onSelectFlight(null)}
            className="text-slate-500 hover:text-slate-300 text-xs px-1.5 py-0.5 ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Custom Styles for Leaflet Popups and Tooltips */}
      <style>{`
        .aero-leaflet-tooltip {
          background-color: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(56, 189, 248, 0.4) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7) !important;
          color: #f8fafc !important;
          backdrop-filter: blur(8px) !important;
        }
        .aero-leaflet-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.95) !important;
        }
        .aero-leaflet-popup .leaflet-popup-content-wrapper {
          background-color: rgba(15, 23, 42, 0.95) !important;
          border: 1px solid rgba(51, 65, 85, 0.7) !important;
          border-radius: 14px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.8) !important;
          backdrop-filter: blur(12px) !important;
        }
        .aero-leaflet-popup .leaflet-popup-tip {
          background-color: rgba(15, 23, 42, 0.95) !important;
        }
        .custom-airport-pin {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
