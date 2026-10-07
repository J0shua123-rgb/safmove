export type UserRole = 'user' | 'driver' | 'admin';

export type ServiceType = 'passenger' | 'parcel' | 'errand';

export type TripStatus =
  | 'requested'
  | 'accepted'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DriverStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type PaymentMethod = 'cash' | 'momo';

export interface AccraLocation {
  id: string;
  name: string;
  area: string;
  landmark: string;
  lat: number;
  lng: number;
  popular?: boolean;
}

export interface UserProfile {
  id: string;
  username: string; // e.g. 'kwame_accra'
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  role: 'user';
  trustedContactName?: string;
  trustedContactPhone?: string;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  username?: string; // e.g. 'kofi_rider'
  fullName: string;
  phone: string;
  email?: string;
  ghanaCardNumber: string; // e.g. GHA-123456789-0
  motorcycleModel: string; // e.g. Boxer 150, Haojue 125, Royal 125
  motorcyclePlate: string; // e.g. GR-24-4502
  driverLicenseNumber: string;
  guarantorName: string;
  guarantorPhone: string;
  avatarUrl?: string;
  status: DriverStatus;
  isOnline: boolean;
  currentZone: string;
  currentLat: number;
  currentLng: number;
  rating: number;
  totalTrips: number;
  helmetVerified: boolean;
  registeredAt: string;
  rejectionReason?: string;
}

export interface TripOrder {
  id: string;
  userId: string;
  userName: string;
  userUsername?: string;
  userPhone: string;
  userPhoto?: string;
  driverId?: string;
  driverName?: string;
  driverUsername?: string;
  driverPhone?: string;
  driverPlate?: string;
  driverPhoto?: string;
  driverModel?: string;
  driverGhanaCard?: string;
  serviceType: ServiceType;
  pickupLocation: AccraLocation;
  dropoffLocation: AccraLocation;
  packageDescription?: string;
  recipientName?: string;
  recipientPhone?: string;
  distanceKm: number;
  estDurationMinutes: number;
  fareGHS: number;
  surgeMultiplier: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid_momo' | 'cash_on_delivery';
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
  liveShareToken: string;
  sosTriggered?: boolean;
  sosTimestamp?: string;
}

export interface SOSAlert {
  id: string;
  tripId: string;
  triggeredBy: 'user' | 'driver';
  personName: string;
  personPhone: string;
  currentLocationName: string;
  lat: number;
  lng: number;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  policeNotified: boolean;
  notes?: string;
}

export interface AccraZoneStats {
  id: string;
  name: string;
  activeRiders: number;
  demandLevel: 'Normal' | 'High' | 'Surge';
  avgWaitMinutes: number;
  trafficIndex: 'Low' | 'Moderate' | 'Heavy (Go-Slow)';
}
