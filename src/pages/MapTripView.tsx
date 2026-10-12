import React, { useState } from 'react';
import { MapboxMap } from '../components/MapboxMap';
import { SOSEmergencyButton } from '../components/common/SOSEmergencyButton';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Location {
  lat: number;
  lng: number;
  name: string;
}

interface MapTripViewProps {
  pickup?:    Location;
  dropoff?:   Location;
  driver?:    Location;
  departure?: string;
  returnTime?: string;
  ticketPrice?: string;
  onBack?: () => void;
  onTicketPress?: () => void;
  passengerName?: string;
  passengerPhone?: string;
}

// ─── Default demo route (Ashaiman Night Market → Tulaku Junction) ─────────────
const DEFAULT_PICKUP: Location  = { lat: 5.6983, lng: -0.0305, name: 'Ashaiman Night Market' };
const DEFAULT_DROPOFF: Location = { lat: 5.7050, lng: -0.0210, name: 'Tulaku Junction' };
const DEFAULT_DRIVER: Location  = { lat: 5.6983, lng: -0.0305, name: 'SafMove Rider #42' };

// ─── Component ─────────────────────────────────────────────────────────────────
export const MapTripView: React.FC<MapTripViewProps> = ({
  pickup      = DEFAULT_PICKUP,
  dropoff     = DEFAULT_DROPOFF,
  driver      = DEFAULT_DRIVER,
  departure   = '08:45 AM',
  returnTime  = '12:15 PM',
  ticketPrice = 'GH₵ 24.00  ·  View Ticket',
  onBack,
  onTicketPress,
  passengerName = 'Daniel',
  passengerPhone = '+233 24 123 4567',
}) => {
  const center: [number, number] = [
    (pickup.lng + dropoff.lng) / 2,
    (pickup.lat + dropoff.lat) / 2,
  ];

  return (
    <div
      id="map-trip-view"
      className="relative w-full min-h-screen"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* ── Full-screen Mapbox map ──────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <MapboxMap
          center={center}
          zoom={13}
          pickup={pickup}
          dropoff={dropoff}
          driver={driver}
          showRoute={true}
          className="w-full h-full"
          /* Pass trip-card props — card shown automatically when ticketPrice provided */
          departure={departure}
          returnTime={returnTime}
          ticketPrice={ticketPrice}
          onTicketPress={onTicketPress}
        />
      </div>

      {/* ── Top overlay: back button + route title + SOS button ────────────── */}
      <div
        className="absolute top-0 inset-x-0 z-[1100] flex items-center gap-2.5 px-3.5 pt-safe"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        {/* Back button */}
        {onBack && (
          <button
            id="map-back-btn"
            onClick={onBack}
            aria-label="Go back"
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0 cursor-pointer"
            style={{
              background: 'rgba(17,24,39,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        )}

        {/* Route title pill */}
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl overflow-hidden min-w-0"
          style={{
            background: 'rgba(17,24,39,0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Yellow dot (origin) */}
          <span
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ background: '#F9EB4F' }}
          />
          <p className="text-xs font-bold text-white truncate flex-1">{pickup.name}</p>
          {/* Arrow */}
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <p className="text-xs font-bold text-white truncate flex-1 text-right">{dropoff.name}</p>
          {/* Red pin (destination) */}
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-rose-500" />
        </div>

        {/* SOS Emergency Button */}
        <SOSEmergencyButton
          tripId="TRIP-ASHAIMAN-LIVE"
          passengerName={passengerName}
          passengerPhone={passengerPhone}
          pickupAddress={pickup.name}
          dropoffAddress={dropoff.name}
          currentCoords={{ lat: driver.lat, lng: driver.lng }}
          driverName={driver.name}
          driverPlate="GR-24-4502"
          driverModel="Boxer 150"
        />
      </div>
    </div>
  );
};

export default MapTripView;
