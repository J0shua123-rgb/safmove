import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Theme constants ──────────────────────────────────────────────────────────
const YELLOW  = '#F9EB4F';   // --color-primary
const DARK    = '#111827';   // --color-dark

// ─── Dark tile layer with labels (CartoDB Dark Matter — no API key required) ──
const DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─── CSS injected once for ripple animation ───────────────────────────────────
const RIPPLE_STYLE = `
@keyframes safmove-ripple {
  0%   { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(3.0); opacity: 0;   }
}
.safmove-ripple-ring {
  position: absolute;
  border-radius: 50%;
  background: ${YELLOW};
  animation: safmove-ripple 2s ease-out infinite;
  pointer-events: none;
}
.safmove-ripple-ring:nth-child(2) { animation-delay: 0.65s; }
.safmove-ripple-ring:nth-child(3) { animation-delay: 1.3s;  }
`;

let styleInjected = false;
const injectRippleStyle = () => {
  if (styleInjected) return;
  const el = document.createElement('style');
  el.textContent = RIPPLE_STYLE;
  document.head.appendChild(el);
  styleInjected = true;
};

// ─── Icon factories ───────────────────────────────────────────────────────────

/** Pickup / Dropoff pin with a letter label */
const createCustomIcon = (letter: string, bgColor: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background:${bgColor};
        width:34px;height:34px;border-radius:50%;
        border:3px solid white;
        display:flex;align-items:center;justify-content:center;
        font-weight:900;font-size:12px;color:white;
        box-shadow:0 3px 10px rgba(0,0,0,0.45);
      ">${letter}</div>`,
    iconSize:   [34, 34],
    iconAnchor: [17, 17],
  });

/** Live vehicle — white top-down car SVG surrounded by yellow ripple rings */
const createLiveVehicleIcon = () => {
  injectRippleStyle();
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
        <!-- Ripple rings -->
        <div class="safmove-ripple-ring" style="width:64px;height:64px;top:0;left:0;"></div>
        <div class="safmove-ripple-ring" style="width:64px;height:64px;top:0;left:0;"></div>
        <div class="safmove-ripple-ring" style="width:64px;height:64px;top:0;left:0;"></div>
        <!-- White vehicle disc -->
        <div style="
          position:relative;z-index:10;
          width:40px;height:40px;border-radius:50%;
          background:white;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 3px ${YELLOW}, 0 4px 16px rgba(0,0,0,0.6);
        ">
          <!-- Top-down car SVG -->
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
      </div>`,
    iconSize:   [64, 64],
    iconAnchor: [32, 32],
  });
};

/** Standard driver marker (kept for multi-driver arrays) */
const createDriverIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background:#047857;width:30px;height:30px;border-radius:50%;
        border:3px solid white;display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      </div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  });

// ─── Map auto-fit helper ──────────────────────────────────────────────────────
interface FitBoundsProps {
  positions: [number, number][];
}
const FitBounds: React.FC<FitBoundsProps> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    try {
      map.fitBounds(L.latLngBounds(positions), { padding: [60, 60] });
    } catch (_) { /* ignore if positions not ready */ }
  }, [map, positions]);
  return null;
};

// ─── Bottom trip card ─────────────────────────────────────────────────────────
interface TripCardProps {
  pickup:    { name: string };
  dropoff:   { name: string };
  /** Departure display string, e.g. "08:45 AM" */
  departure?: string;
  /** Return / arrival display string, e.g. "12:15 PM" */
  returnTime?: string;
  /** Formatted ticket price string, e.g. "GH₵ 24.00" */
  ticketPrice?: string;
  onTicketPress?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({
  pickup,
  dropoff,
  departure  = '08:45 AM',
  returnTime = '12:15 PM',
  ticketPrice = 'Ticket price',
  onTicketPress,
}) => (
  <div
    className="absolute bottom-0 inset-x-0 z-[1000] px-4 pb-4 pt-0"
    style={{ pointerEvents: 'none' }}
  >
    <div
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: DARK, pointerEvents: 'auto' }}
    >
      {/* Yellow accent strip at top */}
      <div style={{ height: 4, background: YELLOW }} />

      <div className="p-4 space-y-3.5">

        {/* From / To */}
        <div className="space-y-2">
          {/* From row */}
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: YELLOW, color: DARK }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">From</p>
              <p className="text-sm font-bold text-white truncate">{pickup.name}</p>
            </div>
            <span className="text-white/20 text-lg">›</span>
          </div>

          {/* Connector line */}
          <div className="ml-4 flex items-center gap-3">
            <div className="w-0 border-l-2 border-dashed border-white/15 h-4 ml-[15px]" />
          </div>

          {/* To row */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black bg-white/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5" fill={YELLOW} stroke="none"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">To</p>
              <p className="text-sm font-bold text-white truncate">{dropoff.name}</p>
            </div>
            <span className="text-white/20 text-lg">›</span>
          </div>
        </div>

        {/* Time row */}
        <div
          className="flex items-center rounded-2xl overflow-hidden divide-x divide-white/10"
          style={{ background: 'rgba(255,255,255,0.07)' }}
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

        {/* Allowance info */}
        <p className="text-[11px] text-white/35 text-center leading-relaxed">
          Austrian allowance regulations apply · Verified SafMove riders only
        </p>

        {/* Ticket price CTA */}
        <button
          onClick={onTicketPress}
          className="w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  pickup?:  { lat: number; lng: number; name: string };
  dropoff?: { lat: number; lng: number; name: string };
  driver?:  { lat: number; lng: number; name: string };
  drivers?: any[];
  showRoute?: boolean;
  className?: string;
  // Trip card props (optional — card hidden when ticketPrice not provided)
  departure?:   string;
  returnTime?:  string;
  ticketPrice?: string;
  onTicketPress?: () => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 13,
  pickup,
  dropoff,
  driver,
  drivers = [],
  showRoute = true,
  className = '',
  departure,
  returnTime,
  ticketPrice,
  onTicketPress,
}) => {
  // Memoised icons — recreating L.divIcon on every render is expensive
  const pickupIcon      = useRef(createCustomIcon('A', '#059669')).current;
  const dropoffIcon     = useRef(createCustomIcon('B', DARK)).current;
  const liveVehicleIcon = useRef(createLiveVehicleIcon()).current;
  const driverIcon      = useRef(createDriverIcon()).current;

  // Build the route polyline positions from pickup → dropoff
  const routePositions: [number, number][] = [];
  if (pickup)  routePositions.push([pickup.lat,  pickup.lng]);
  if (dropoff) routePositions.push([dropoff.lat, dropoff.lng]);

  // Auto-fit bounds to all relevant positions
  const fitPositions: [number, number][] = [
    ...(pickup  ? [[pickup.lat,  pickup.lng]]  as [number,number][] : []),
    ...(dropoff ? [[dropoff.lat, dropoff.lng]] as [number,number][] : []),
    ...(driver  ? [[driver.lat,  driver.lng]]  as [number,number][] : []),
  ];

  const showTripCard =
    !!ticketPrice && !!pickup && !!dropoff;

  return (
    <div className={`relative ${className}`} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* ── Dark base tiles ── */}
        <TileLayer
          url={DARK_TILE_URL}
          attribution={DARK_TILE_ATTR}
          maxZoom={19}
        />

        {/* ── Auto-fit bounds ── */}
        {fitPositions.length >= 2 && <FitBounds positions={fitPositions} />}

        {/* ── Yellow route polyline (thick, bright, continuous) ── */}
        {showRoute && routePositions.length === 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color:     YELLOW,
              weight:    8,
              opacity:   1,
              lineCap:   'round',
              lineJoin:  'round',
              dashArray: undefined,
            }}
          />
        )}

        {/* ── Pickup marker ── */}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup className="dark-popup">{pickup.name}</Popup>
          </Marker>
        )}

        {/* ── Dropoff marker ── */}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup className="dark-popup">{dropoff.name}</Popup>
          </Marker>
        )}

        {/* ── Live vehicle (single driver) with pulsating yellow rings ── */}
        {driver && (
          <Marker position={[driver.lat, driver.lng]} icon={liveVehicleIcon}>
            <Popup className="dark-popup">{driver.name}</Popup>
          </Marker>
        )}

        {/* ── Multi-driver fleet markers ── */}
        {drivers.length > 0 && drivers.map((d) => (
          <Marker
            key={d.id}
            position={[d.latitude ?? d.lat, d.longitude ?? d.lng]}
            icon={driverIcon}
          >
            <Popup className="dark-popup">SafMove Rider</Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ── Dark bottom trip card (only when ticketPrice prop is provided) ── */}
      {showTripCard && (
        <TripCard
          pickup={pickup!}
          dropoff={dropoff!}
          departure={departure}
          returnTime={returnTime}
          ticketPrice={ticketPrice}
          onTicketPress={onTicketPress}
        />
      )}
    </div>
  );
};
