import React, { useState, useEffect, useRef } from 'react';
import {
  Bike,
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Power,
  MapPin,
  Phone,
  Zap,
  XCircle,
  User,
  Edit3,
  Camera,
  Save,
  X,
  LogOut,
  Check,
  RefreshCw,
  Upload,
  Navigation,
  Compass,
  Star,
  Radio,
  Package,
  Layers,
  Award
} from 'lucide-react';
import { DriverProfile, TripOrder, TripStatus } from '../../types';
import { ACCRA_HUBS, ACCRA_ZONES } from '../../lib/accraData';
import { 
  SafMoveAPI, 
  getStoredDriverSession, 
  saveDriverSession, 
  getLocalDrivers,
  STORAGE_CANCELLED_ALERT,
  supabase
} from '../../lib/supabase';
import { processImageFile } from '../../lib/imageUtils';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { LeafletMap } from '../common/LeafletMap';

interface DriverPortalProps {
  onBackToHome: () => void;
  onSwitchToUser: () => void;
  drivers?: DriverProfile[];
  driverProfile?: DriverProfile | null;
  onRegisterDriver?: (driverData: Omit<DriverProfile, 'id' | 'status' | 'registeredAt' | 'totalTrips' | 'rating'>) => Promise<DriverProfile>;
  onUpdateDriver?: (driverId: string, updates: Partial<Pick<DriverProfile, 'fullName' | 'username' | 'phone' | 'avatarUrl'>>) => Promise<DriverProfile | null>;
  onSignOut?: () => Promise<void>;
}

type DriverNavTab = 'home' | 'history' | 'profile';

export const DriverPortal: React.FC<DriverPortalProps> = ({
  onBackToHome,
  onSwitchToUser,
  drivers: propDrivers,
  driverProfile: propDriverProfile,
  onRegisterDriver,
  onUpdateDriver,
  onSignOut,
}) => {
  const [drivers, setDrivers] = useState<DriverProfile[]>(propDrivers || []);
  
  // Active navigation tab (Home/Dispatch, History/Rides, Profile/Settings)
  const [activeTab, setActiveTab] = useState<DriverNavTab>('home');

  // Clean Slate on Refresh: use Supabase profile or fallback to local storage session
  const [currentDriver, setCurrentDriver] = useState<DriverProfile | null>(() => {
    if (propDriverProfile) return propDriverProfile;
    const sessionId = getStoredDriverSession();
    if (!sessionId) return null;
    const pool = propDrivers && propDrivers.length > 0 ? propDrivers : getLocalDrivers();
    return pool.find((d) => d.id === sessionId) || null;
  });

  const [trips, setTrips] = useState<TripOrder[]>([]);
  const [activeJob, setActiveJob] = useState<TripOrder | null>(null);

  // History Tab Filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'passenger' | 'parcel'>('all');

  // Registration Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ghanaCard, setGhanaCard] = useState('');
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [motorcyclePlate, setMotorcyclePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [registrationPhotoUrl, setRegistrationPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle native file selection for rider registration profile photo
  const handleRegistrationPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setRegistrationPhotoUrl(objectUrl);
    }
  };



  // Profile View & Edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Cancellation Alert Modal State
  const [cancelledAlertTrip, setCancelledAlertTrip] = useState<TripOrder | null>(null);

  const driverAvatarInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic time-based greeting for rider
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  // Map state for Home tab
  const [focusedHub, setFocusedHub] = useState<string>('Kwame Nkrumah Circle');

  // Sync propDrivers when provided
  useEffect(() => {
    if (propDrivers && propDrivers.length > 0) {
      setDrivers(propDrivers);
      const sessionId = getStoredDriverSession();
      if (sessionId) {
        const fresh = propDrivers.find((d) => d.id === sessionId);
        if (fresh) {
          setCurrentDriver(fresh);
        }
      }
    }
  }, [propDrivers]);

  // Sync profile editing fields whenever currentDriver changes
  useEffect(() => {
    if (currentDriver) {
      setProfileName(currentDriver.fullName);
      setProfileUsername(currentDriver.username || currentDriver.fullName.toLowerCase().replace(/\s+/g, '_'));
      setProfilePhone(currentDriver.phone);
      setProfileAvatarUrl(currentDriver.avatarUrl || '');
      if (currentDriver.currentZone) {
        setSelectedZone(currentDriver.currentZone);
      }
    }
  }, [currentDriver]);

  // Fetch active Supabase user session and metadata
  const [userData, setUserData] = useState<any>(null);
  useEffect(() => {
    const fetchUserData = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUserData(user);
    };
    fetchUserData();
  }, []);

  // Update driver profile when propDriverProfile changes from Supabase
  useEffect(() => {
    if (propDriverProfile) {
      setCurrentDriver(propDriverProfile);
    }
  }, [propDriverProfile]);

  // Storage and custom sync event listeners (including instant passenger cancellation alert)
  useEffect(() => {
    const handleSync = () => {
      loadData();
    };

    const handleCancelledEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ tripId: string; driverId?: string; trip: TripOrder }>;
      const detail = customEvent.detail;
      if (!detail) return;
      if (currentDriver && (detail.driverId === currentDriver.id || activeJob?.id === detail.tripId)) {
        setActiveJob(null);
        setCancelledAlertTrip(detail.trip);
      }
    };

    window.addEventListener('safmove:drivers_sync', handleSync);
    window.addEventListener('safmove:trips_sync', handleSync);
    window.addEventListener('safmove:passenger_cancelled', handleCancelledEvent);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('safmove:drivers_sync', handleSync);
      window.removeEventListener('safmove:trips_sync', handleSync);
      window.removeEventListener('safmove:passenger_cancelled', handleCancelledEvent);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentDriver, activeJob]);

  // Polling data updates
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime subscription for trip status changes (cancellations)
  useEffect(() => {
    if (!currentDriver || !supabase) return;

    // Subscribe to UPDATE events on trips assigned to this driver
    const tripsSubscription = supabase
      .channel('trips-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `driver_id=eq.${currentDriver.id}`
        },
        (payload) => {
          const updatedTrip = payload.new as TripOrder;
          console.log('Realtime trip update:', updatedTrip);
          
          // Check if trip was cancelled
          if (updatedTrip.status === 'cancelled' && activeJob?.id === updatedTrip.id) {
            setActiveJob(null);
            setCancelledAlertTrip(updatedTrip);
            // Dispatch custom event for additional handling
            window.dispatchEvent(new CustomEvent('safmove:passenger_cancelled', {
              detail: { tripId: updatedTrip.id, driverId: currentDriver.id, trip: updatedTrip }
            }));
          } else if (updatedTrip.status === 'accepted' || updatedTrip.status === 'in_progress') {
            setActiveJob(updatedTrip);
          }
        }
      )
      .subscribe();

    // Subscribe to driver location updates
    const driversSubscription = supabase
      .channel('drivers-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${currentDriver.id}`
        },
        (payload) => {
          const updatedDriver = payload.new as DriverProfile;
          console.log('Realtime driver update:', updatedDriver);
          
          // Update driver location in state
          setCurrentDriver(updatedDriver);
        }
      )
      .subscribe();

    return () => {
      tripsSubscription.unsubscribe();
      driversSubscription.unsubscribe();
    };
  }, [currentDriver, activeJob]);

  // Simulate driver location updates (for demo purposes - in production, use GPS)
  useEffect(() => {
    if (!currentDriver || !currentDriver.isOnline) return;

    const updateLocation = async () => {
      // Small random movement to simulate GPS updates
      const latOffset = (Math.random() - 0.5) * 0.001;
      const lngOffset = (Math.random() - 0.5) * 0.001;
      const newLat = (currentDriver.currentLat || 5.6037) + latOffset;
      const newLng = (currentDriver.currentLng || -0.1870) + lngOffset;
      
      await SafMoveAPI.updateDriverLocation(currentDriver.id, newLat, newLng);
    };

    const interval = setInterval(updateLocation, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [currentDriver]);

  const loadData = async () => {
    const loadedDrivers = await SafMoveAPI.getDrivers();
    setDrivers(loadedDrivers);

    const sessionId = getStoredDriverSession();
    if (sessionId) {
      const updated = loadedDrivers.find((d) => d.id === sessionId);
      if (updated) {
        setCurrentDriver(updated);
      } else {
        // Session no longer valid - will be handled by auth state change in App.tsx
        setCurrentDriver(null);
      }
    }

    const loadedTrips = await SafMoveAPI.getTrips();
    setTrips(loadedTrips);

    if (sessionId) {
      const job = loadedTrips.find(
        (t) =>
          t.driverId === sessionId &&
          (t.status === 'accepted' || t.status === 'in_progress')
      );

      // Check if current activeJob was cancelled by passenger while driver was polling
      if (activeJob && !job) {
        const cancelledTrip = loadedTrips.find(
          (t) => t.id === activeJob.id && t.status === 'cancelled'
        );
        if (cancelledTrip) {
          setCancelledAlertTrip(cancelledTrip);
        }
      }

      setActiveJob(job || null);
    }
  };

  // Handle Driver Avatar File Upload
  const handleDriverAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDriver) return;
    setIsUploadingAvatar(true);
    try {
      const compressedDataUrl = await processImageFile(file, 280);
      setProfileAvatarUrl(compressedDataUrl);
      const updates = { avatarUrl: compressedDataUrl };
      let updated: DriverProfile | null = null;
      if (onUpdateDriver) {
        updated = await onUpdateDriver(currentDriver.id, updates);
      } else {
        updated = await SafMoveAPI.updateDriverProfile(currentDriver.id, updates);
      }
      if (updated) {
        setCurrentDriver(updated);
      } else {
        setCurrentDriver({ ...currentDriver, avatarUrl: compressedDataUrl });
      }
    } catch (err) {
      console.error('Failed to process driver avatar file', err);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Reset driver back to main map & "Online & Searching" on alert dismiss
  const handleReturnToActiveDispatch = async () => {
    setCancelledAlertTrip(null);
    setActiveJob(null);
    if (currentDriver) {
      await SafMoveAPI.toggleDriverOnline(currentDriver.id, true);
      setCurrentDriver((prev) => (prev ? { ...prev, isOnline: true } : null));
    }
    setActiveTab('home');
    await loadData();
  };

  // Handle Driver Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanHub = selectedHub.trim();
      const lowerHub = cleanHub.toLowerCase();
      const matchedHub = ACCRA_HUBS.find(
        (h) =>
          h.name.toLowerCase() === lowerHub ||
          h.id.toLowerCase() === lowerHub ||
          cleanHub.toLowerCase().includes(h.name.toLowerCase()) ||
          h.landmark.toLowerCase().includes(lowerHub)
      );
      const hubData = matchedHub || ACCRA_HUBS[0];

      const payload: Omit<DriverProfile, 'id' | 'status' | 'registeredAt' | 'totalTrips' | 'rating'> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        ghanaCardNumber: ghanaCard.trim(),
        motorcycleModel: motorcycleModel.trim(),
        motorcyclePlate: motorcyclePlate.trim(),
        driverLicenseNumber: licenseNumber.trim(),
        guarantorName: guarantorName.trim(),
        guarantorPhone: guarantorPhone.trim(),
        avatarUrl: registrationPhotoUrl || '',
        isOnline: false,
        currentZone: cleanHub,
        currentLat: hubData.lat,
        currentLng: hubData.lng,
        helmetVerified: true,
      };

      let newDriver: DriverProfile;
      if (onRegisterDriver) {
        newDriver = await onRegisterDriver(payload);
      } else {
        newDriver = await SafMoveAPI.registerDriver(payload);
      }

      saveDriverSession(newDriver.id);
      setCurrentDriver(newDriver);
      setIsRegistering(false);
      setRegistrationPhotoUrl('');
      await loadData();
    } catch (err) {
      console.error('Registration failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Logout / Switch Account
  const handleLogout = () => {
    // Session clearing handled by Supabase auth signOut in App.tsx
    setCurrentDriver(null);
    setIsRegistering(false);
    setIsEditingProfile(false);
    setActiveTab('home');
  };

  // Save Driver Profile Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDriver) return;
    setIsSavingProfile(true);
    try {
      const cleanUsername = profileUsername.trim().replace(/^@+/, '') || currentDriver.username || 'rider';
      const updates = {
        fullName: profileName.trim() || currentDriver.fullName,
        username: cleanUsername,
        phone: profilePhone.trim() || currentDriver.phone,
        avatarUrl: profileAvatarUrl.trim() || currentDriver.avatarUrl,
      };

      let updated: DriverProfile | null = null;
      if (onUpdateDriver) {
        updated = await onUpdateDriver(currentDriver.id, updates);
      } else {
        updated = await SafMoveAPI.updateDriverProfile(currentDriver.id, updates);
      }

      if (updated) {
        setCurrentDriver(updated);
      } else {
        setCurrentDriver({ ...currentDriver, ...updates });
      }

      setProfileSuccessMsg(true);
      setTimeout(() => {
        setProfileSuccessMsg(false);
        setIsEditingProfile(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to update driver profile', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Master Online Status
  const handleToggleOnline = async () => {
    if (!currentDriver || currentDriver.status !== 'approved') return;
    const newStatus = !currentDriver.isOnline;
    await SafMoveAPI.toggleDriverOnline(currentDriver.id, newStatus);
    setCurrentDriver({ ...currentDriver, isOnline: newStatus });
  };

  // Accept an incoming requested trip
  const handleAcceptTrip = async (tripId: string) => {
    if (!currentDriver || currentDriver.status !== 'approved') return;
    await SafMoveAPI.updateTripStatus(tripId, 'accepted', {
      driverId: currentDriver.id,
      driverName: currentDriver.fullName,
      driverPhone: currentDriver.phone,
      driverPlate: currentDriver.motorcyclePlate,
      driverPhoto: currentDriver.avatarUrl,
      driverModel: currentDriver.motorcycleModel,
      driverGhanaCard: currentDriver.ghanaCardNumber,
    });
    await loadData();
  };

  // Update Trip Status (Driver Actions - Zero Financials)
  const handleUpdateJobStatus = async (status: TripStatus) => {
    if (!activeJob) return;
    await SafMoveAPI.updateTripStatus(activeJob.id, status);
    await loadData();
  };

  // Filter completed trips for current driver (Zero Financials)
  const driverCompletedTrips = trips.filter(
    (t) => t.driverId === currentDriver?.id && t.status === 'completed'
  );

  // Available requests waiting for driver (when online and idle)
  const availableDispatchRequests = trips.filter(
    (t) => t.status === 'requested' && (!t.driverId || t.driverId === '')
  );

  // Stats calculations (Non-financial achievements)
  const completedTripsCount = currentDriver ? Math.max(currentDriver.totalTrips, driverCompletedTrips.length) : 0;
  const totalDistanceKm = (completedTripsCount * 5.4).toFixed(1);
  const reliabilityRate = completedTripsCount > 0 ? '99.8%' : '100%';

  // Render Header
  const renderHeader = () => (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToHome}
          className="p-2 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          title="Back to Landing"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-sm">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">SafMove Rider</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                DISPATCH
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Accra Motorcycle Transit</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PWAInstallButton />
        {currentDriver && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                currentDriver.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : currentDriver.status === 'pending'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  currentDriver.status === 'approved'
                    ? 'bg-emerald-600'
                    : currentDriver.status === 'pending'
                    ? 'bg-amber-600 animate-pulse'
                    : 'bg-rose-600'
                }`}
              />
              <span className="hidden sm:inline">
                {currentDriver.status === 'approved'
                  ? 'Verified'
                  : currentDriver.status === 'pending'
                  ? 'Review Pending'
                  : 'Inactive'}
              </span>
            </span>

            {/* Top Header Driver Profile Indicator */}
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              title="Rider Profile & Settings"
            >
              <div className="relative">
                <img
                  src={userData?.user_metadata?.avatar_url || currentDriver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`}
                  alt={userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver'}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-600"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`;
                  }}
                />
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white ${currentDriver.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </div>
              <span className="text-xs font-bold text-slate-900 hidden md:inline">
                {userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver'}
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  );

  // Render Fixed Bottom Navigation Bar (Home, History, Profile)
  const renderBottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/90 py-2 px-6 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
      <button
        id="driver-nav-home"
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center gap-1 transition-all py-1 px-4 rounded-2xl ${
          activeTab === 'home'
            ? 'text-emerald-800 font-black'
            : 'text-slate-600 hover:text-slate-900 font-semibold'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'home' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
          <Navigation className="w-5 h-5" />
        </div>
        <span className="text-[11px] tracking-tight">Home</span>
      </button>

      <button
        id="driver-nav-history"
        onClick={() => setActiveTab('history')}
        className={`flex flex-col items-center gap-1 transition-all py-1 px-4 rounded-2xl ${
          activeTab === 'history'
            ? 'text-emerald-800 font-black'
            : 'text-slate-600 hover:text-slate-900 font-semibold'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
          <Clock className="w-5 h-5" />
        </div>
        <span className="text-[11px] tracking-tight">History</span>
      </button>

      <button
        id="driver-nav-profile"
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center gap-1 transition-all py-1 px-4 rounded-2xl ${
          activeTab === 'profile'
            ? 'text-emerald-800 font-black'
            : 'text-slate-600 hover:text-slate-900 font-semibold'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
          <User className="w-5 h-5" />
        </div>
        <span className="text-[11px] tracking-tight">Profile</span>
      </button>
    </nav>
  );

  // Interactive Leaflet Map for Accra Dispatch
  const renderAccraMap = () => {
    // Center on Accra, Ghana
    const center: [number, number] = [5.6037, -0.1870];
    
    // Driver position
    const driverPos: [number, number] = [
      currentDriver?.currentLat || 5.6037,
      currentDriver?.currentLng || -0.1870
    ];

    // Pickup and dropoff for active job
    const pickupLocation = activeJob ? {
      lat: activeJob.pickupLocation.lat || 5.6037,
      lng: activeJob.pickupLocation.lng || -0.1870,
      name: activeJob.pickupLocation.name
    } : undefined;

    const dropoffLocation = activeJob ? {
      lat: activeJob.dropoffLocation.lat || 5.5583,
      lng: activeJob.dropoffLocation.lng || -0.2185,
      name: activeJob.dropoffLocation.name
    } : undefined;

    return (
      <div className="relative w-full h-[46vh] sm:h-[54vh] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100">
        <LeafletMap
          center={center}
          zoom={13}
          pickup={pickupLocation}
          dropoff={dropoffLocation}
          driver={currentDriver?.isOnline ? {
            lat: driverPos[0],
            lng: driverPos[1],
            name: currentDriver.fullName
          } : undefined}
          showRoute={!!activeJob}
          className="w-full h-full"
        />

        {/* Top-Left Operating Hub Chip (Pure White with shadow-md) */}
        <div className="absolute top-3 left-3 bg-white px-4 py-2 rounded-full border border-slate-300 shadow-md flex items-center gap-2 text-xs font-bold text-slate-900 z-[1000]">
          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
          <span>{currentDriver?.currentZone || focusedHub} Hub</span>
        </div>

        {/* Top-Right Online/Offline Live Status Badge (Pure White with shadow-md) */}
        <div className="absolute top-3 right-3 bg-white px-3.5 py-2 rounded-full border border-slate-300 shadow-md flex items-center gap-2 text-xs font-black z-[1000]">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              currentDriver?.isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className={currentDriver?.isOnline ? 'text-emerald-800' : 'text-slate-700'}>
            {currentDriver?.isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Bottom Route / Distance Indicator when Active Job */}
        {activeJob && (
          <div className="absolute bottom-3 left-3 right-3 bg-white p-3 rounded-2xl border border-slate-300 shadow-lg flex items-center justify-between text-xs z-[1000]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs">
                To: {activeJob.dropoffLocation.name}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-bold">
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>Route Active</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render VIEW 1: Registration Form (Clean Light Theme & High-Contrast Typography)
  if (isRegistering) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {renderHeader()}
        <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Rider Registration</h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Accra verified motorcycle transport & dispatch onboarding</p>
              </div>
              <button
                onClick={() => setIsRegistering(false)}
                className="p-2 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs sm:text-sm">
              {/* Native Image Upload & Preview Only */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <label className="block text-xs sm:text-sm font-bold text-slate-900">
                  Profile Photo (Rider Portrait)
                </label>

                {/* Centered Live Preview Image */}
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      id="driver-photo-preview"
                      src={registrationPhotoUrl || 'https://via.placeholder.com/150?text=Photo'}
                      alt="Driver Photo Preview"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-white shadow-md bg-white"
                    />
                    {registrationPhotoUrl && (
                      <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                        ✓
                      </span>
                    )}
                  </div>
                </div>

                {/* Choose File Selector Button */}
                <div className="max-w-xs mx-auto pt-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="driver-register-photo-input"
                    onChange={handleRegistrationPhotoChange}
                    className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer cursor-pointer bg-white rounded-xl border border-slate-300 p-1 focus:outline-none"
                  />
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kwame Osei Asante"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 24 123 4567"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* National ID & License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ghana Card (National ID)</label>
                  <input
                    type="text"
                    required
                    value={ghanaCard}
                    onChange={(e) => setGhanaCard(e.target.value)}
                    placeholder="GHA-712849012-3"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">DVLA Motorcycle License</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="DL-ACC-2024-8812"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Motorcycle Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Motorcycle Make & Model</label>
                  <input
                    type="text"
                    required
                    value={motorcycleModel}
                    onChange={(e) => setMotorcycleModel(e.target.value)}
                    placeholder="e.g. Haojue 125cc / Bajaj Boxer 150 HD"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Motorcycle Plate Number</label>
                  <input
                    type="text"
                    required
                    value={motorcyclePlate}
                    onChange={(e) => setMotorcyclePlate(e.target.value)}
                    placeholder="GR-24-1092"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Guarantor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Guarantor Name (Accra Resident)</label>
                  <input
                    type="text"
                    required
                    value={guarantorName}
                    onChange={(e) => setGuarantorName(e.target.value)}
                    placeholder="e.g. Pastor James Osei"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Guarantor Phone</label>
                  <input
                    type="tel"
                    required
                    value={guarantorPhone}
                    onChange={(e) => setGuarantorPhone(e.target.value)}
                    placeholder="+233 20 889 1234"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Accra Hub / Area Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Primary Accra Base Hub / Area
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">Select or type custom station</span>
                </label>
                <input
                  type="text"
                  list="accra-hubs-datalist"
                  id="input-driver-hub"
                  required
                  value={selectedHub}
                  onChange={(e) => {
                    setSelectedHub(e.target.value);
                    setSelectedZone(e.target.value);
                  }}
                  placeholder="Select or type station e.g. Kwame Nkrumah Circle"
                  className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
                <datalist id="accra-hubs-datalist">
                  {ACCRA_HUBS.map((hub) => (
                    <option key={`hub_opt_${hub.id}`} value={hub.name}>
                      {hub.landmark}
                    </option>
                  ))}
                  <option value="Lapaz Station" />
                  <option value="Achimota Neoplan" />
                  <option value="Spintex Manet Junction" />
                  <option value="Dansoman Last Stop" />
                  <option value="Tema Community 1 Market" />
                </datalist>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-submit-driver-registration"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm transition shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit Profile for Admin Verification'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Render VIEW 2: Clean Slate Login (When Not Logged In)
  if (!currentDriver) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {renderHeader()}
        <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <Bike className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">Rider Portal Sign In</h3>
              <p className="text-xs text-slate-600 font-medium">
                Please sign in with your Supabase account to access the driver portal.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4 text-center space-y-2">
              <p className="text-xs text-slate-600">New rider in Greater Accra?</p>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="w-full py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition flex items-center justify-center gap-2"
              >
                <Bike className="w-4 h-4 text-emerald-700" /> Register as a New SafMove Rider
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render VIEW 3: Pending Approval Lock Screen
  if (currentDriver.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {renderHeader()}
        <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
          <div className="bg-white border-2 border-amber-200 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-10 h-10 text-amber-600 animate-pulse" />
            </div>

            <div>
              <span className="text-[12px] uppercase tracking-wider font-bold text-amber-800 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200 inline-block mb-4">
                Account Pending Approval
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4">
                Welcome to SafMove!
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-md mx-auto">
                Your account is currently pending Admin approval. We are verifying your Ghana Card and vehicle details. Check back soon.
              </p>
            </div>

            {/* Application Summary */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Full Name:</span>
                <span className="font-bold text-slate-900">{currentDriver.fullName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Contact Phone:</span>
                <span className="font-bold text-slate-900">{currentDriver.phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Motorcycle:</span>
                <span className="font-mono font-bold text-slate-900">{currentDriver.motorcycleModel} ({currentDriver.motorcyclePlate})</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 font-medium">Ghana Card:</span>
                <span className="font-mono font-bold text-slate-900">{currentDriver.ghanaCardNumber}</span>
              </div>
            </div>

            {/* Review Stepper */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>1. Application Submitted</span>
              </div>
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <Clock className="w-4 h-4 text-amber-700 flex-shrink-0 animate-spin" />
                <span>2. Admin Review & Verification</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>3. Live Dispatch Activation</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={loadData}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" /> Check Approval Status
              </button>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="text-xs text-slate-600 hover:text-slate-900 hover:underline pt-1 flex items-center justify-center gap-1 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }



  // Render MAIN APPROVED DRIVER APP (Tabs: Home, History, Profile)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      {renderHeader()}

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-5">
        {/* ========================================================================= */}
        {/* TAB 1: HOME (DISPATCH MAP & MASTER ONLINE SWITCH)                          */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Dynamic Rider Greeting & Operational Status Banner */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-4.5 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setActiveTab('profile')}
                  title="View Rider Profile & Avatar"
                >
                  <img
                    src={userData?.user_metadata?.avatar_url || currentDriver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`}
                    alt={userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver'}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-600 shadow-xs group-hover:scale-105 transition"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.user_metadata?.full_name || currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`;
                    }}
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-1 ring-emerald-600/30 ${currentDriver.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {timeGreeting}, {userData?.user_metadata?.full_name?.split(' ')[0] || currentDriver.fullName.split(' ')[0]}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {currentDriver.motorcycleModel} ({currentDriver.motorcyclePlate}) · Base: {currentDriver.currentZone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setProfileName(currentDriver.fullName);
                  setProfileUsername(currentDriver.username || currentDriver.fullName.toLowerCase().replace(/\s+/g, '_'));
                  setProfilePhone(currentDriver.phone);
                  setProfileAvatarUrl(currentDriver.avatarUrl || '');
                  setIsEditingProfile(true);
                  setActiveTab('profile');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer flex-shrink-0"
                title="Edit Username & Profile"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
            </div>

            {/* Map Interface Taking Up Majority of Screen */}
            {renderAccraMap()}

            {/* ACTIVE ASSIGNED JOB CARD (Non-Transactional / Zero Financials) */}
            {activeJob ? (
              <div className="p-5 rounded-3xl bg-white border-2 border-emerald-600 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                    <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                      Active Dispatch Job
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                    {activeJob.serviceType === 'parcel' ? 'Express Parcel' : 'Passenger Ride'}
                  </span>
                </div>

                {/* Customer Details & Call Button (With Uploaded Profile Photo & Username) */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeJob.userPhoto || 'https://via.placeholder.com/150?text=User'}
                      alt={activeJob.userName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-300 shadow-xs"
                    />
                    <div>
                      <span className="text-[10px] text-slate-600 font-bold uppercase block">Customer Commuter</span>
                      <p className="text-sm font-black text-slate-900 leading-tight">
                        {activeJob.userName}
                        {activeJob.userUsername && (
                          <span className="text-xs font-bold text-emerald-800 ml-1.5">
                            @{activeJob.userUsername}
                          </span>
                        )}
                      </p>
                      <span className="text-[11px] font-mono text-slate-700 font-bold">{activeJob.userPhone}</span>
                    </div>
                  </div>
                  <a
                    href={`tel:${activeJob.userPhone}`}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call
                  </a>
                </div>

                {/* Route: Pickup & Dropoff (Zero Prices) */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px] mt-0.5 flex-shrink-0">
                      P
                    </div>
                    <div>
                      <span className="text-slate-600 text-[10px] uppercase font-bold block">Pickup Location</span>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{activeJob.pickupLocation.name}</p>
                      <p className="text-xs text-slate-600">{activeJob.pickupLocation.landmark}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] mt-0.5 flex-shrink-0">
                      D
                    </div>
                    <div>
                      <span className="text-slate-600 text-[10px] uppercase font-bold block">Drop-off Destination</span>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{activeJob.dropoffLocation.name}</p>
                      <p className="text-xs text-slate-600">{activeJob.dropoffLocation.landmark}</p>
                    </div>
                  </div>
                </div>

                {/* Stepper Status Buttons (No Financials / Payment collection) */}
                <div className="pt-1">
                  {activeJob.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateJobStatus('in_progress')}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm tracking-wide transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" /> Picked Up &rarr; Start Journey
                    </button>
                  )}

                  {activeJob.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateJobStatus('completed')}
                      className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm tracking-wide transition shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" /> Confirm Drop-off / Mark Job Completed
                    </button>
                  )}
                </div>
              </div>
            ) : currentDriver.isOnline ? (
              /* ONLINE IDLE: INCOMING DISPATCH OPPORTUNITIES OR SCANNING RADAR */
              <div className="space-y-3">
                {availableDispatchRequests.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                        Available Nearby Dispatches
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {availableDispatchRequests.length} Ready
                      </span>
                    </div>

                    {availableDispatchRequests.slice(0, 3).map((req) => (
                      <div
                        key={`avail_${req.id}`}
                        className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={req.userPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={req.userName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-300 shadow-xs flex-shrink-0"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 uppercase">
                                {req.serviceType}
                              </span>
                              <span className="text-xs font-black text-slate-900">{req.userName}</span>
                              {req.userUsername && (
                                <span className="text-[11px] font-bold text-emerald-800">@{req.userUsername}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 font-medium">
                              <strong className="text-slate-900">{req.pickupLocation.name}</strong> &rarr; {req.dropoffLocation.name}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcceptTrip(req.id)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept Dispatch
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-xs">
                    <div className="flex items-center justify-center gap-2 text-emerald-800 font-black text-xs">
                      <Radio className="w-4 h-4 animate-pulse text-emerald-700" />
                      <span>Online & Searching for Commuter Requests</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Stationed in <strong className="text-slate-900">{currentDriver.currentZone}</strong>. New requests within 5 km will alert instantly.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* OFFLINE IDLE CARD */
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-1 shadow-xs">
                <p className="text-xs font-black text-slate-900">Currently Offline</p>
                <p className="text-xs text-slate-600 font-medium">
                  Turn on the master switch below to start receiving real-time passenger & courier requests.
                </p>
              </div>
            )}

            {/* MASSIVE, HIGH-CONTRAST, PILL-SHAPED MASTER SWITCH ("GO ONLINE" / "GO OFFLINE") */}
            <div className="pt-2">
              <button
                id="driver-master-switch-btn"
                onClick={handleToggleOnline}
                className={`w-full py-4 sm:py-5 px-8 rounded-full font-black text-base sm:text-lg tracking-wider uppercase shadow-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                  currentDriver.isOnline
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/30 border-2 border-slate-700'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-700/30 border-2 border-emerald-500'
                }`}
              >
                <Power className={`w-6 h-6 stroke-[3] ${currentDriver.isOnline ? 'text-rose-400' : 'text-white'}`} />
                <span>{currentDriver.isOnline ? 'GO OFFLINE' : 'GO ONLINE'}</span>
              </button>

              <p className="text-center text-xs text-slate-600 mt-2 font-semibold">
                {currentDriver.isOnline
                  ? `🟢 Active in ${currentDriver.currentZone} • Ready for Dispatch`
                  : '⚪ Offline • Tap to broadcast availability to Accra riders'}
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HISTORY (PAST COMPLETED TRIPS - ZERO FINANCIALS)                   */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Trip History</h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Completed dispatch routes across Accra</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-800">
                {driverCompletedTrips.length} Rides
              </span>
            </div>

            {/* History Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                  historyFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Rides
              </button>
              <button
                onClick={() => setHistoryFilter('passenger')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                  historyFilter === 'passenger'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Passenger
              </button>
              <button
                onClick={() => setHistoryFilter('parcel')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                  historyFilter === 'parcel'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Courier
              </button>
            </div>

            {/* Trip History List */}
            {driverCompletedTrips.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">No completed trips yet</h4>
                <p className="text-xs text-slate-600">
                  Switch to the Home tab and go online to receive your first ride or courier dispatch.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {driverCompletedTrips
                  .filter((t) => historyFilter === 'all' || t.serviceType === historyFilter)
                  .map((t) => (
                    <div
                      key={`hist_${t.id}`}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-700 text-xs font-bold">{t.id}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Completed ✓
                          </span>
                          <span className="text-xs text-slate-600 font-medium">
                            {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex-shrink-0" />
                          <span className="font-bold text-slate-900">{t.pickupLocation.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 flex-shrink-0" />
                          <span className="font-bold text-slate-900">{t.dropoffLocation.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600">
                        <span className="capitalize font-medium">{t.serviceType === 'parcel' ? 'Express Courier' : 'Passenger Transit'}</span>
                        <span className="font-bold text-slate-800">Customer: {t.userName}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROFILE (REDESIGNED CENTERED LAYOUT, STATS STRIP, RECENT TRIPS)    */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            {/* Centered Profile Layout: Avatar with Camera Badge, Full Name, Username, Rating */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm text-center space-y-3">
              <div className="relative inline-block mx-auto group">
                <img
                  src={currentDriver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`}
                  alt={currentDriver.fullName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl mx-auto ring-4 ring-emerald-500/10 cursor-pointer hover:opacity-95 transition"
                  onClick={() => driverAvatarInputRef.current?.click()}
                  title="Click to change profile photo"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`;
                  }}
                />
                <button
                  type="button"
                  onClick={() => driverAvatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg border-2 border-white transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                  title="Upload New Profile Picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={driverAvatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDriverAvatarFile}
                  className="hidden"
                />
              </div>

              {isUploadingAvatar && (
                <p className="text-xs font-bold text-emerald-800 animate-pulse">Uploading and optimizing photo...</p>
              )}

              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{currentDriver.fullName}</h3>
                  <button
                    onClick={() => {
                      setProfileName(currentDriver.fullName);
                      setProfileUsername(currentDriver.username || currentDriver.fullName.toLowerCase().replace(/\s+/g, '_'));
                      setProfilePhone(currentDriver.phone);
                      setProfileAvatarUrl(currentDriver.avatarUrl || '');
                      setIsEditingProfile(true);
                    }}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    title="Edit Name & Username"
                  >
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>

                <p className="text-xs text-emerald-800 font-bold mt-0.5">@{currentDriver.username || 'rider'}</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 text-sm font-bold text-emerald-800">
                  <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                  <span>★ {currentDriver.rating.toFixed(1)} · Verified Safety Rider</span>
                </div>
                <p className="text-xs text-slate-700 font-mono font-bold mt-1">
                  {currentDriver.motorcycleModel} • {currentDriver.motorcyclePlate}
                </p>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setProfileName(currentDriver.fullName);
                      setProfileUsername(currentDriver.username || currentDriver.fullName.toLowerCase().replace(/\s+/g, '_'));
                      setProfilePhone(currentDriver.phone);
                      setProfileAvatarUrl(currentDriver.avatarUrl || '');
                      setIsEditingProfile(true);
                    }}
                    className="text-[11px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* HORIZONTAL STATS STRIP TRACKING NON-FINANCIAL ACHIEVEMENTS */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="text-xs text-slate-700 font-bold block">Completed Trips</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{completedTripsCount}</p>
                <span className="text-[11px] text-emerald-800 font-bold flex items-center justify-center gap-0.5 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Logged
                </span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="text-xs text-slate-700 font-bold block">Distance (km)</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalDistanceKm}</p>
                <span className="text-[11px] text-slate-600 font-medium block mt-0.5">Accra Metro</span>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
                <span className="text-xs text-slate-700 font-bold block">Reliability %</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">{reliabilityRate}</p>
                <span className="text-[11px] text-slate-600 font-medium block mt-0.5">Safety Rate</span>
              </div>
            </div>

            {/* PROFILE EDIT DRAWER / MODAL */}
            {isEditingProfile && (
              <div className="bg-white border-2 border-emerald-600 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-slate-900">Edit Rider Profile Information</h4>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="p-1 rounded-xl text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {profileSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" /> Profile updated successfully!
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs sm:text-sm">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Rider Username (Handle)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">@</span>
                      <input
                        type="text"
                        required
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                        placeholder="rider_username"
                        className="w-full rounded-xl bg-white border border-slate-300 pl-8 pr-3.5 py-2.5 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Mobile Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Profile Photo</label>
                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={profileAvatarUrl || currentDriver.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`}
                        alt="Preview"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-300"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDriver.fullName || 'Driver')}&background=0D8ABC&color=fff&rounded=true`;
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => driverAvatarInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Choose New Photo</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* RECENT TRIPS LIST */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900">Recent Completed Trips</h4>
                <span className="text-xs font-bold text-slate-600">Non-financial log</span>
              </div>

              {driverCompletedTrips.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-600 font-medium">
                  No recent completed trips logged. Start taking dispatches on the Home tab!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {driverCompletedTrips.slice(0, 4).map((trip) => (
                    <div key={`rec_${trip.id}`} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">
                          {trip.pickupLocation.name} &rarr; {trip.dropoffLocation.name}
                        </p>
                        <p className="text-xs text-slate-600 font-medium">
                          {new Date(trip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {trip.serviceType}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={async () => {
                if (onSignOut) {
                  await onSignOut();
                }
              }}
              className="w-full py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            {/* Rider Credentials & Compliance Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Verification & Compliance</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 block text-[11px] font-bold">Ghana Card</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{currentDriver.ghanaCardNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 block text-[11px] font-bold">DVLA License</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{currentDriver.driverLicenseNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 block text-[11px] font-bold">Motorcycle Plate</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">{currentDriver.motorcyclePlate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 block text-[11px] font-bold">Assigned Station</span>
                  <span className="font-bold text-emerald-800 text-xs">{currentDriver.currentZone}</span>
                </div>
              </div>
            </div>

            {/* Logout / Switch Account */}
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" /> Switch / Log Out Rider Account
              </button>
            </div>
          </div>
        )}
      </main>

      {/* High-Visibility Instant Passenger Cancellation Alert Modal */}
      {cancelledAlertTrip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border-2 border-rose-300 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Dispatch Cancelled
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Trip Cancelled by Passenger</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
                The commuter has cancelled this dispatch request.
              </p>
            </div>

            {/* Trip Details Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Commuter:</span>
                <span className="font-bold text-slate-900">{cancelledAlertTrip.userName}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-slate-900 truncate">{cancelledAlertTrip.pickupLocation.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <div className="w-2 h-2 rounded-full bg-slate-900 flex-shrink-0" />
                  <span className="font-medium text-slate-900 truncate">{cancelledAlertTrip.dropoffLocation.name}</span>
                </div>
              </div>
            </div>

            {/* Single Primary Action Button */}
            <button
              onClick={handleReturnToActiveDispatch}
              className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm tracking-wide uppercase shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Return to Active Dispatch</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      {renderBottomNav()}
    </div>
  );
};
