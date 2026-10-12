import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ─── Theme constants ──────────────────────────────────────────────────────────
const YELLOW = '#F9EB4F'; // SafMove primary theme color
const DARK   = '#111827'; // Dark background accent
const ACCRA_CENTER: [number, number] = [-0.1870, 5.6037]; // [lng, lat] for Mapbox

// ─── Keyframe ripple animation for vehicle marker ─────────────────────────────
const RIPPLE_STYLE = `
@keyframes safmove-mapbox-ripple {
  0%   { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(2.8); opacity: 0;   }
}
.safmove-mb-ripple-ring {
  position: absolute;
  border-radius: 50%;
  background: ${YELLOW};
  animation: safmove-mapbox-ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  pointer-events: none;
}
.safmove-mb-ripple-ring:nth-child(2) { animation-delay: 0.65s; }
.safmove-mb-ripple-ring:nth-child(3) { animation-delay: 1.3s;  }
`;

let styleInjected = false;
const injectRippleStyle = () => {
  if (styleInjected) return;
  const styleEl = document.createElement('style');
  styleEl.textContent = RIPPLE_STYLE;
  document.head.appendChild(styleEl);
  styleInjected = true;
};

// ─── Waypoint generator along Accra street grid ───────────────────────────────
// Provides realistic road-following coordinates between Circle and East Legon
const getStreetGridRoute = (
  start: [number, number],
  end: [number, number]
): [number, number][] => {
  // If coordinates match default demo (Circle -> East Legon), return street-accurate road path
  const isCircle = Math.abs(start[0] - (-0.2073)) < 0.01 && Math.abs(start[1] - 5.5718) < 0.01;
  const isEastLegon = Math.abs(end[0] - (-0.1680)) < 0.01 && Math.abs(end[1] - 5.6352) < 0.01;

  if (isCircle && isEastLegon) {
    return [
      [-0.2073, 5.5718], // Kwame Nkrumah Circle
      [-0.2012, 5.5750], // Circle Interchange ramp
      [-0.1945, 5.5802], // Ring Road Central
      [-0.1901, 5.5865], // Liberation Rd onto 37 Military Hospital
      [-0.1865, 5.5940], // 37 Roundabout
      [-0.1840, 5.6020], // Liberation Rd towards Airport
      [-0.1815, 5.6095], // Kotoka Bypass / Shangri-La
      [-0.1780, 5.6175], // Airport Hills junction
      [-0.1742, 5.6240], // Tetteh Quarshie Interchange
      [-0.1705, 5.6295], // Legon Bypass / American House entry
      [-0.1680, 5.6352], // East Legon – American House
    ];
  }

  // Generic intermediate grid turn for any pair of coordinates
  const midLng = (start[0] + end[0]) / 2;
  return [
    start,
    [start[0], (start[1] + end[1]) / 2],
    [midLng, (start[1] + end[1]) / 2],
    [end[0], (start[1] + end[1]) / 2],
    end,
  ];
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface MapLocation {
  lat: number;
  lng: number;
  name?: string;
}

export interface MapboxMapProps {
  center?: [number, number]; // [lng, lat] or [lat, lng]
  zoom?: number;
  pickup?:  MapLocation;
  dropoff?: MapLocation;
  driver?:  MapLocation;
  drivers?: any[];
  showRoute?: boolean;
  className?: string;
  // Trip card props (anchored to bottom)
  departure?:   string;
  returnTime?:  string;
  ticketPrice?: string;
  onTicketPress?: () => void;
}

// ─── Bottom Trip Card Component ───────────────────────────────────────────────
interface TripCardProps {
  pickupName:    string;
  dropoffName:   string;
  departure?:    string;
  returnTime?:   string;
  ticketPrice?:  string;
  onTicketPress?: () => void;
}

const BottomTripCard: React.FC<TripCardProps> = ({
  pickupName,
  dropoffName,
  departure  = '08:45 AM',
  returnTime = '12:15 PM',
  ticketPrice = 'GH₵ 24.00 · View Ticket',
  onTicketPress,
}) => (
  <aside
    aria-label="Trip details and ticket purchase"
    className="absolute bottom-0 inset-x-0 z-30 px-4 pb-5 pt-0 pointer-events-none"
  >
    <div
      className="max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl pointer-events-auto border border-white/10"
      style={{ background: DARK }}
    >
      {/* Yellow accent top strip */}
      <div style={{ height: 4, background: YELLOW }} />

      <div className="p-4 space-y-3.5">
        {/* From / To locations */}
        <div className="space-y-2">
          {/* Pickup row */}
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: YELLOW, color: DARK }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">From</p>
              <p className="text-sm font-bold text-white truncate">{pickupName}</p>
            </div>
            <span className="text-white/20 text-lg">›</span>
          </div>

          {/* Dotted connector */}
          <div className="ml-4 flex items-center">
            <div className="w-0 border-l-2 border-dashed border-white/20 h-4 ml-[15px]" />
          </div>

          {/* Dropoff row */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-white/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5" fill={YELLOW} stroke="none"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">To</p>
              <p className="text-sm font-bold text-white truncate">{dropoffName}</p>
            </div>
            <span className="text-white/20 text-lg">›</span>
          </div>
        </div>

        {/* Departure & Arrival Time Badges */}
        <div
          className="flex items-center rounded-2xl overflow-hidden divide-x divide-white/10"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 flex flex-col items-center py-2.5 px-3">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Departure</p>
            <p className="text-sm font-extrabold text-white mt-0.5">{departure}</p>
          </div>
          <div className="flex-1 flex flex-col items-center py-2.5 px-3">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Arrival</p>
            <p className="text-sm font-extrabold text-white mt-0.5">{returnTime}</p>
          </div>
        </div>

        {/* Austrian allowance info text */}
        <p className="text-[11px] text-white/35 text-center leading-relaxed">
          Austrian allowance regulations apply · Verified SafMove riders only
        </p>

        {/* Ticket price button (white on black/dark) */}
        <button
          onClick={onTicketPress}
          className="w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg cursor-pointer"
          style={{ background: 'white', color: DARK }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.2" strokeLinecap="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
            <path d="M13 5v2M13 17v2M13 11v2" strokeDasharray="2 2"/>
          </svg>
          {ticketPrice}
        </button>
      </div>
    </div>
  </aside>
);

// ─── Main MapboxMap Component ─────────────────────────────────────────────────
export const MapboxMap: React.FC<MapboxMapProps> = ({
  center,
  zoom = 13,
  pickup,
  dropoff,
  driver,
  drivers = [],
  showRoute = true,
  className = '',
  departure = '08:45 AM',
  returnTime = '12:15 PM',
  ticketPrice,
  onTicketPress,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Normalize center coordinate: Mapbox expects [lng, lat]
  const initialCenter: [number, number] = React.useMemo(() => {
    if (!center) return ACCRA_CENTER;
    // If first coordinate is positive (latitude ~5.6) and second is negative (longitude ~ -0.18), swap them
    if (center[0] > 1 && center[1] < 1) {
      return [center[1], center[0]];
    }
    return [center[0], center[1]];
  }, [center]);

  // 1. Initialize Mapbox GL JS map
  useEffect(() => {
    injectRippleStyle();

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      setTokenError('VITE_MAPBOX_TOKEN is missing in environment variables.');
      return;
    }

    mapboxgl.accessToken = token;

    if (!mapContainerRef.current) return;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Clean dark-mode street map
        center: initialCenter,
        zoom: zoom,
        attributionControl: false,
      });

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: true, showZoom: true }),
        'top-right'
      );

      map.on('load', () => {
        setMapLoaded(true);
      });

      map.on('error', (e) => {
        if (e.error?.message?.includes('token') || e.error?.message?.includes('Unauthorized')) {
          setTokenError('Mapbox authentication error. Please verify VITE_MAPBOX_TOKEN.');
        }
      });

      mapRef.current = map;
    } catch (err: any) {
      console.error('Failed to initialize Mapbox:', err);
      setTokenError(err?.message || 'Error initializing Mapbox');
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Manage Markers & Route Line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Remove previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    // Helper: create Pickup 'A' marker
    if (pickup) {
      const pickupEl = document.createElement('div');
      pickupEl.className = 'safmove-marker-pickup';
      pickupEl.style.cssText = `
        background: #059669;
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 13px; color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        cursor: pointer;
      `;
      pickupEl.textContent = 'A';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(
        pickup.name || 'Pickup Point'
      );

      const marker = new mapboxgl.Marker({ element: pickupEl, anchor: 'center' })
        .setLngLat([pickup.lng, pickup.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([pickup.lng, pickup.lat]);
      hasBounds = true;
    }

    // Helper: create Dropoff 'B' marker
    if (dropoff) {
      const dropoffEl = document.createElement('div');
      dropoffEl.className = 'safmove-marker-dropoff';
      dropoffEl.style.cssText = `
        background: ${DARK};
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 3px solid ${YELLOW};
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 13px; color: ${YELLOW};
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        cursor: pointer;
      `;
      dropoffEl.textContent = 'B';

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(
        dropoff.name || 'Dropoff Destination'
      );

      const marker = new mapboxgl.Marker({ element: dropoffEl, anchor: 'center' })
        .setLngLat([dropoff.lng, dropoff.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([dropoff.lng, dropoff.lat]);
      hasBounds = true;
    }

    // Helper: Live vehicle marker with pulsating yellow concentric ripple circles
    if (driver) {
      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'safmove-live-vehicle-marker';
      vehicleEl.style.cssText =
        'position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; cursor: pointer;';
      vehicleEl.innerHTML = `
        <div class="safmove-mb-ripple-ring" style="width:68px;height:68px;top:0;left:0;"></div>
        <div class="safmove-mb-ripple-ring" style="width:68px;height:68px;top:0;left:0;"></div>
        <div class="safmove-mb-ripple-ring" style="width:68px;height:68px;top:0;left:0;"></div>
        <div style="
          position: relative; z-index: 10;
          width: 42px; height: 42px; border-radius: 50%;
          background: white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 3px ${YELLOW}, 0 4px 18px rgba(0,0,0,0.65);
        ">
          <!-- Top-down car icon -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="${DARK}" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 17h10v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V17z"/>
            <path d="M5 11l2-5h10l2 5H5z"/>
            <rect x="5" y="11" width="14" height="7" rx="1.5"/>
            <rect x="6" y="13" width="3.5" height="2.5" rx=".5" fill="white"/>
            <rect x="14.5" y="13" width="3.5" height="2.5" rx=".5" fill="white"/>
            <rect x="6" y="8" width="5" height="3" rx=".5" fill="white" opacity=".6"/>
            <rect x="13" y="8" width="5" height="3" rx=".5" fill="white" opacity=".6"/>
            <circle cx="8" cy="19" r="1.5" fill="${DARK}"/>
            <circle cx="16" cy="19" r="1.5" fill="${DARK}"/>
          </svg>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(
        driver.name || 'Live SafMove Vehicle'
      );

      const marker = new mapboxgl.Marker({ element: vehicleEl, anchor: 'center' })
        .setLngLat([driver.lng, driver.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([driver.lng, driver.lat]);
      hasBounds = true;
    }

    // Helper: Additional fleet drivers
    drivers.forEach((d) => {
      const dLng = d.longitude ?? d.lng;
      const dLat = d.latitude ?? d.lat;
      if (!dLng || !dLat) return;

      const riderEl = document.createElement('div');
      riderEl.style.cssText = `
        background: #047857; width: 30px; height: 30px; border-radius: 50%;
        border: 2px solid white; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;
      `;
      riderEl.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      `;

      const marker = new mapboxgl.Marker({ element: riderEl, anchor: 'center' })
        .setLngLat([dLng, dLat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 3. Render thick, continuous, bright yellow route line following street grid
    if (showRoute && pickup && dropoff) {
      const routeCoordinates = getStreetGridRoute(
        [pickup.lng, pickup.lat],
        [dropoff.lng, dropoff.lat]
      );

      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates,
        },
      };

      const sourceId = 'safmove-route-source';
      const glowLayerId = 'safmove-route-glow';
      const lineLayerId = 'safmove-route-line';

      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;

      if (existingSource) {
        existingSource.setData(geojson);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        // Yellow subtle route glow
        map.addLayer({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': YELLOW,
            'line-width': 14,
            'line-opacity': 0.35,
            'line-blur': 4,
          },
        });

        // Thick, continuous bright yellow primary route line (8px)
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': YELLOW,
            'line-width': 8,
            'line-opacity': 1,
          },
        });
      }
    }

    // 4. Fit bounds smoothly if multiple points are present
    if (hasBounds) {
      try {
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: ticketPrice ? 240 : 80, left: 50, right: 50 },
          maxZoom: 15,
          duration: 1200,
        });
      } catch (_) {
        // bounds fit fallback
      }
    }
  }, [mapLoaded, pickup, dropoff, driver, drivers, showRoute, ticketPrice]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Map container element */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ minHeight: '100%', background: '#0a0d14' }}
      />

      {/* Error notification banner if token is missing/invalid */}
      {tokenError && (
        <div className="absolute top-4 inset-x-4 z-40 bg-red-950/90 border border-red-500/40 text-red-200 text-xs px-4 py-3 rounded-2xl backdrop-blur-md shadow-lg flex items-center justify-between">
          <p>{tokenError}</p>
        </div>
      )}

      {/* Dark bottom trip card */}
      {!!ticketPrice && !!pickup && !!dropoff && (
        <BottomTripCard
          pickupName={pickup.name || 'Pickup Point'}
          dropoffName={dropoff.name || 'Dropoff Point'}
          departure={departure}
          returnTime={returnTime}
          ticketPrice={ticketPrice}
          onTicketPress={onTicketPress}
        />
      )}
    </div>
  );
};

export default MapboxMap;
