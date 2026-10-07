import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icon creator for high-contrast markers
const createCustomIcon = (letter: string, color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 11px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${letter}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Driver bike icon
const createDriverIcon = () => {
  return L.divIcon({
    className: 'driver-marker',
    html: `
      <div style="
        background-color: #047857;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M5 17l4-4 4 4"/>
          <path d="M9 13V4"/>
          <circle cx="9" cy="18" r="2"/>
          <path d="M15 13l-4 4"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  pickup?: { lat: number; lng: number; name: string };
  dropoff?: { lat: number; lng: number; name: string };
  driver?: { lat: number; lng: number; name: string };
  drivers?: any[];
  showRoute?: boolean;
  className?: string;
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
}) => {
  const pickupIcon = createCustomIcon('P', '#059669');
  const dropoffIcon = createCustomIcon('D', '#0f172a');
  const driverIcon = createDriverIcon();

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>{pickup.name}</Popup>
        </Marker>
      )}
      
      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
          <Popup>{dropoff.name}</Popup>
        </Marker>
      )}
      
      {driver && (
        <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
          <Popup>{driver.name}</Popup>
        </Marker>
      )}

      {drivers && drivers.length > 0 && drivers.map((d) => (
        <Marker
          key={d.id}
          position={[d.latitude, d.longitude]}
          icon={driverIcon}
        >
          <Popup>SafMove Rider</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
