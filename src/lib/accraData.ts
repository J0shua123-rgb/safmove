import { AccraLocation, AccraZoneStats, DriverProfile, TripOrder } from '../types';

export const ACCRA_HOTLINES = {
  POLICE_EMERGENCY: '191',
  POLICE_HOTLINE: '18555',
  NATIONAL_EMERGENCY: '112',
  AMBULANCE: '193',
  FIRE_SERVICE: '192',
  SAFMOVE_DISPATCH: '+233 24 000 8899',
};

export interface AccraHub {
  id: string;
  name: string;
  landmark: string;
  lat: number;
  lng: number;
}

export const ACCRA_HUBS: AccraHub[] = [
  { id: 'circle', name: 'Kwame Nkrumah Circle', landmark: 'Circle Interchange / VIP Station', lat: 5.5583, lng: -0.2185 },
  { id: 'kaneshie', name: 'Kaneshie', landmark: 'First Light / Central Market', lat: 5.5678, lng: -0.2458 },
  { id: 'east_legon', name: 'East Legon', landmark: 'American House / Lagos Ave', lat: 5.6353, lng: -0.1601 },
  { id: 'osu', name: 'Osu', landmark: 'Oxford Street / Danquah Circle', lat: 5.5562, lng: -0.1837 },
  { id: 'madina', name: 'Madina', landmark: 'Zongo Junction / Ritz', lat: 5.6706, lng: -0.1654 },
  { id: 'lapaz', name: 'Lapaz', landmark: 'Nyamekye Junction / Las Palmas', lat: 5.6025, lng: -0.2442 },
  { id: 'spintex', name: 'Spintex Road', landmark: 'Flower Pot / Manet', lat: 5.6268, lng: -0.1259 },
  { id: 'airport', name: 'Kotoka Airport (KIA)', landmark: 'Terminal 3 / Airport City', lat: 5.6052, lng: -0.1668 },
  { id: 'makola', name: 'Makola / Central Market', landmark: 'Rawlings Park / UTC', lat: 5.5448, lng: -0.2075 },
  { id: 'tema', name: 'Tema Community 1', landmark: 'Harbour Gate / Market', lat: 5.6698, lng: -0.0166 },
  { id: 'dansoman', name: 'Dansoman', landmark: 'Exhibition / Last Stop', lat: 5.5492, lng: -0.2644 },
  { id: 'achimota', name: 'Achimota', landmark: 'Neoplan / Old Station', lat: 5.6189, lng: -0.2312 },
];

export const ACCRA_POPULAR_LOCATIONS: AccraLocation[] = [
  {
    id: 'circle',
    name: 'Kwame Nkrumah Circle',
    area: 'Central Accra',
    landmark: 'Interchange / VIP Station',
    lat: 5.5583,
    lng: -0.2185,
    popular: true,
  },
  {
    id: 'east_legon',
    name: 'East Legon',
    area: 'Greater Accra East',
    landmark: 'American House / Lagos Avenue',
    lat: 5.6353,
    lng: -0.1601,
    popular: true,
  },
  {
    id: 'osu',
    name: 'Osu',
    area: 'Accra Metropolitan',
    landmark: 'Oxford Street / Danquah Circle',
    lat: 5.5562,
    lng: -0.1837,
    popular: true,
  },
  {
    id: 'madina',
    name: 'Madina',
    area: 'La-Nkwantanang',
    landmark: 'Zongo Junction / Ritz Junction',
    lat: 5.6706,
    lng: -0.1654,
    popular: true,
  },
  {
    id: 'airport',
    name: 'Kotoka International Airport (KIA)',
    area: 'Airport City',
    landmark: 'Terminal 3 / Marina Mall',
    lat: 5.6052,
    lng: -0.1668,
    popular: true,
  },
  {
    id: 'spintex',
    name: 'Spintex Road',
    area: 'Ledzokuku',
    landmark: 'Flower Pot Interchange / Manet Junction',
    lat: 5.6268,
    lng: -0.1259,
    popular: true,
  },
  {
    id: 'kaneshie',
    name: 'Kaneshie',
    area: 'Okaikwei South',
    landmark: 'Kaneshie Central Market / First Light',
    lat: 5.5678,
    lng: -0.2458,
    popular: true,
  },
  {
    id: 'lapaz',
    name: 'Lapaz',
    area: 'Okaikwei North',
    landmark: 'Nyamekye Junction / Las Palmas',
    lat: 5.6025,
    lng: -0.2442,
    popular: true,
  },
  {
    id: 'tema',
    name: 'Tema Community 1',
    area: 'Tema Metropolitan',
    landmark: 'Central Market / Harbour Gate',
    lat: 5.6698,
    lng: -0.0166,
    popular: true,
  },
  {
    id: 'makola',
    name: 'Makola Market',
    area: 'Central Business District',
    landmark: 'Rawlings Park / UTC',
    lat: 5.5448,
    lng: -0.2075,
    popular: true,
  },
  {
    id: 'cantonments',
    name: 'Cantonments',
    area: 'Accra Metropolitan',
    landmark: 'W.E.B. Du Bois Centre / Togo Embassy',
    lat: 5.5786,
    lng: -0.1772,
    popular: false,
  },
  {
    id: 'dzorwulu',
    name: 'Dzorwulu',
    area: 'Ayawaso West',
    landmark: 'Blohum Street / Perez Dome',
    lat: 5.6095,
    lng: -0.1982,
    popular: false,
  },
  {
    id: 'achimota',
    name: 'Achimota',
    area: 'Okaikwei',
    landmark: 'Old Station / Neoplan',
    lat: 5.6189,
    lng: -0.2312,
    popular: false,
  },
  {
    id: 'dansoman',
    name: 'Dansoman',
    area: 'Ablekuma West',
    landmark: 'Last Stop / Exhibition',
    lat: 5.5492,
    lng: -0.2644,
    popular: false,
  },
];

export const ACCRA_ZONES: AccraZoneStats[] = [
  {
    id: 'zone_circle',
    name: 'Circle & Kaneshie Corridor',
    activeRiders: 18,
    demandLevel: 'Surge',
    avgWaitMinutes: 3,
    trafficIndex: 'Heavy (Go-Slow)',
  },
  {
    id: 'zone_eastlegon',
    name: 'East Legon & Spintex Tech Hub',
    activeRiders: 24,
    demandLevel: 'High',
    avgWaitMinutes: 4,
    trafficIndex: 'Moderate',
  },
  {
    id: 'zone_osu',
    name: 'Osu & Central Business District (Makola)',
    activeRiders: 14,
    demandLevel: 'High',
    avgWaitMinutes: 5,
    trafficIndex: 'Heavy (Go-Slow)',
  },
  {
    id: 'zone_madina',
    name: 'Madina & Adenta Corridor',
    activeRiders: 16,
    demandLevel: 'Normal',
    avgWaitMinutes: 4,
    trafficIndex: 'Moderate',
  },
  {
    id: 'zone_lapaz',
    name: 'Lapaz & Achimota Gateway',
    activeRiders: 12,
    demandLevel: 'Normal',
    avgWaitMinutes: 6,
    trafficIndex: 'Moderate',
  },
];

export const INITIAL_DRIVERS: DriverProfile[] = [
  {
    id: 'drv_kofi_01',
    username: 'kofi_rider',
    fullName: 'Kofi Mensah Boateng',
    phone: '+233 24 456 7890',
    email: 'kofi.boateng@example.gh',
    ghanaCardNumber: 'GHA-712849012-3',
    motorcycleModel: 'Bajaj Boxer 150 HD',
    motorcyclePlate: 'GR-24-1092',
    driverLicenseNumber: 'DL-ACC-2022-8812',
    guarantorName: 'Rev. Emmanuel Boateng',
    guarantorPhone: '+233 20 889 1234',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'approved',
    isOnline: true,
    currentZone: 'Circle & Kaneshie Corridor',
    currentLat: 5.5601,
    currentLng: -0.2210,
    rating: 4.9,
    totalTrips: 428,
    helmetVerified: true,
    registeredAt: '2024-01-15T09:30:00Z',
  },
  {
    id: 'drv_kwame_02',
    username: 'kwame_gh',
    fullName: 'Kwame Osei Asante',
    phone: '+233 55 987 6543',
    email: 'kwame.asante@example.gh',
    ghanaCardNumber: 'GHA-829104719-8',
    motorcycleModel: 'Haojue 125cc Courier',
    motorcyclePlate: 'GT-23-6641',
    driverLicenseNumber: 'DL-TMA-2023-4419',
    guarantorName: 'Nana Yaa Asante',
    guarantorPhone: '+233 24 332 1100',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'approved',
    isOnline: true,
    currentZone: 'East Legon & Spintex Tech Hub',
    currentLat: 5.6310,
    currentLng: -0.1580,
    rating: 4.85,
    totalTrips: 312,
    helmetVerified: true,
    registeredAt: '2024-02-10T14:15:00Z',
  },
  {
    id: 'drv_yao_03',
    username: 'yao_selorm',
    fullName: 'Yao Selorm Agbeko',
    phone: '+233 20 112 3456',
    email: 'yao.agbeko@example.gh',
    ghanaCardNumber: 'GHA-901847120-1',
    motorcycleModel: 'Royal 125T Express',
    motorcyclePlate: 'GR-24-8803',
    driverLicenseNumber: 'DL-ACC-2024-1029',
    guarantorName: 'Felix Agbeko',
    guarantorPhone: '+233 50 445 7788',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    status: 'pending',
    isOnline: false,
    currentZone: 'Madina & Adenta Corridor',
    currentLat: 5.6710,
    currentLng: -0.1650,
    rating: 5.0,
    totalTrips: 0,
    helmetVerified: true,
    registeredAt: '2024-04-18T11:00:00Z',
  },
  {
    id: 'drv_nii_04',
    username: 'nii_armah',
    fullName: 'Nii Armah Sowah',
    phone: '+233 27 778 9900',
    email: 'nii.sowah@example.gh',
    ghanaCardNumber: 'GHA-602938471-5',
    motorcycleModel: 'TVS HLX 150',
    motorcyclePlate: 'GW-23-3390',
    driverLicenseNumber: 'DL-GAR-2023-7721',
    guarantorName: 'Dr. Joseph Sowah',
    guarantorPhone: '+233 24 990 0011',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    status: 'pending',
    isOnline: false,
    currentZone: 'Osu & Central Business District (Makola)',
    currentLat: 5.5580,
    currentLng: -0.1820,
    rating: 5.0,
    totalTrips: 0,
    helmetVerified: false,
    registeredAt: '2024-04-19T08:20:00Z',
  },
];

export const INITIAL_TRIPS: TripOrder[] = [
  {
    id: 'TRIP-GH-8821',
    userId: 'usr_ama_01',
    userName: 'Ama Serwaa',
    userPhone: '+233 24 111 2233',
    driverId: 'drv_kofi_01',
    driverName: 'Kofi Mensah Boateng',
    driverPhone: '+233 24 456 7890',
    driverPlate: 'GR-24-1092',
    driverPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    serviceType: 'passenger',
    pickupLocation: ACCRA_POPULAR_LOCATIONS[0], // Circle
    dropoffLocation: ACCRA_POPULAR_LOCATIONS[1], // East Legon
    distanceKm: 11.4,
    estDurationMinutes: 24,
    fareGHS: 38.50,
    surgeMultiplier: 1.15,
    paymentMethod: 'momo',
    paymentStatus: 'paid_momo',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    liveShareToken: 'accra-track-8821',
  },
  {
    id: 'TRIP-GH-8819',
    userId: 'usr_kwaku_02',
    userName: 'Kwaku Frimpong',
    userPhone: '+233 50 333 4455',
    driverId: 'drv_kwame_02',
    driverName: 'Kwame Osei Asante',
    driverPhone: '+233 55 987 6543',
    driverPlate: 'GT-23-6641',
    driverPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    serviceType: 'parcel',
    packageDescription: 'Spare parts parcel & invoice to retail depot',
    recipientName: 'Kojo Antwi',
    recipientPhone: '+233 24 999 8888',
    pickupLocation: ACCRA_POPULAR_LOCATIONS[2], // Osu
    dropoffLocation: ACCRA_POPULAR_LOCATIONS[5], // Spintex
    distanceKm: 14.2,
    estDurationMinutes: 30,
    fareGHS: 46.00,
    surgeMultiplier: 1.0,
    paymentMethod: 'cash',
    paymentStatus: 'cash_on_delivery',
    status: 'completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    liveShareToken: 'accra-track-8819',
  },
];

// Calculation of Distance in KM using Haversine
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(1.5, Math.round(d * 10) / 10);
}

// Ghanaian Cedi (GH₵) Fare Calculation
export function calculateFareGHS(
  distanceKm: number,
  serviceType: 'passenger' | 'parcel' | 'errand',
  isSurgeActive: boolean = false
): { fare: number; estMinutes: number; surge: number } {
  // Base fare in GH₵
  const baseRates = {
    passenger: 12.00, // GH₵12 base
    parcel: 15.00,    // GH₵15 base (package care)
    errand: 18.00,    // GH₵18 base (custom tasks/market)
  };

  const perKmRate = 2.50; // GH₵2.50 per km
  const surge = isSurgeActive ? 1.25 : 1.0;

  const rawFare = (baseRates[serviceType] + distanceKm * perKmRate) * surge;
  // Round to nearest 0.50 GHS
  const fare = Math.round(rawFare * 2) / 2;

  // Estimate duration: motorcycle in Accra avg 25-35 km/h factoring traffic
  const estMinutes = Math.max(8, Math.round((distanceKm / 28) * 60 + 5));

  return { fare, estMinutes, surge };
}

// Generate live WhatsApp Share Link for Security & Peace of Mind
export function generateWhatsAppSafetyShareUrl(trip: TripOrder): string {
  const text = encodeURIComponent(
    `🚨 *SafMove Live Trip Share (Accra)* 🛵\n` +
    `I am currently on a ride with SafMove for security & safety.\n\n` +
    `👤 *Rider:* ${trip.driverName || 'Assigned Verified Rider'}\n` +
    `🏍️ *Plate:* ${trip.driverPlate || 'Verified Moto'}\n` +
    `📍 *Pickup:* ${trip.pickupLocation.name} (${trip.pickupLocation.landmark})\n` +
    `🏁 *Destination:* ${trip.dropoffLocation.name}\n` +
    `⏱️ *Est. Arrival:* ~${trip.estDurationMinutes} mins\n` +
    `🛡️ *Live Status:* ${trip.status.toUpperCase()}\n` +
    `🔒 *Verified ID:* Ghana Card Screened & Helmet Checked\n` +
    `Police Emergency Hotline: 191 / 112\n\n` +
    `Tracking ID: ${trip.liveShareToken}`
  );
  return `https://wa.me/?text=${text}`;
}
