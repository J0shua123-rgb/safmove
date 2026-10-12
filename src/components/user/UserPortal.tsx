import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  Package, 
  Clock, 
  Share2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Phone, 
  ChevronRight, 
  Shield, 
  Zap, 
  User, 
  Edit3, 
  Save, 
  X, 
  Compass, 
  Radio, 
  Check,
  Star,
  ExternalLink,
  Camera,
  Upload,
  LogOut,
  Loader2,
  Receipt,
} from 'lucide-react';
import { SOSEmergencyButton } from '../common/SOSEmergencyButton';
import { FareEstimator } from '../common/FareEstimator';
import { TripRatingModal } from '../common/TripRatingModal';
import { TripReceipt } from '../common/TripReceipt';
import { DriverETATracker } from '../common/DriverETATracker';
import { MoMoPaymentModal } from '../common/MoMoPaymentModal';
import { useToast } from '../common/ToastNotification';
import { 
  AccraLocation, 
  DriverProfile, 
  ServiceType, 
  TripOrder,
  UserProfile
} from '../../types';
import { 
  ACCRA_POPULAR_LOCATIONS, 
  ACCRA_HUBS, 
  ACCRA_HOTLINES, 
  calculateDistanceKm, 
  generateWhatsAppSafetyShareUrl 
} from '../../lib/accraData';
import {
  SafMoveAPI,
  getLocalPassengerProfile,
  saveLocalPassengerProfile,
  supabase
} from '../../lib/supabase';
import { processImageFile } from '../../lib/imageUtils';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { MapboxMap } from '../MapboxMap';
import { initializeSimulatedDrivers, startDriverSimulation, stopDriverSimulation } from '../../lib/simulateDrivers';

interface UserPortalProps {
  onBackToHome: () => void;
  onSwitchToDriver: () => void;
  drivers?: DriverProfile[];
  userProfile?: UserProfile | null;
  onSignOut?: () => Promise<void>;
}

type UserNavTab = 'home' | 'history' | 'profile';

export const UserPortal: React.FC<UserPortalProps> = ({
  onBackToHome,
  onSwitchToDriver,
  drivers: propDrivers,
  userProfile: propUserProfile,
  onSignOut,
}) => {
  const [drivers, setDrivers] = useState<DriverProfile[]>(propDrivers || []);
  const [activeTab, setActiveTab] = useState<UserNavTab>('home');

  // Booking / Search Flow State
  const [serviceType, setServiceType] = useState<ServiceType>('passenger');
  const [pickup, setPickup] = useState<AccraLocation>(ACCRA_POPULAR_LOCATIONS[0]); // Circle
  const [dropoff, setDropoff] = useState<AccraLocation>(ACCRA_POPULAR_LOCATIONS[1]); // East Legon
  const [packageNotes, setPackageNotes] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [calculatedFare, setCalculatedFare] = useState<number>(0);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Post-trip modals
  const [tripToRate, setTripToRate] = useState<TripOrder | null>(null);
  const [tripReceipt, setTripReceipt] = useState<TripOrder | null>(null);
  const [completedTripRating, setCompletedTripRating] = useState<number>(0);
  const [showMomoModal, setShowMomoModal] = useState(false);

  // Toast notifications
  const { showToast } = useToast();

  // Persistent Passenger Profile State - use Supabase profile or fallback to local storage
  const [passengerProfile, setPassengerProfile] = useState<UserProfile | null>(() => {
    if (propUserProfile) return propUserProfile;
    const profile = getLocalPassengerProfile();
    if (profile) return profile;
    return null;
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile Edit Form State
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTrustedName, setEditTrustedName] = useState('');
  const [editTrustedPhone, setEditTrustedPhone] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Sync passenger profile across tabs and components
  useEffect(() => {
    const handleProfileSync = () => {
      const fresh = getLocalPassengerProfile();
      setPassengerProfile(fresh);
    };
    window.addEventListener('safmove:passenger_profile_sync', handleProfileSync);
    window.addEventListener('storage', handleProfileSync);
    return () => {
      window.removeEventListener('safmove:passenger_profile_sync', handleProfileSync);
      window.removeEventListener('storage', handleProfileSync);
    };
  }, []);

  // Update profile when propUserProfile changes from Supabase
  useEffect(() => {
    if (propUserProfile) {
      setPassengerProfile(propUserProfile);
      saveLocalPassengerProfile(propUserProfile);
    }
  }, [propUserProfile]);

  // Fetch active Supabase user session and metadata — MUST be declared before the auto-profile effect below
  const [userData, setUserData] = useState<any>(null);
  useEffect(() => {
    const fetchUserData = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUserData(user);
    };
    fetchUserData();
  }, []);

  // Auto-create passenger profile for new Supabase users who have no local profile (fixes deadlock)
  useEffect(() => {
    if (!passengerProfile && userData) {
      const autoProfile: UserProfile = {
        id: userData.id,
        username: userData.email?.split('@')[0] || 'user',
        fullName: userData.user_metadata?.full_name || userData.email?.split('@')[0] || 'SafMove User',
        phone: userData.user_metadata?.phone || '',
        email: userData.email || '',
        avatarUrl: userData.user_metadata?.avatar_url || '',
        role: 'user',
        trustedContactName: '',
        trustedContactPhone: '',
        createdAt: userData.created_at || new Date().toISOString(),
      };
      setPassengerProfile(autoProfile);
      saveLocalPassengerProfile(autoProfile);
    }
  }, [userData, passengerProfile]);


  // Crop Modal State
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);

  // Real-time driver locations state
  const [activeDrivers, setActiveDrivers] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Ride subscription state
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);

  // Fetch initial driver locations from Supabase
  // Note: driver_locations is optional — falls back gracefully if table doesn't exist
  useEffect(() => {
    if (!supabase) return;

    const fetchDriverLocations = async () => {
      try {
        const { data, error } = await supabase!
          .from('driver_locations')
          .select('*')
          .eq('is_active', true)
          .order('last_updated', { ascending: false });

        // Soft fail — table may not exist in all envs
        if (!error && data) {
          setActiveDrivers(data);
        }
      } catch {
        // Silently ignore — driver_locations is optional
      }
    };

    fetchDriverLocations();

    const channel = supabase
      .channel('driver_tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setActiveDrivers((prev) => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setActiveDrivers((prev) =>
            prev.map((driver) => (driver.id === payload.new.id ? payload.new : driver))
          );
        } else if (payload.eventType === 'DELETE') {
          setActiveDrivers((prev) => prev.filter((driver) => driver.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  // Update edit fields whenever passengerProfile updates
  useEffect(() => {
    if (passengerProfile) {
      setEditFullName(passengerProfile.fullName);
      setEditUsername(passengerProfile.username || '');
      setEditPhone(passengerProfile.phone);
      setEditTrustedName(passengerProfile.trustedContactName || '');
      setEditTrustedPhone(passengerProfile.trustedContactPhone || '');
    }
  }, [passengerProfile]);

  // Handle Avatar Image File Upload - Show Crop Modal
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropModal(true);
    // Reset input value so same file can be reselected if needed
    e.target.value = '';
  };

  // Utility function to crop image using canvas
  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;

    return new Promise((resolve) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(new Blob());
          return;
        }

        const maxSize = 400;
        canvas.width = maxSize;
        canvas.height = maxSize;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scale to fit the crop area into the canvas
        const scaleX = maxSize / pixelCrop.width;
        const scaleY = maxSize / pixelCrop.height;
        const scale = Math.min(scaleX, scaleY);

        // Calculate offset to center the image
        const offsetX = (maxSize - pixelCrop.width * scale) / 2;
        const offsetY = (maxSize - pixelCrop.height * scale) / 2;

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          offsetX,
          offsetY,
          pixelCrop.width * scale,
          pixelCrop.height * scale
        );

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(new Blob());
          }
        }, 'image/jpeg', 0.9);
      };
    });
  };

  // Handle crop completion and upload to Supabase
  const handleCropComplete = async (croppedAreaPixels: any) => {
    if (!selectedImage || !passengerProfile) return;

    setIsApplyingCrop(true);
    try {
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);

      // Upload to Supabase
      if (croppedBlob && supabase) {
        const fileExt = 'jpg';
        const fileName = `${userData?.user_metadata?.full_name?.replace(/\s+/g, '_') || 'user'}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, croppedBlob);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update local profile
        const updatedProfile: UserProfile = {
          ...passengerProfile,
          avatarUrl: publicUrl,
        };
        setPassengerProfile(updatedProfile);
        saveLocalPassengerProfile(updatedProfile);

        // Update Supabase user metadata
        if (userData) {
          await supabase.auth.updateUser({
            data: { avatar_url: publicUrl }
          });
        }
      }
    } catch (err) {
      console.error('Failed to crop or upload avatar', err);
    } finally {
      setIsApplyingCrop(false);
      setShowCropModal(false);
      setSelectedImage(null);
    }
  };

  // Fare calculation utility using Haversine formula
  const calculateFare = (pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (dropoffLat - pickupLat) * (Math.PI / 180);
    const dLng = (dropoffLng - pickupLng) * (Math.PI / 180);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pickupLat * (Math.PI / 180)) * Math.cos(dropoffLat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    
    // Base fare: GH₵ 5.00 + GH₵ 2.50 per km
    const baseFare = 5.00;
    const ratePerKm = 2.50;
    const fare = baseFare + (distance * ratePerKm);
    
    return Math.round(fare * 100) / 100; // Round to 2 decimal places
  };

  // Search Radar State
  const [isSearchingRider, setIsSearchingRider] = useState(false);
  const [searchStep, setSearchStep] = useState(1);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState<TripOrder | null>(null);
  const [pastTrips, setPastTrips] = useState<TripOrder[]>([]);
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);

  // Sync propDrivers when provided
  useEffect(() => {
    if (propDrivers) {
      setDrivers(propDrivers.filter((d) => d.status === 'approved'));
    }
  }, [propDrivers]);

  // Load active drivers & trips on mount and polling
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    const allDrivers = await SafMoveAPI.getDrivers();
    setDrivers(allDrivers.filter((d) => d.status === 'approved'));

    const allTrips = await SafMoveAPI.getTrips();
    const myUserId = userData?.id || passengerProfile?.id;

    // FIX: Filter trips by userId to prevent data leaking between passengers
    const myTrips = myUserId
      ? allTrips.filter((t) => t.userId === myUserId)
      : allTrips;

    const currentActive = myTrips.find(
      (t) =>
        t.status === 'requested' ||
        t.status === 'accepted' ||
        t.status === 'arriving' ||
        t.status === 'in_progress'
    );
    setActiveTrip(currentActive || null);

    // Past completed trips for this user
    const completed = myTrips.filter((t) => t.status === 'completed');
    setPastTrips(completed);
  }, [userData?.id, passengerProfile?.id]);

  // Route Calculations (Pure Distance & Time - Zero Financials)
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  const estDurationMinutes = Math.max(5, Math.round(distanceKm * 2.8));

  // Identify nearby available verified rider
  const approvedDrivers = drivers.filter((d) => d.status === 'approved');
  const onlineDrivers = approvedDrivers.filter((d) => d.isOnline);
  const matchedRider =
    onlineDrivers.find((d) => d.currentZone?.toLowerCase().includes(pickup.name.toLowerCase())) ||
    (onlineDrivers.length > 0 ? onlineDrivers[0] : approvedDrivers[0]);

  // Handle Request Trip (Supabase-based booking flow into 'rides' table)
  const handleRequestTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setIsSearchingRider(true);
    setSearchStep(1);

    try {
      // Calculate fare
      const fare = calculateFare(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      setCalculatedFare(fare);

      // Save to Supabase 'rides' table with local fallback via SafMoveAPI
      const rideData = await SafMoveAPI.dispatchRideRequest({
        passenger_id: userData?.id || 'guest-passenger',
        passenger_name: userData?.user_metadata?.full_name || passengerProfile?.fullName || 'Daniel',
        passenger_phone: userData?.user_metadata?.phone || passengerProfile?.phone || '+233 24 123 4567',
        pickup_address: pickup.name,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.name,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        fare_amount: fare,
        status: 'searching',
      });

      if (!rideData) {
        throw new Error('Could not create ride dispatch request');
      }

      setCurrentRideId(rideData.id);
      setSearchStep(2);

      // Subscribe to real-time status updates on 'rides' table
      const unsubscribe = SafMoveAPI.subscribeToRide(rideData.id, (payload) => {
        if (payload.status === 'accepted') {
          setSearchStep(3);
          setActiveTrip({
            id: payload.id,
            userId: payload.passenger_id || 'guest',
            userName: payload.passenger_name || 'Daniel',
            userPhone: payload.passenger_phone || '+233 24 123 4567',
            userPhoto: userData?.user_metadata?.avatar_url || '',
            driverId: payload.driver_id || 'driver-matched',
            driverName: payload.driver_name || 'SafMove Verified Rider',
            driverPhone: payload.driver_phone || '+233 24 888 9999',
            driverPhoto: '',
            driverModel: 'Motorcycle',
            driverPlate: payload.driver_plate || 'GR-24-4502',
            serviceType: serviceType,
            pickupLocation: pickup,
            dropoffLocation: dropoff,
            distanceKm: calculateDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng),
            estDurationMinutes: Math.max(5, Math.round(calculateDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) * 2.8)),
            fareGHS: fare,
            surgeMultiplier: 1,
            paymentMethod: 'cash',
            paymentStatus: 'pending',
            status: 'accepted' as any,
            createdAt: payload.created_at,
            updatedAt: payload.updated_at,
            liveShareToken: '',
          });
        } else if (payload.status === 'in_progress') {
          setActiveTrip((prev) => (prev ? { ...prev, status: 'in_progress' as any } : null));
        } else if (payload.status === 'completed') {
          setIsSearchingRider(false);
          setActiveTrip(null);
          loadData();
        } else if (payload.status === 'cancelled') {
          setIsSearchingRider(false);
          setActiveTrip(null);
        }
      });

      // Simulation fallback: Only in DEV mode — simulates auto-accept so demo works without real drivers
      // GUARD: This block is stripped in production builds
      const autoAcceptTimeout = import.meta.env.DEV ? setTimeout(async () => {
        if (rideData.id) {
          const activeDriver = activeDrivers.length > 0 ? activeDrivers[0] : null;
          await SafMoveAPI.acceptRide(rideData.id, {
            id: activeDriver?.driver_id || 'drv_auto_1',
            fullName: 'Kwesi Mensah (Demo)',
            phone: '+233 24 555 1234',
            motorcyclePlate: 'GR-24-4502',
            motorcycleModel: 'Boxer 150',
            status: 'approved',
            isOnline: true,
            currentZone: 'Circle',
            currentLat: pickup.lat,
            currentLng: pickup.lng,
            rating: 4.9,
            totalTrips: 120,
            helmetVerified: true,
            registeredAt: new Date().toISOString(),
            ghanaCardNumber: 'GHA-123456789-0',
            driverLicenseNumber: 'DL-9988',
            guarantorName: 'Pastor James',
            guarantorPhone: '+233 20 111 2222',
          });
          showToast({ type: 'ride', title: '🛵 Rider Matched!', message: 'Kwesi Mensah is on the way to your pickup.' });
        }
      }, 4000) : null;

      return () => {
        unsubscribe();
        if (autoAcceptTimeout) clearTimeout(autoAcceptTimeout);
      };
    } catch (err: any) {
      console.error('Failed to request trip:', err);
      setBookingError(err?.message || 'Failed to dispatch ride request. Please try again.');
      setIsSearchingRider(false);
    }
  };

  // Handle Cancel Active Trip (Triggers sync via Supabase Realtime)
  const handleCancelTrip = async () => {
    if (!activeTrip || !supabase) return;
    
    try {
      await supabase
        .from('rides')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeTrip.id);
      
      setActiveTrip(null);
      setCurrentRideId(null);
    } catch (err) {
      console.error('Failed to cancel trip:', err);
    }
  };

  // Handle Emergency SOS Trigger
  const handleTriggerSos = async () => {
    if (!activeTrip) return;
    try {
      await SafMoveAPI.triggerSOS({
        tripId: activeTrip.id,
        triggeredBy: 'user',
        personName: activeTrip.userName,
        personPhone: activeTrip.userPhone,
        currentLocationName: activeTrip.pickupLocation.name,
        lat: activeTrip.pickupLocation.lat,
        lng: activeTrip.pickupLocation.lng,
      });
      setSosSuccess(true);
      showToast({ type: 'error', title: '🚨 SOS Triggered', message: 'Emergency alert sent. Police have been notified.', duration: 8000 });
      setTimeout(() => {
        setShowSosModal(false);
        setSosSuccess(false);
      }, 3500);
    } catch (e) {
      console.error('SOS Trigger failed', e);
      showToast({ type: 'error', title: 'SOS Failed', message: 'Please call 112 directly.' });
    }
  };

  // Handle trip completion — show rating modal then receipt
  const handleTripCompleted = (trip: TripOrder) => {
    setActiveTrip(null);
    setIsSearchingRider(false);
    setTripToRate(trip);
    showToast({ type: 'success', title: '✅ Trip Completed!', message: `You arrived at ${trip.dropoffLocation.name}. Please rate your rider.` });
  };

  // Handle rating submission
  const handleRatingSubmit = (trip: TripOrder, rating: number, comment: string) => {
    setCompletedTripRating(rating);
    setTripToRate(null);
    setTripReceipt(trip);
    // Persist rating locally
    const rated = { ...trip, rating, comment, ratedAt: new Date().toISOString() };
    try {
      const existingRated = JSON.parse(localStorage.getItem('safmove_rated_trips') || '[]');
      localStorage.setItem('safmove_rated_trips', JSON.stringify([rated, ...existingRated]));
    } catch { /* ignore */ }
    loadData();
  };

  // Save profile updates
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerProfile) return;

    const cleanUsername = editUsername.trim().replace(/^@+/, '') || 'user';
    const updated: UserProfile = {
      ...passengerProfile,
      fullName: editFullName.trim() || passengerProfile.fullName,
      username: cleanUsername,
      phone: editPhone.trim() || passengerProfile.phone,
      trustedContactName: editTrustedName.trim() || passengerProfile.trustedContactName,
      trustedContactPhone: editTrustedPhone.trim() || passengerProfile.trustedContactPhone,
    };
    setPassengerProfile(updated);
    saveLocalPassengerProfile(updated);
    setProfileSavedMsg(true);
    showToast({ type: 'success', title: 'Profile Saved', message: 'Your details have been updated.' });
    setTimeout(() => {
      setProfileSavedMsg(false);
      setIsEditingProfile(false);
    }, 1000);
  };

  // Dynamic time-based greeting for Accra commuter
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

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
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">SafMove Accra</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                PASSENGER
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Verified Urban Motorcycle Dispatch</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 mr-4">
          <button
            onClick={() => setActiveTab('home')}
            className={`text-xs font-bold transition ${activeTab === 'home' ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs font-bold transition ${activeTab === 'history' ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`text-xs font-bold transition ${activeTab === 'profile' ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Profile
          </button>
        </nav>

        <PWAInstallButton />
        <button
          onClick={onSwitchToDriver}
          className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
        >
          <Bike className="w-3.5 h-3.5 text-emerald-700" />
          <span className="hidden sm:inline">Rider Portal</span>
        </button>

        {/* Top Header Profile Indicator */}
        {passengerProfile && (
          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
            title="Your Commuter Profile"
          >
            <div className="relative">
              {userData?.user_metadata?.avatar_url || passengerProfile?.avatarUrl ? (
                <img
                  src={userData?.user_metadata?.avatar_url || passengerProfile?.avatarUrl || ''}
                  alt={
                    userData?.user_metadata?.full_name ||
                    userData?.user_metadata?.name ||
                    passengerProfile?.fullName ||
                    userData?.email?.split('@')[0] ||
                    'Commuter'
                  }
                  className="w-7 h-7 rounded-full object-cover border border-emerald-600"
                  onError={(e) => {
                    const displayName =
                      userData?.user_metadata?.full_name ||
                      userData?.user_metadata?.name ||
                      passengerProfile?.fullName ||
                      userData?.email?.split('@')[0] ||
                      'Commuter';
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff&rounded=true`;
                  }}
                />
              ) : (
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                    userData?.user_metadata?.full_name ||
                    userData?.user_metadata?.name ||
                    passengerProfile?.fullName ||
                    userData?.email?.split('@')[0] ||
                    'Commuter'
                  )}&background=0D8ABC&color=fff&rounded=true`}
                  alt={
                    userData?.user_metadata?.full_name ||
                    userData?.user_metadata?.name ||
                    passengerProfile?.fullName ||
                    userData?.email?.split('@')[0] ||
                    'Commuter'
                  }
                  className="w-7 h-7 rounded-full object-cover border border-emerald-600"
                />
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
            </div>
            <span className="text-xs font-bold text-slate-900 hidden md:inline">
              {userData?.user_metadata?.full_name ||
                userData?.user_metadata?.name ||
                passengerProfile?.fullName ||
                userData?.email?.split('@')[0] ||
                'Commuter'}
            </span>
          </button>
        )}
      </div>
    </header>
  );

  // If no passenger profile, show loading state
  if (!passengerProfile) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {renderHeader()}
        <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-5 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  // Render Standardized Fixed Bottom Navigation Bar (Matches Driver App Exactly)
  const renderBottomNav = () => (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200/90 py-2 px-6 pb-4 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.08)] transition-transform duration-300 ${activeTrip ? 'translate-y-full' : 'translate-y-0'}`}>
      <button
        id="user-nav-home"
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
        id="user-nav-history"
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
        id="user-nav-profile"
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

  // Render Interactive Leaflet Map for Accra
  const renderPassengerMap = () => {
    // Center on Accra, Ghana
    const center: [number, number] = [5.6037, -0.1870];

    return (
      <div className="relative w-full h-full min-h-[45vh] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100">
        <MapboxMap
          center={center}
          zoom={13}
          pickup={pickup}
          dropoff={dropoff}
          drivers={activeDrivers}
          showRoute={true}
          className="w-full h-full"
        />

        {/* Active Drivers Count Badge */}
        {activeDrivers.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-white px-3 py-1.5 rounded-full border border-slate-300 shadow-md flex items-center gap-1.5 text-xs font-bold text-emerald-800 z-[1000]">
            <Bike className="w-3.5 h-3.5" />
            <span>{activeDrivers.length} Active Rider{activeDrivers.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* ETA & Distance Floating Pill (Solid white with shadow-md) */}
        <div className="absolute top-3 left-3 bg-white px-4 py-2 rounded-full border border-slate-300 shadow-md flex items-center gap-2 text-xs font-bold text-slate-900 z-[1000]">
          <Clock className="w-4 h-4 text-emerald-700" />
          <span>{estDurationMinutes} mins ETA</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-700">{distanceKm.toFixed(1)} km</span>
        </div>

        {/* Top-right: Live Safety Badge and Emergency SOS Button */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-[1000]">
          <div className="bg-white px-3 py-2 rounded-full border border-slate-300 shadow-md flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Verified Riders</span>
          </div>
          <SOSEmergencyButton
            tripId={activeTrip?.id || 'TRIP-ACTIVE'}
            passengerName={passengerProfile?.fullName || userData?.user_metadata?.full_name || 'Passenger'}
            passengerPhone={passengerProfile?.phone || userData?.user_metadata?.phone || '+233 24 123 4567'}
            pickupAddress={pickup.name}
            dropoffAddress={dropoff.name}
            driverName={activeTrip?.driverName || matchedRider?.fullName || 'Verified Rider'}
            driverPlate={activeTrip?.driverPlate || matchedRider?.motorcyclePlate || 'GR-24-4502'}
            currentCoords={{ lat: pickup.lat, lng: pickup.lng }}
          />
        </div>

        {/* Simulation Control Button (For Testing) */}
        <button
          onClick={async () => {
            if (isSimulating) {
              stopDriverSimulation();
              setIsSimulating(false);
            } else {
              await initializeSimulatedDrivers();
              startDriverSimulation();
              setIsSimulating(true);
            }
          }}
          className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-full border shadow-md flex items-center gap-1.5 text-xs font-bold z-[1000] transition ${
            isSimulating
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {isSimulating ? (
            <>
              <Radio className="w-3.5 h-3.5 animate-spin" />
              <span>Stop Simulation</span>
            </>
          ) : (
            <>
              <Bike className="w-3.5 h-3.5" />
              <span>Simulate Traffic</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {renderHeader()}

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* TAB 1: HOME (MAP + FLOATING "WHERE TO?" DISPATCH REQUEST FLOW)             */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <>
            {/* Desktop: Sidebar with booking panel */}
            <div className={`md:w-[450px] md:h-[calc(100vh-80px)] md:overflow-y-auto md:shadow-2xl md:z-10 md:bg-white md:p-6 md:border-r md:border-slate-200 ${activeTrip ? 'hidden md:block' : 'w-full p-4 sm:p-5 space-y-4'}`}>
              {/* 1. ACTIVE ONGOING TRIP TRACKING (Pure White with shadow-xl) */}
              {activeTrip ? (
                <div className="md:static md:border-t-0 md:border-2 md:rounded-3xl fixed bottom-0 left-0 right-0 bg-white border-t-2 border-emerald-600 shadow-2xl z-50 safe-area-inset-bottom animate-in slide-in-from-bottom duration-300 md:animate-none md:translate-y-0">
                  <div className="max-w-xl mx-auto p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                    <div>
                      <h4 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                        {activeTrip.status === 'accepted'
                          ? 'Rider Confirmed & En Route'
                          : activeTrip.status === 'in_progress'
                          ? 'Journey In Progress'
                          : 'Trip Active'}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        Safety PIN: <strong className="font-mono text-slate-900 text-sm font-black">{activeTrip.id.replace(/\D/g, '').slice(-4) || '8821'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                    {activeTrip.serviceType === 'parcel' ? 'Courier Dispatch' : 'Passenger Ride'}
                  </span>
                </div>

                {/* Commuter Identification Strip */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {userData?.user_metadata?.avatar_url || passengerProfile?.avatarUrl ? (
                      <img
                        src={userData?.user_metadata?.avatar_url || passengerProfile?.avatarUrl || ''}
                        alt={userData?.user_metadata?.full_name || passengerProfile?.fullName || 'User'}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-300"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.user_metadata?.full_name || passengerProfile?.fullName || 'User')}&background=0D8ABC&color=fff&rounded=true`;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.user_metadata?.full_name || passengerProfile?.fullName || 'User')}&background=0D8ABC&color=fff&rounded=true`}
                        alt={userData?.user_metadata?.full_name || passengerProfile?.fullName || 'User'}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-300"
                      />
                    )}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-600 block">Commuter Account</span>
                      <p className="text-xs font-black text-slate-900">
                        {userData?.user_metadata?.full_name || passengerProfile?.fullName || 'User'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700">{userData?.user_metadata?.phone || passengerProfile?.phone || ''}</span>
                </div>

                {/* ETA Countdown tracker — replaces static driver card when status=accepted */}
                {(activeTrip.status === 'accepted' || activeTrip.status === 'arriving') ? (
                  <DriverETATracker trip={activeTrip} />
                ) : (
                  activeTrip.driverName && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg flex-shrink-0">
                          {activeTrip.driverName[0]}
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-sm">{activeTrip.driverName}</h5>
                          <p className="text-xs text-slate-500 font-mono">{activeTrip.driverModel} · {activeTrip.driverPlate}</p>
                          <div className="flex items-center gap-1 text-xs text-emerald-800 font-bold mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Ghana Card &amp; Helmet Verified</span>
                          </div>
                        </div>
                      </div>
                      {activeTrip.driverPhone && (
                        <a href={`tel:${activeTrip.driverPhone}`}
                          className="p-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-md transition flex items-center justify-center flex-shrink-0"
                          title="Call Driver">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )
                )}

                {/* Route Points */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px] mt-0.5 flex-shrink-0">P</div>
                    <div>
                      <span className="text-slate-600 text-[10px] uppercase font-bold block">Pickup Location</span>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{activeTrip.pickupLocation.name}</p>
                      <p className="text-xs text-slate-600">{activeTrip.pickupLocation.landmark}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px] mt-0.5 flex-shrink-0">D</div>
                    <div>
                      <span className="text-slate-600 text-[10px] uppercase font-bold block">Drop-off Destination</span>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{activeTrip.dropoffLocation.name}</p>
                      <p className="text-xs text-slate-600">{activeTrip.dropoffLocation.landmark}</p>
                    </div>
                  </div>
                </div>

                {/* Fare Amount + MoMo Pay */}
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Total Fare</p>
                    <span className="text-lg font-black text-emerald-900">GH₵ {activeTrip.fareGHS?.toFixed(2) || '0.00'}</span>
                  </div>
                  {activeTrip.paymentStatus === 'pending' && (
                    <button
                      onClick={() => setShowMomoModal(true)}
                      className="px-3 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs transition flex items-center gap-1.5 shadow-md"
                    >
                      <span>📱</span> Pay MoMo
                    </button>
                  )}
                  {activeTrip.paymentStatus !== 'pending' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200">
                      ✓ {activeTrip.paymentMethod === 'momo' ? 'Paid via MoMo' : 'Pay Cash on Arrival'}
                    </span>
                  )}
                </div>

                {/* Action Buttons: Safety WhatsApp Share & Emergency SOS */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <a
                    href={generateWhatsAppSafetyShareUrl(activeTrip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-700" /> Share Trip with Family (WhatsApp)
                  </a>

                  <a
                    href="tel:112"
                    className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Emergency SOS (112)
                  </a>
                </div>

                <div className="text-center pt-1">
                  <button
                    onClick={handleCancelTrip}
                    className="text-xs text-slate-600 hover:text-rose-700 font-semibold transition"
                  >
                    Cancel Dispatch Request
                  </button>
                </div>
                </div>
              </div>
            ) : isSearchingRider ? (
              /* RADAR SEARCHING TRANSITION (Fixed at bottom for mobile, static for desktop) */
              <div className="md:static md:border-t-0 md:border md:border-slate-200/90 md:rounded-3xl fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 shadow-2xl z-50 safe-area-inset-bottom animate-in slide-in-from-bottom duration-300 md:animate-none md:translate-y-0">
                <div className="max-w-xl mx-auto p-6 sm:p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-slate-900">Locating Verified Rider</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Matching with background-checked riders stationed near <strong className="text-slate-900">{pickup.name}</strong>...
                  </p>
                </div>

                <div className="space-y-2 text-xs text-left bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className={`flex items-center gap-2 ${searchStep >= 1 ? 'text-emerald-800 font-bold' : 'text-slate-600'}`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Corridor Safety Audit Checked</span>
                  </div>
                  <div className={`flex items-center gap-2 ${searchStep >= 2 ? 'text-emerald-800 font-bold' : 'text-slate-600'}`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Ghana Card & Helmet Status Verified</span>
                  </div>
                  <div className={`flex items-center gap-2 ${searchStep >= 3 ? 'text-emerald-800 font-bold' : 'text-slate-600'}`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Dispatch Routing Locked</span>
                  </div>
                </div>
                </div>
              </div>
            ) : (
              /* FLOATING "WHERE TO?" DISPATCH CARD (Pure White with solid shadow-xl) */
              <div className="bg-white border border-slate-200/90 md:border-0 md:shadow-none md:p-0 rounded-3xl md:rounded-none p-5 sm:p-6 shadow-xl space-y-4">
                {/* Service Type Segmented Selector */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setServiceType('passenger')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                      serviceType === 'passenger'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bike className="w-4 h-4 text-emerald-700" />
                    <span>Passenger Ride</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('parcel')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                      serviceType === 'parcel'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Package className="w-4 h-4 text-emerald-700" />
                    <span>Parcel Delivery</span>
                  </button>
                </div>

                <form onSubmit={handleRequestTrip} className="space-y-3.5">
                  {/* Pickup Hub Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Pickup Accra Hub
                    </label>
                    <select
                      value={pickup.id}
                      onChange={(e) => {
                        const loc = ACCRA_POPULAR_LOCATIONS.find((l) => l.id === e.target.value) || ACCRA_POPULAR_LOCATIONS[0];
                        setPickup(loc);
                      }}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:border-emerald-600 focus:outline-none"
                    >
                      {ACCRA_POPULAR_LOCATIONS.map((loc) => (
                        <option key={`p_${loc.id}`} value={loc.id}>
                          {loc.name} — {loc.landmark}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destination "Where To?" Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900" /> Where to in Accra? (Destination)
                    </label>
                    <select
                      value={dropoff.id}
                      onChange={(e) => {
                        const loc = ACCRA_POPULAR_LOCATIONS.find((l) => l.id === e.target.value) || ACCRA_POPULAR_LOCATIONS[1];
                        setDropoff(loc);
                      }}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:border-emerald-600 focus:outline-none"
                    >
                      {ACCRA_POPULAR_LOCATIONS.map((loc) => (
                        <option key={`d_${loc.id}`} value={loc.id}>
                          {loc.name} — {loc.landmark}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parcel Details (If Parcel Express Selected) */}
                  {serviceType === 'parcel' && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">Package Contents / Note</label>
                        <input
                          type="text"
                          value={packageNotes}
                          onChange={(e) => setPackageNotes(e.target.value)}
                          placeholder="e.g. Legal documents in sealed envelope"
                          className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-800 mb-1">Recipient Name</label>
                          <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Recipient full name"
                            className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-800 mb-1">Recipient Phone</label>
                          <input
                            type="tel"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="+233 24 000 0000"
                            className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned / Available Driver Details Preview (Zero Financials / Price Tags) */}
                  {matchedRider && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={matchedRider.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedRider.fullName)}&background=0D8ABC&color=fff&rounded=true`}
                          alt={matchedRider.fullName}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-300 shadow-xs"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedRider.fullName)}&background=0D8ABC&color=fff&rounded=true`;
                          }}
                        />
                        <div>
                          <p className="text-xs sm:text-sm font-black text-slate-900">{matchedRider.fullName}</p>
                          <p className="text-xs text-slate-700 font-mono font-semibold">
                            {matchedRider.motorcycleModel} • {matchedRider.motorcyclePlate}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold">
                            <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                            <span>★ {matchedRider.rating.toFixed(1)} Rating · Ready at {matchedRider.currentZone}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Available
                      </span>
                    </div>
                  )}

                  {/* Fare Estimator - live pricing breakdown */}
                  <div className="pt-1">
                    <FareEstimator
                      pickup={pickup}
                      dropoff={dropoff}
                      serviceType={serviceType}
                    />
                  </div>

                  {/* Booking error state banner */}
                  {bookingError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <strong className="font-bold block">Dispatch Error</strong>
                        <span>{bookingError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBookingError(null)}
                        className="text-rose-500 hover:text-rose-800 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Big Confirmation Button with Loading Spinner */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      id="btn-confirm-passenger-dispatch"
                      disabled={isSearchingRider}
                      className="w-full py-4 rounded-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      {isSearchingRider ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Dispatching to Accra Riders...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4" />
                          <span>Request Verified Rider ({estDurationMinutes} mins ETA)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
            </div>

            {/* Desktop: Map container (right side) */}
            <div className="flex-1 h-[50vh] md:h-[calc(100vh-80px)] w-full relative">
              {renderPassengerMap()}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HISTORY (PAST ROUTES ONLY - ZERO FINANCIALS)                       */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="flex-1 flex justify-center overflow-y-auto">
            <div className="max-w-xl w-full p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Your Route History</h3>
                <p className="text-xs text-slate-600 mt-0.5">Past verified dispatches and commutes</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-800">
                {pastTrips.length} Completed
              </span>
            </div>

            {pastTrips.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200/90 text-center space-y-2 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">No past routes recorded</h4>
                <p className="text-xs text-slate-600">
                  When you complete a passenger ride or courier dispatch, your itinerary will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastTrips.map((t) => (
                  <div
                    key={`u_past_${t.id}`}
                    className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-600 text-xs font-bold">{t.id}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Completed ✓
                      </span>
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
                      <span>Rider: <strong className="text-slate-900">{t.driverName}</strong></span>
                      <span>{new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

        {/* ========================================================================= */}
        {/* TAB 3: PROFILE (ACCOUNT & SAFETY CONTACTS - ZERO WALLET / PAYMENT MENTIONS) */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto w-full p-4 sm:p-5 space-y-5">
            {/* Centered Profile Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm text-center space-y-4">
              {/* Interactive Avatar Upload Frame with Camera Badge */}
              <div className="relative inline-block mx-auto group">
                <img
                  src={passengerProfile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(passengerProfile.fullName || 'User')}&background=0D8ABC&color=fff&rounded=true`}
                  alt={passengerProfile.fullName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl mx-auto ring-4 ring-emerald-500/10 cursor-pointer hover:opacity-95 transition"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Click to change photo"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(passengerProfile.fullName || 'User')}&background=0D8ABC&color=fff&rounded=true`;
                  }}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg border-2 border-white transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
              </div>

              {isUploadingAvatar && (
                <p className="text-xs font-bold text-emerald-800 animate-pulse">Uploading and optimizing photo...</p>
              )}

              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">{passengerProfile.fullName || 'User'}</h3>
                  <button
                    onClick={() => {
                      if (!passengerProfile) return;
                      setEditFullName(passengerProfile.fullName);
                      setEditUsername(passengerProfile.username || '');
                      setEditPhone(passengerProfile.phone);
                      setEditTrustedName(passengerProfile.trustedContactName || '');
                      setEditTrustedPhone(passengerProfile.trustedContactPhone || '');
                      setIsEditingProfile(true);
                    }}
                    className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    title="Edit Name & Username"
                  >
                    <Edit3 className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>
                <p className="text-xs text-emerald-800 font-bold mt-0.5">@{passengerProfile.username || 'user'}</p>
                <p className="text-xs text-slate-700 font-mono font-semibold mt-0.5">{passengerProfile.phone || ''}</p>
                
                <div className="pt-2.5 flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Verified Commuter Account
                  </span>
                  <button
                    onClick={() => {
                      if (!passengerProfile) return;
                      setEditFullName(passengerProfile.fullName);
                      setEditUsername(passengerProfile.username || '');
                      setEditPhone(passengerProfile.phone);
                      setEditTrustedName(passengerProfile.trustedContactName || '');
                      setEditTrustedPhone(passengerProfile.trustedContactPhone || '');
                      setIsEditingProfile(true);
                    }}
                    className="text-[11px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-1 rounded-full border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Emergency Trusted Contact Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-sm font-bold text-slate-900">Emergency Trusted Contact</h4>
                </div>
                <button
                  onClick={() => {
                    setEditFullName(passengerProfile.fullName);
                    setEditUsername(passengerProfile.username || '');
                    setEditPhone(passengerProfile.phone);
                    setEditTrustedName(passengerProfile.trustedContactName || '');
                    setEditTrustedPhone(passengerProfile.trustedContactPhone || '');
                    setIsEditingProfile(true);
                  }}
                  className="text-xs text-emerald-800 font-bold hover:underline cursor-pointer"
                >
                  Edit Contacts
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Contact Name:</span>
                  <span className="font-bold text-slate-900">{passengerProfile?.trustedContactName || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600 font-medium">Alert Number:</span>
                  <span className="font-bold text-slate-900">{passengerProfile?.trustedContactPhone || 'Not set'}</span>
                </div>
                <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                  This contact receives emergency live trip updates whenever you activate the SOS safety protocol.
                </p>
              </div>
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

            {/* Crop Avatar Modal */}
            {showCropModal && selectedImage && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Crop Profile Picture</h4>
                        <p className="text-[11px] text-slate-600">Adjust the image to fit the circular avatar</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowCropModal(false);
                        setSelectedImage(null);
                      }}
                      className="p-1 rounded-xl text-slate-500 hover:text-slate-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative w-full h-80 bg-slate-100 rounded-2xl overflow-hidden">
                    <Cropper
                      image={selectedImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(croppedArea, croppedAreaPixels) => {
                        setCroppedAreaPixels(croppedAreaPixels);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3 hidden md:flex">
                    <label className="text-xs font-bold text-slate-700">Zoom:</label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 accent-emerald-600"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowCropModal(false);
                        setSelectedImage(null);
                      }}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (croppedAreaPixels) {
                          handleCropComplete(croppedAreaPixels);
                        }
                      }}
                      disabled={isApplyingCrop}
                      className="flex-1 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApplyingCrop ? 'Uploading...' : 'Apply Crop'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Profile Modal Dialog */}
            {isEditingProfile && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">Edit Commuter Profile</h4>
                        <p className="text-[11px] text-slate-600">Update your username, display name, and contacts</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="p-1 rounded-xl text-slate-500 hover:text-slate-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {profileSavedMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4" /> Profile updated successfully!
                    </div>
                  )}

                  {/* Avatar Change Row */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <img
                      src={passengerProfile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(passengerProfile.fullName || 'User')}&background=0D8ABC&color=fff&rounded=true`}
                      alt={editFullName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-300"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(passengerProfile.fullName || 'User')}&background=0D8ABC&color=fff&rounded=true`;
                      }}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-900 block">Profile Picture</span>
                      <p className="text-[11px] text-slate-600">Visible to drivers & safety dispatch</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Username (Handle)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">@</span>
                        <input
                          type="text"
                          required
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                          placeholder="username"
                          className="w-full rounded-xl bg-white border border-slate-300 pl-8 pr-3.5 py-2 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Display / Full Legal Name</label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Contact Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+233 24 000 0000"
                        className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">Emergency Contact</span>
                      <div className="space-y-2">
                        <div>
                          <label className="block font-bold text-slate-800 mb-1">Emergency Contact Name</label>
                          <input
                            type="text"
                            required
                            value={editTrustedName}
                            onChange={(e) => setEditTrustedName(e.target.value)}
                            placeholder="Relative or next of kin"
                            className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-800 mb-1">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            required
                            value={editTrustedPhone}
                            onChange={(e) => setEditTrustedPhone(e.target.value)}
                            placeholder="+233 20 000 0000"
                            className="w-full rounded-xl bg-white border border-slate-300 px-3.5 py-2 text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-md shadow-emerald-700/20 cursor-pointer"
                      >
                        Save Profile Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Ghana Emergency Numbers Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3 text-xs">
              <h4 className="text-sm font-bold text-slate-900">National Emergency Contacts</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 block text-[11px] font-medium">Ghana Police Service</span>
                  <a href={`tel:${ACCRA_HOTLINES.POLICE_EMERGENCY}`} className="font-bold text-slate-900 hover:text-emerald-800 hover:underline text-xs sm:text-sm">
                    {ACCRA_HOTLINES.POLICE_EMERGENCY} / 18555
                  </a>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 block text-[11px] font-medium">National Emergency</span>
                  <a href={`tel:${ACCRA_HOTLINES.NATIONAL_EMERGENCY}`} className="font-bold text-slate-900 hover:text-emerald-800 hover:underline text-xs sm:text-sm">
                    {ACCRA_HOTLINES.NATIONAL_EMERGENCY}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SOS Safety Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900">Trigger Emergency SOS?</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              This broadcasts your live GPS coordinates to the SafMove Safety Response Team and alerts the Ghana Police Service (191).
            </p>

            {sosSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">
                ✓ SOS Alert Dispatched! Safety team alerted.
              </div>
            ) : (
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleTriggerSos}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30"
                >
                  Confirm & Dispatch SOS
                </button>
                <button
                  onClick={() => setShowSosModal(false)}
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation */}
      {renderBottomNav()}

      {/* ── Post-Trip Rating Modal ─────────────────────────────────── */}
      {tripToRate && (
        <TripRatingModal
          trip={tripToRate}
          onSubmit={(rating, comment) => handleRatingSubmit(tripToRate, rating, comment)}
          onDismiss={() => setTripToRate(null)}
        />
      )}

      {/* ── Trip Receipt Modal ─────────────────────────────────────── */}
      {tripReceipt && (
        <TripReceipt
          trip={tripReceipt}
          rating={completedTripRating}
          onClose={() => setTripReceipt(null)}
        />
      )}

      {/* ── MoMo Payment Modal ────────────────────────────────────── */}
      {showMomoModal && activeTrip && (
        <MoMoPaymentModal
          amount={activeTrip.fareGHS}
          rideId={currentRideId || activeTrip.id}
          passengerPhone={passengerProfile?.phone || '+233240000000'}
          onSuccess={(ref) => {
            setShowMomoModal(false);
            setActiveTrip((prev) => prev ? { ...prev, paymentStatus: 'paid_momo', paymentMethod: 'momo' } : null);
            showToast({ type: 'success', title: '💚 MoMo Payment Confirmed!', message: `Ref: ${ref}` });
          }}
          onCancel={() => setShowMomoModal(false)}
        />
      )}
    </div>
  );
};
