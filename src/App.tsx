import React, { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { UserPortal } from './components/user/UserPortal';
import { DriverPortal } from './components/driver/DriverPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { ToastProvider, useToast } from './components/common/ToastNotification';
import { SplashScreen } from './pages/SplashScreen';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { RoleSelection } from './components/landing/RoleSelection';
import { UserDashboard } from './pages/UserDashboard';
import { MapTripView } from './pages/MapTripView';
import { PassengerRegister } from './pages/PassengerRegister';
import { PassengerMapScreen } from './pages/PassengerMapScreen';
import { DriverProfile, TripOrder, UserProfile } from './types';
import { SafMoveAPI, getLocalDrivers, getLocalTrips, supabase } from './lib/supabase';

export type AppRoute = 'landing' | 'user' | 'driver' | 'admin' | 'splash' | 'dashboard' | 'mapTrip' | 'roleSelect' | 'passengerRegister' | 'passengerMap';

function AppContent() {
  const { showToast } = useToast();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('splash');
  const [isInitialized, setIsInitialized] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  // Strict Supabase Auth session management
  useEffect(() => {
    if (!supabase) {
      setIsInitialized(true);
      setCurrentRoute('landing');
      return;
    }

    // Check initial session
    const initializeAuth = async () => {
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Check user role from metadata
        const userRole = session.user.user_metadata?.role;

        if (userRole === 'driver') {
          // Fetch driver profile from Supabase
          const { data: profile } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setDriverProfile(profile as DriverProfile);
            setCurrentRoute('driver');
          } else {
            // Create driver profile from metadata
            setDriverProfile({
              id: session.user.id,
              fullName: session.user.user_metadata?.full_name || session.user.email || 'Driver',
              username: session.user.email?.split('@')[0] || 'driver',
              phone: session.user.user_metadata?.phone || '',
              ghanaCardNumber: session.user.user_metadata?.ghana_card || '',
              motorcycleModel: session.user.user_metadata?.vehicle_model || '',
              motorcyclePlate: session.user.user_metadata?.license_plate || '',
              driverLicenseNumber: '',
              avatarUrl: session.user.user_metadata?.avatar_url || '',
              currentZone: '',
              currentLat: 5.6037,
              currentLng: -0.1870,
              status: session.user.user_metadata?.status || 'pending',
              isOnline: false,
              registeredAt: session.user.created_at,
              totalTrips: 0,
              rating: 0,
              guarantorName: '',
              guarantorPhone: '',
              helmetVerified: false,
            });
            setCurrentRoute('driver');
          }
        } else if (userRole === 'passenger' || userRole === 'user') {
          // Passenger role detected in metadata -> Route directly to Passenger Dashboard
          setUserProfile({
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'user',
            fullName: session.user.user_metadata?.full_name || session.user.email || 'Daniel',
            phone: session.user.user_metadata?.phone || '',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata?.avatar_url || '',
            role: 'user',
            trustedContactName: '',
            trustedContactPhone: '',
            createdAt: session.user.created_at,
          });
          setCurrentRoute('dashboard');
        } else {
          // No recognized role in metadata — check DB for a driver profile as fallback
          const { data: driverRow } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (driverRow) {
            setDriverProfile(driverRow as DriverProfile);
            setCurrentRoute('driver');
          } else {
            // Default: treat as passenger — a logged-in user should never see the landing page
            setUserProfile({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'user',
              fullName: session.user.user_metadata?.full_name || session.user.email || 'User',
              phone: session.user.user_metadata?.phone || '',
              email: session.user.email || '',
              avatarUrl: session.user.user_metadata?.avatar_url || '',
              role: 'user',
              trustedContactName: '',
              trustedContactPhone: '',
              createdAt: session.user.created_at,
            });
            setCurrentRoute('user');
          }
        }
      } else {
        // No session — go to splash screen
        setCurrentRoute('splash');
      }

      setIsInitialized(true);
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setDriverProfile(null);
        setCurrentRoute('landing');
      } else if (event === 'SIGNED_IN' && session) {
        // ── Guard: never hijack public onboarding screens ──────────────────
        // If the user is mid-registration (passengerRegister / roleSelect / splash)
        // we let PassengerRegister call onRegistered itself. Do NOT reroute here.
        const currentHash = window.location.hash.toLowerCase();
        const isOnboarding =
          currentHash.includes('passenger-register') ||
          currentHash.includes('register-passenger') ||
          currentHash.includes('role-select') ||
          currentHash === '#/' ||
          currentHash === '';
        if (isOnboarding) return;

        // Check user role from metadata
        const userRole = session.user.user_metadata?.role;

        if (userRole === 'driver') {
          // Fetch driver profile from Supabase
          const { data: profile } = await supabase!
            .from('drivers')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setDriverProfile(profile as DriverProfile);
            setCurrentRoute('driver');
          } else {
            // Create driver profile from metadata
            setDriverProfile({
              id: session.user.id,
              fullName: session.user.user_metadata?.full_name || session.user.email || 'Driver',
              username: session.user.email?.split('@')[0] || 'driver',
              phone: session.user.user_metadata?.phone || '',
              ghanaCardNumber: session.user.user_metadata?.ghana_card || '',
              motorcycleModel: session.user.user_metadata?.vehicle_model || '',
              motorcyclePlate: session.user.user_metadata?.license_plate || '',
              driverLicenseNumber: '',
              avatarUrl: session.user.user_metadata?.avatar_url || '',
              currentZone: '',
              currentLat: 5.6037,
              currentLng: -0.1870,
              status: session.user.user_metadata?.status || 'pending',
              isOnline: false,
              registeredAt: session.user.created_at,
              totalTrips: 0,
              rating: 0,
              guarantorName: '',
              guarantorPhone: '',
              helmetVerified: false,
            });
            setCurrentRoute('driver');
          }
        } else if (userRole === 'passenger' || userRole === 'user') {
          // Passenger role detected in metadata -> Route to Passenger Dashboard
          setUserProfile({
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'user',
            fullName: session.user.user_metadata?.full_name || session.user.email || 'Daniel',
            phone: session.user.user_metadata?.phone || '',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata?.avatar_url || '',
            role: 'user',
            trustedContactName: '',
            trustedContactPhone: '',
            createdAt: session.user.created_at,
          });
          setCurrentRoute('dashboard');
        } else {
          // No recognized role in metadata — check DB for a driver profile as fallback
          const { data: driverRow } = await supabase!
            .from('drivers')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (driverRow) {
            setDriverProfile(driverRow as DriverProfile);
            setCurrentRoute('driver');
          } else {
            // Default: treat as passenger — a logged-in user should never see the landing page
            setUserProfile({
              id: session.user.id,
              username: session.user.email?.split('@')[0] || 'user',
              fullName: session.user.user_metadata?.full_name || session.user.email || 'User',
              phone: session.user.user_metadata?.phone || '',
              email: session.user.email || '',
              avatarUrl: session.user.user_metadata?.avatar_url || '',
              role: 'user',
              trustedContactName: '',
              trustedContactPhone: '',
              createdAt: session.user.created_at,
            });
            setCurrentRoute('user');
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Global shared driver & trips state across Portals
  const [drivers, setDrivers] = useState<DriverProfile[]>(() => getLocalDrivers());
  const [trips, setTrips] = useState<TripOrder[]>(() => getLocalTrips());

  // Listen for storage / cross-tab driver & trips state synchronization
  useEffect(() => {
    const syncFromStorage = () => {
      setDrivers(getLocalDrivers());
      setTrips(getLocalTrips());
    };
    window.addEventListener('safmove:drivers_sync', syncFromStorage);
    window.addEventListener('safmove:trips_sync', syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('safmove:drivers_sync', syncFromStorage);
      window.removeEventListener('safmove:trips_sync', syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  // Capture driver registration into state & pending queue
  const handleRegisterDriver = useCallback(
    async (
      driverData: Omit<DriverProfile, 'id' | 'status' | 'registeredAt' | 'totalTrips' | 'rating'>
    ): Promise<DriverProfile> => {
      const newDriver = await SafMoveAPI.registerDriver(driverData);
      setDrivers(getLocalDrivers());
      return newDriver;
    },
    []
  );

  // Admin approval: Update status to 'approved' & remove from pending queue
  const handleApproveDriver = useCallback(async (driverId: string) => {
    await SafMoveAPI.updateDriverStatus(driverId, 'approved');
    setDrivers(getLocalDrivers());
  }, []);

  // Admin rejection: Cleanly remove from pending queue (status 'rejected')
  const handleRejectDriver = useCallback(async (driverId: string, reason?: string) => {
    await SafMoveAPI.updateDriverStatus(driverId, 'rejected', reason || 'Application rejected by central dispatch');
    setDrivers(getLocalDrivers());
  }, []);

  // Update driver profile details (photo, name, phone, username)
  const handleUpdateDriver = useCallback(
    async (
      driverId: string,
      updates: Partial<Pick<DriverProfile, 'fullName' | 'username' | 'phone' | 'avatarUrl'>>
    ): Promise<DriverProfile | null> => {
      const updated = await SafMoveAPI.updateDriverProfile(driverId, updates);
      setDrivers(getLocalDrivers());
      return updated;
    },
    []
  );

  // Keep hash in sync with React state (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();

      // ── Public / onboarding routes (no auth required) ──────────────────
      if (
        hash.includes('passenger-register') ||
        hash.includes('register-passenger')
      ) {
        setCurrentRoute('passengerRegister');
      } else if (hash.includes('role-select')) {
        setCurrentRoute('roleSelect');

      // ── Authenticated app routes ────────────────────────────────────────
      } else if (hash.includes('passenger-map')) {
        setCurrentRoute('passengerMap');
      } else if (hash.includes('dashboard')) {
        setCurrentRoute('dashboard');
      } else if (hash.includes('map-trip')) {
        setCurrentRoute('mapTrip');
      } else if (hash.includes('admin') || hash.includes('secret-admin-portal')) {
        setCurrentRoute('admin');
      } else if (hash.includes('user')) {
        setCurrentRoute('user');
      } else if (hash.includes('driver')) {
        setCurrentRoute('driver');

      // ── Root / welcome ──────────────────────────────────────────────────
      } else if (hash === '#/' || hash === '') {
        setCurrentRoute('splash');
      }
      // Unrecognised hash → do nothing; keep the current screen
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isInitialized]);

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    // Set a canonical, human-readable hash for every route so that
    // handleHashChange can always resolve it back correctly.
    switch (route) {
      case 'splash':            window.location.hash = '#/'; break;
      case 'landing':           window.location.hash = ''; break;
      case 'roleSelect':        window.location.hash = '#/role-select'; break;
      case 'passengerRegister': window.location.hash = '#/passenger-register'; break;
      case 'passengerMap':      window.location.hash = '#/passenger-map'; break;
      case 'dashboard':         window.location.hash = '#/dashboard'; break;
      case 'mapTrip':           window.location.hash = '#/map-trip'; break;
      case 'admin':             window.location.hash = '#/secret-admin-portal'; break;
      case 'user':              window.location.hash = '#/user'; break;
      case 'driver':            window.location.hash = '#/driver'; break;
      default:                  window.location.hash = `#/${route}`;
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUserProfile(null);
    setDriverProfile(null);
    setCurrentRoute('landing');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Offline connectivity indicator banner */}
      <OfflineIndicator />

      {/* Show loading state during initialization */}
      {!isInitialized && (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading SafMove...</p>
          </div>
        </div>
      )}

      {/* ── Standalone pages (no legacy portal) ─────────────────────────── */}
      {isInitialized && currentRoute === 'splash' && (
        <WelcomeScreen onGo={() => navigateTo('roleSelect')} />
      )}

      {isInitialized && currentRoute === 'roleSelect' && (
        <RoleSelection
          onSelectRole={(role) => navigateTo(role === 'passenger' ? 'passengerRegister' : 'driver')}
        />
      )}

      {isInitialized && currentRoute === 'passengerRegister' && (
        <PassengerRegister
          onBack={() => navigateTo('roleSelect')}
          onRegistered={(profile) => {
            setUserProfile(profile);
            navigateTo('passengerMap');
          }}
        />
      )}

      {isInitialized && currentRoute === 'passengerMap' && (
        <PassengerMapScreen
          userProfile={userProfile}
        />
      )}

      {isInitialized && currentRoute === 'dashboard' && (
        <UserDashboard
          userName={userProfile?.fullName || 'Daniel'}
          avatarUrl={userProfile?.avatarUrl}
          onFindRoute={() => navigateTo('mapTrip')}
          onPublicTransport={() => navigateTo('mapTrip')}
          onNavChange={(tab) => {
            if (tab === 'route') navigateTo('mapTrip');
            else if (tab === 'profile') navigateTo('user');
            else if (tab === 'home') navigateTo('dashboard');
          }}
        />
      )}

      {isInitialized && currentRoute === 'mapTrip' && (
        <MapTripView
          passengerName={userProfile?.fullName || 'Daniel'}
          passengerPhone={userProfile?.phone || '+233 24 123 4567'}
          onBack={() => navigateTo('dashboard')}
          onTicketPress={async () => {
            try {
              await SafMoveAPI.dispatchRideRequest({
                passenger_id: userProfile?.id || 'guest',
                passenger_name: userProfile?.fullName || 'Daniel',
                passenger_phone: userProfile?.phone || '+233 24 123 4567',
                pickup_address: 'Ashaiman Night Market',
                pickup_lat: 5.6983,
                pickup_lng: -0.0305,
                dropoff_address: 'Tulaku Junction',
                dropoff_lat: 5.7050,
                dropoff_lng: -0.0210,
                fare_amount: 18.0,
                status: 'searching',
              });
              showToast({
                type: 'ride',
                title: '🛵 Dispatch Request Submitted!',
                message: 'Looking for verified riders near Ashaiman Night Market...',
              });
              navigateTo('user');
            } catch (err: any) {
              showToast({
                type: 'error',
                title: 'Dispatch Failed',
                message: err?.message || 'Network error occurred.',
              });
            }
          }}
        />
      )}

      {/* ── Role-Based Portal Views ──────────────────────────────────────── */}
      {isInitialized && currentRoute === 'landing' && (
        <LandingPage
          onSelectRole={(role) => navigateTo(role)}
        />
      )}

      {isInitialized && currentRoute === 'user' && (
        <UserPortal
          onBackToHome={() => navigateTo('landing')}
          onSwitchToDriver={() => navigateTo('driver')}
          drivers={drivers}
          userProfile={userProfile}
          onSignOut={handleSignOut}
        />
      )}

      {isInitialized && currentRoute === 'driver' && (
        <DriverPortal
          onBackToHome={() => navigateTo('landing')}
          onSwitchToUser={() => navigateTo('user')}
          drivers={drivers}
          driverProfile={driverProfile}
          onRegisterDriver={handleRegisterDriver}
          onUpdateDriver={handleUpdateDriver}
          onSignOut={handleSignOut}
        />
      )}

      {isInitialized && currentRoute === 'admin' && (
        <AdminPortal
          onBackToHome={() => navigateTo('landing')}
          onSwitchToUser={() => navigateTo('user')}
          drivers={drivers}
          trips={trips}
          onApproveDriver={handleApproveDriver}
          onRejectDriver={handleRejectDriver}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
