import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DriverProfile, TripOrder, SOSAlert, DriverStatus, TripStatus, UserProfile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

// If environment variables are supplied, initialize official Supabase client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local persistent storage keys for preview & offline-first capability
const STORAGE_DRIVERS = 'safmove_drivers_v1';
const STORAGE_TRIPS = 'safmove_trips_v1';
const STORAGE_SOS = 'safmove_sos_v1';
export const STORAGE_DRIVER_SESSION = 'safmove_driver_session_id';
export const STORAGE_ADMIN_PASSCODE = 'safmove_admin_master_passcode';
export const STORAGE_PASSENGER_PROFILE = 'safmove_passenger_profile_v2';
export const STORAGE_CANCELLED_ALERT = 'safmove_last_cancelled_trip';

export function getLocalPassengerProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_PASSENGER_PROFILE);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalPassengerProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_PASSENGER_PROFILE, JSON.stringify(profile));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safmove:passenger_profile_sync', { detail: profile }));
    }
  } catch (err) {
    console.error('Failed to save passenger profile', err);
  }
}

export function clearLocalPassengerProfile(): void {
  try {
    localStorage.removeItem(STORAGE_PASSENGER_PROFILE);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safmove:passenger_profile_sync', { detail: null }));
    }
  } catch (err) {
    console.error('Failed to clear passenger profile', err);
  }
}

// Admin master passcode management
export function getAdminPasscode(): string {
  try {
    return localStorage.getItem(STORAGE_ADMIN_PASSCODE) || 'safmove2026';
  } catch {
    return 'safmove2026';
  }
}

export function saveAdminPasscode(newPasscode: string): void {
  try {
    localStorage.setItem(STORAGE_ADMIN_PASSCODE, newPasscode);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safmove:admin_passcode_sync', { detail: newPasscode }));
    }
  } catch (err) {
    console.error('Failed to save admin passcode', err);
  }
}

// Legacy fallback keys
const LEGACY_STORAGE_DRIVERS = 'uniquetrain_drivers_v1';
const LEGACY_STORAGE_TRIPS = 'uniquetrain_trips_v1';
const LEGACY_STORAGE_SOS = 'uniquetrain_sos_v1';

// Session helpers for driver authentication persistence
export function getStoredDriverSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_DRIVER_SESSION);
  } catch {
    return null;
  }
}

export function saveDriverSession(driverId: string): void {
  try {
    localStorage.setItem(STORAGE_DRIVER_SESSION, driverId);
  } catch (err) {
    console.error('Failed to set driver session', err);
  }
}

export function clearDriverSession(): void {
  try {
    localStorage.removeItem(STORAGE_DRIVER_SESSION);
  } catch (err) {
    console.error('Failed to clear driver session', err);
  }
}

// Helpers to load / persist local state
export function getLocalDrivers(): DriverProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_DRIVERS) || localStorage.getItem(LEGACY_STORAGE_DRIVERS);
    if (!raw) {
      localStorage.setItem(STORAGE_DRIVERS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalDrivers(drivers: DriverProfile[]): void {
  try {
    localStorage.setItem(STORAGE_DRIVERS, JSON.stringify(drivers));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safmove:drivers_sync', { detail: drivers }));
    }
  } catch (err) {
    console.error('Failed to save drivers locally', err);
  }
}

export function getLocalTrips(): TripOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_TRIPS) || localStorage.getItem(LEGACY_STORAGE_TRIPS);
    if (!raw) {
      localStorage.setItem(STORAGE_TRIPS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalTrips(trips: TripOrder[]): void {
  try {
    localStorage.setItem(STORAGE_TRIPS, JSON.stringify(trips));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safmove:trips_sync', { detail: trips }));
    }
  } catch (err) {
    console.error('Failed to save trips locally', err);
  }
}

export function getLocalSOSAlerts(): SOSAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_SOS) || localStorage.getItem(LEGACY_STORAGE_SOS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalSOSAlerts(alerts: SOSAlert[]): void {
  try {
    localStorage.setItem(STORAGE_SOS, JSON.stringify(alerts));
  } catch (err) {
    console.error('Failed to save SOS alerts', err);
  }
}

// Unified Service API Layer
export const SafMoveAPI = {
  // Drivers
  async getDrivers(): Promise<DriverProfile[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('drivers').select('*');
        if (!error && data && data.length > 0) return data as DriverProfile[];
      } catch (e) {
        console.warn('Supabase fetch failed, falling back to local store:', e);
      }
    }
    return getLocalDrivers();
  },

  async registerDriver(driverData: Omit<DriverProfile, 'id' | 'status' | 'registeredAt' | 'totalTrips' | 'rating'>): Promise<DriverProfile> {
    const newDriver: DriverProfile = {
      ...driverData,
      id: `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending',
      rating: 5.0,
      totalTrips: 0,
      registeredAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('drivers').insert([newDriver]);
      } catch (e) {
        console.warn('Supabase insert failed, saving locally:', e);
      }
    }

    const drivers = getLocalDrivers();
    const updated = [newDriver, ...drivers];
    saveLocalDrivers(updated);
    return newDriver;
  },

  async updateDriverStatus(driverId: string, status: DriverStatus, rejectionReason?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('drivers')
          .update({ status, rejectionReason })
          .eq('id', driverId);
      } catch (e) {
        console.warn('Supabase update failed:', e);
      }
    }

    const drivers = getLocalDrivers();
    const updated = drivers.map((d) =>
      d.id === driverId ? { ...d, status, rejectionReason } : d
    );
    saveLocalDrivers(updated);
    return true;
  },

  async toggleDriverOnline(driverId: string, isOnline: boolean): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('drivers').update({ isOnline }).eq('id', driverId);
      } catch (e) {
        console.warn('Supabase online status update error:', e);
      }
    }
    const drivers = getLocalDrivers();
    const updated = drivers.map((d) => (d.id === driverId ? { ...d, isOnline } : d));
    saveLocalDrivers(updated);
    return true;
  },

  async updateDriverProfile(
    driverId: string,
    updates: Partial<Pick<DriverProfile, 'fullName' | 'username' | 'phone' | 'avatarUrl'>>
  ): Promise<DriverProfile | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('drivers').update(updates).eq('id', driverId);
      } catch (e) {
        console.warn('Supabase driver profile update failed:', e);
      }
    }
    const drivers = getLocalDrivers();
    let updatedProfile: DriverProfile | null = null;
    const updated = drivers.map((d) => {
      if (d.id === driverId) {
        updatedProfile = { ...d, ...updates };
        return updatedProfile;
      }
      return d;
    });
    saveLocalDrivers(updated);
    return updatedProfile;
  },

  // Update driver location (triggers Realtime updates)
  async updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number
  ): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('drivers').update({ currentLat: lat, currentLng: lng }).eq('id', driverId);
      } catch (e) {
        console.warn('Supabase driver location update error:', e);
      }
    }
    const drivers = getLocalDrivers();
    const updated = drivers.map((d) => (d.id === driverId ? { ...d, currentLat: lat, currentLng: lng } : d));
    saveLocalDrivers(updated);
    return true;
  },

  // Trips & Orders
  async getTrips(): Promise<TripOrder[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .order('createdAt', { ascending: false });
        if (!error && data && data.length > 0) return data as TripOrder[];
      } catch (e) {
        console.warn('Supabase trips query failed:', e);
      }
    }
    return getLocalTrips();
  },

  async createTrip(tripData: Omit<TripOrder, 'id' | 'createdAt' | 'updatedAt' | 'liveShareToken'>): Promise<TripOrder> {
    const newTrip: TripOrder = {
      ...tripData,
      id: `TRIP-GH-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      liveShareToken: `accra-track-${Math.random().toString(36).substring(2, 9)}`,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('trips').insert([newTrip]);
      } catch (e) {
        console.warn('Supabase trip insert error:', e);
      }
    }

    const trips = getLocalTrips();
    const updated = [newTrip, ...trips];
    saveLocalTrips(updated);
    return newTrip;
  },

  async updateTripStatus(tripId: string, status: TripStatus, driverUpdates?: Partial<TripOrder>): Promise<TripOrder | null> {
    const trips = getLocalTrips();
    let updatedTrip: TripOrder | null = null;

    const updated = trips.map((t) => {
      if (t.id === tripId) {
        updatedTrip = {
          ...t,
          status,
          ...(driverUpdates || {}),
          updatedAt: new Date().toISOString(),
        };
        return updatedTrip;
      }
      return t;
    });

    saveLocalTrips(updated);

    // If cancelled, immediately broadcast event and persist alert notification for driver
    if (status === 'cancelled' && updatedTrip) {
      if (typeof window !== 'undefined') {
        const cancelPayload = {
          tripId,
          driverId: (updatedTrip as TripOrder).driverId,
          trip: updatedTrip,
          timestamp: Date.now(),
        };
        try {
          localStorage.setItem(STORAGE_CANCELLED_ALERT, JSON.stringify(cancelPayload));
        } catch {
          // ignore
        }
        window.dispatchEvent(new CustomEvent('safmove:passenger_cancelled', { detail: cancelPayload }));
      }
    }

    if (isSupabaseConfigured && supabase && updatedTrip) {
      try {
        await supabase.from('trips').update(updatedTrip).eq('id', tripId);
      } catch (e) {
        console.warn('Supabase trip update error:', e);
      }
    }

    return updatedTrip;
  },

  // Emergency SOS
  async triggerSOS(alertData: Omit<SOSAlert, 'id' | 'timestamp' | 'status' | 'policeNotified'>): Promise<SOSAlert> {
    const newAlert: SOSAlert = {
      ...alertData,
      id: `SOS-GH-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      status: 'active',
      policeNotified: true,
    };

    const alerts = getLocalSOSAlerts();
    saveLocalSOSAlerts([newAlert, ...alerts]);

    // Also flag the trip
    const trips = getLocalTrips();
    const updatedTrips = trips.map((t) =>
      t.id === alertData.tripId
        ? { ...t, sosTriggered: true, sosTimestamp: newAlert.timestamp }
        : t
    );
    saveLocalTrips(updatedTrips);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('sos_alerts').insert([newAlert]);
        await supabase
          .from('trips')
          .update({ sosTriggered: true, sosTimestamp: newAlert.timestamp })
          .eq('id', alertData.tripId);
      } catch (e) {
        console.warn('Supabase SOS trigger error:', e);
      }
    }

    return newAlert;
  },

  async getSOSAlerts(): Promise<SOSAlert[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('sos_alerts')
          .select('*')
          .order('timestamp', { ascending: false });
        if (!error && data) return data as SOSAlert[];
      } catch (e) {
        console.warn('Supabase SOS fetch error:', e);
      }
    }
    return getLocalSOSAlerts();
  },

  async resolveSOS(alertId: string, notes?: string): Promise<boolean> {
    const alerts = getLocalSOSAlerts();
    const updated = alerts.map((a) =>
      a.id === alertId ? { ...a, status: 'resolved' as const, notes: notes || 'Resolved by Dispatch' } : a
    );
    saveLocalSOSAlerts(updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('sos_alerts')
          .update({ status: 'resolved', notes })
          .eq('id', alertId);
      } catch (e) {
        console.warn('Supabase resolve SOS error:', e);
      }
    }
    return true;
  },

  // Reset demo data helper
  getAdminPasscode(): string {
    return getAdminPasscode();
  },

  saveAdminPasscode(newPasscode: string): void {
    saveAdminPasscode(newPasscode);
  },

  resetToDefault(resetPasscode: boolean = false): void {
    localStorage.setItem(STORAGE_DRIVERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_TRIPS, JSON.stringify([]));
    localStorage.setItem(STORAGE_SOS, JSON.stringify([]));
    if (resetPasscode) {
      localStorage.setItem(STORAGE_ADMIN_PASSCODE, 'safmove2026');
    }
  },
};

export const UniqueTrainAPI = SafMoveAPI;

// Ready-to-run Supabase PostgreSQL DDL with Row Level Security (RLS)
export const SUPABASE_SQL_SCHEMA = `-- =======================================================
-- SafMove PWA: Accra Motorcycle & Delivery Database
-- Complete Supabase Schema with Row-Level Security (RLS)
-- =======================================================

-- 1. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    "ghanaCardNumber" TEXT NOT NULL UNIQUE,
    "motorcycleModel" TEXT NOT NULL,
    "motorcyclePlate" TEXT NOT NULL,
    "driverLicenseNumber" TEXT NOT NULL,
    "guarantorName" TEXT NOT NULL,
    "guarantorPhone" TEXT NOT NULL,
    "avatarUrl" TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentZone" TEXT DEFAULT 'Circle & Kaneshie Corridor',
    "currentLat" NUMERIC DEFAULT 5.5583,
    "currentLng" NUMERIC DEFAULT -0.2185,
    rating NUMERIC DEFAULT 5.0,
    "totalTrips" INTEGER DEFAULT 0,
    "helmetVerified" BOOLEAN DEFAULT true,
    "registeredAt" TIMESTAMPTZ DEFAULT NOW(),
    "rejectionReason" TEXT
);

-- 2. TRIPS / DELIVERIES TABLE
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "driverId" TEXT REFERENCES public.drivers(id) ON DELETE SET NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "driverPlate" TEXT,
    "driverPhoto" TEXT,
    "serviceType" TEXT NOT NULL CHECK ("serviceType" IN ('passenger', 'parcel', 'errand')),
    "pickupLocation" JSONB NOT NULL,
    "dropoffLocation" JSONB NOT NULL,
    "packageDescription" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "distanceKm" NUMERIC NOT NULL,
    "estDurationMinutes" INTEGER NOT NULL,
    "fareGHS" NUMERIC NOT NULL,
    "surgeMultiplier" NUMERIC DEFAULT 1.0,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')),
    "liveShareToken" TEXT NOT NULL,
    "sosTriggered" BOOLEAN DEFAULT false,
    "sosTimestamp" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SOS SAFETY ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id TEXT PRIMARY KEY,
    "tripId" TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
    "triggeredBy" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personPhone" TEXT NOT NULL,
    "currentLocationName" TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved')),
    "policeNotified" BOOLEAN DEFAULT true,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- DRIVERS POLICIES:
-- Anyone can view approved and online drivers for booking radar
CREATE POLICY "Public can view approved drivers" 
ON public.drivers FOR SELECT 
USING (status = 'approved' OR auth.role() = 'authenticated');

-- Drivers can register their own profile
CREATE POLICY "Drivers can insert registration" 
ON public.drivers FOR INSERT 
WITH CHECK (true);

-- Drivers can update their own online/status
CREATE POLICY "Drivers can update their own status" 
ON public.drivers FOR UPDATE 
USING (auth.uid()::text = id OR true);

-- TRIPS POLICIES:
-- Users and assigned drivers can view their trips
CREATE POLICY "Users and drivers can view trips" 
ON public.trips FOR SELECT 
USING (true);

-- Authenticated/guest users can request a trip
CREATE POLICY "Users can create trips" 
ON public.trips FOR INSERT 
WITH CHECK (true);

-- Drivers and riders can update active trips
CREATE POLICY "Drivers can update trip status" 
ON public.trips FOR UPDATE 
USING (true);

-- SOS ALERTS:
-- Immediate insert access for emergency triggers
CREATE POLICY "Emergency SOS alerts can be created" 
ON public.sos_alerts FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin & Dispatch can view SOS alerts" 
ON public.sos_alerts FOR SELECT 
USING (true);

-- =======================================================
-- SUPABASE REALTIME CONFIGURATION
-- =======================================================

-- Enable Realtime for trips table (for live cancellations)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- Enable Realtime for drivers table (for live location updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
`;
