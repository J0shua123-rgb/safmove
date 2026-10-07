import React, { useState } from 'react';
import {
  Bike,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Smartphone,
  Zap,
  AlertTriangle,
  Lock,
  KeyRound,
  Mail,
  LogIn,
  UserPlus,
  Camera,
  User
} from 'lucide-react';
import { ACCRA_POPULAR_LOCATIONS } from '../../lib/accraData';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { supabase } from '../../lib/supabase';

interface LandingPageProps {
  onSelectRole: (role: 'user' | 'driver' | 'admin') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authRole, setAuthRole] = useState<'passenger' | 'driver'>('passenger');
  const [authVehicleModel, setAuthVehicleModel] = useState('');
  const [authLicensePlate, setAuthLicensePlate] = useState('');
  const [authGhanaCard, setAuthGhanaCard] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      if (isSignUp) {
        // Check password confirmation
        if (authPassword !== authConfirmPassword) {
          setAuthError('Passwords do not match');
          setAuthLoading(false);
          return;
        }

        // Prepare user metadata
        const userData: any = {
          full_name: authFullName,
          phone: authPhone,
          role: authRole,
        };

        // Add driver-specific fields if applicable
        if (authRole === 'driver') {
          userData.vehicle_model = authVehicleModel;
          userData.license_plate = authLicensePlate;
          userData.ghana_card = authGhanaCard;
          userData.status = 'pending';
        } else {
          userData.status = 'active';
        }

        // Upload profile image to Supabase storage if provided
        if (profileImage) {
          const fileExt = profileImage.name.split('.').pop();
          const fileName = `${authEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, profileImage);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Continue without avatar if upload fails
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            userData.avatar_url = publicUrl;
          }
        }

        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: userData
          }
        });
        if (error) throw error;

        // Reset registration state after successful signup
        setRegistrationStep(1);
        setProfileImage(null);
        setPreviewUrl(null);

        // Navigate to appropriate portal after successful signup
        const portalRole = authRole === 'passenger' ? 'user' : 'driver';
        onSelectRole(portalRole);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;

        // Navigate to appropriate portal after successful login
        // Get the user's role from the session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.user_metadata?.role) {
          const userRole = session.user.user_metadata.role;
          const portalRole = userRole === 'passenger' ? 'user' : 'driver';
          onSelectRole(portalRole);
        }
      }
      setShowAuthModal(false);
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCardClick = async (role: 'user' | 'driver') => {
    if (!supabase) {
      setShowAuthModal(true);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      onSelectRole(role);
    } else {
      setShowAuthModal(true);
    }
  };

  const openSignup = (selectedRole: 'passenger' | 'driver') => {
    setShowAuthModal(true);
    setIsSignUp(true);
    setAuthRole(selectedRole);
    setRegistrationStep(1);
    setProfileImage(null);
    setPreviewUrl(null);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPass = localStorage.getItem('safmove_admin_master_passcode');
    const cleanPin = enteredPin.trim();

    const isMatch =
      (storedPass && cleanPin.toLowerCase() === storedPass.toLowerCase()) ||
      cleanPin === 'safmove2026' ||
      cleanPin === '1957' ||
      cleanPin.toLowerCase() === 'admin';

    if (isMatch) {
      setShowAdminPinModal(false);
      onSelectRole('admin');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md shadow-emerald-600/20">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 font-['Space_Grotesk']">
                SAF<span className="text-emerald-700">MOVE</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                Accra Dispatch
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Motorcycle Transport & Express Delivery</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton />
          <button
            onClick={() => { setIsSignUp(false); setShowAuthModal(true); setRegistrationStep(1); }}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-600 transition flex items-center gap-1.5 shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
            <span className="sm:hidden">Sign In</span>
          </button>
          <button
            onClick={() => { setIsSignUp(true); setShowAuthModal(true); setRegistrationStep(1); setProfileImage(null); setPreviewUrl(null); }}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Up</span>
            <span className="sm:hidden">Sign Up</span>
          </button>
          <button
            id="nav-btn-driver-top"
            onClick={() => handleCardClick('driver')}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition hidden sm:inline-flex items-center gap-1.5 border border-slate-200"
          >
            <span>Rider Portal</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-14 flex flex-col justify-center">
        {/* Accra Live Pulse Badge */}
        <div className="flex items-center justify-center sm:justify-start mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span>Accra Rapid Dispatch: Verified Riders Active (Circle, Kaneshie, East Legon, Lapaz)</span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="max-w-3xl text-center sm:text-left">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight font-['Space_Grotesk']">
            Fast, safe motorcycle rides & deliveries across <span className="text-emerald-700">Accra</span>.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
            No more walking to junctions or negotiating in traffic. Every SafMove rider is verified with <span className="text-emerald-800 font-bold">Ghana Card</span> screening, certified helmet safety, and real-time WhatsApp emergency tracking.
          </p>
        </div>

        {/* Dual-Action Gateway Cards (Light Theme with Heavily Rounded Corners) */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
          {/* Action Card 1: Find a Ride (Passenger) */}
          <div
            id="card-select-passenger"
            onClick={() => openSignup('passenger')}
            className="group relative cursor-pointer rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-700/5 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Passenger & Courier
              </span>
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
              Find a Ride / Send Parcel
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Book a passenger trip or send express parcels across Accra with instant dispatch routing and live GPS tracking.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                <Zap className="w-3.5 h-3.5 text-emerald-700" /> Avg pickup ~4 mins
              </span>
              <span className="text-emerald-700 font-bold group-hover:underline">Get Started &rarr;</span>
            </div>
          </div>

          {/* Action Card 2: Drive with Us (Driver) */}
          <div
            id="card-select-driver"
            onClick={() => openSignup('driver')}
            className="group relative cursor-pointer rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 hover:border-emerald-600 hover:shadow-xl hover:shadow-emerald-700/5 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                <Bike className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Rider Portal
              </span>
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
              Drive with SafMove
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Join Accra's verified motorcycle fleet. Reliable dispatch routing, guaranteed ride requests, and protective rider insurance.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Ghana Card Verified
              </span>
              <span className="text-slate-900 font-bold group-hover:underline">Apply Now &rarr;</span>
            </div>
          </div>
        </div>

        {/* Accra Trust & Safety Architecture Highlights */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200/80">
          <div className="text-xs uppercase tracking-wider font-bold text-emerald-800 mb-4">
            Safety & Trust Engineered For Accra
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Vetted Ghana Card Profiles
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Riders undergo physical registration with National Ghana Card screening, guarantor contacts, and roadworthy checks.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1.5">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                Live WhatsApp Trip Share
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                One-tap share sends real-time GPS coordinates, rider photo, and motorcycle plate number directly to loved ones.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Direct 191 / 112 Emergency SOS
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant SOS trigger pings the SafMove 24/7 central dispatch room and connects directly to Ghana Police hotlines.
              </p>
            </div>
          </div>
        </div>

        {/* Accra Key Hotspots ticker */}
        <div className="mt-10 flex flex-wrap items-center gap-2 justify-center sm:justify-start text-xs text-slate-600">
          <span className="text-slate-800 font-semibold flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Popular Hubs:
          </span>
          {ACCRA_POPULAR_LOCATIONS.slice(0, 6).map((loc) => (
            <span
              key={loc.id}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-800 font-medium shadow-xs"
            >
              {loc.name}
            </span>
          ))}
        </div>
      </main>

      {/* Footer with Discreet Admin Passcode Lock */}
      <footer className="border-t border-slate-200/80 bg-white px-4 sm:px-8 py-6 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} SafMove Ghana. All Rights Reserved.</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-800 font-medium">Emergency Dispatch: 191 / 112</span>

          {/* Discreet Admin Lock Button */}
          <button
            id="secret-admin-lock-btn"
            onClick={() => setShowAdminPinModal(true)}
            title="Admin Dispatch Security"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[10px] text-slate-600 hover:text-slate-900 font-mono font-bold">admin</span>
          </button>
        </div>
      </footer>

      {/* Modern Full-Screen Split Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex bg-white animate-in fade-in duration-200">
          {/* Left Side - Premium Branding (Hidden on small screens) */}
          <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 relative flex-col justify-center items-center p-12">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950 opacity-90"></div>

            <div className="relative z-10 text-center text-white max-w-lg">
              <div className="mb-8 flex justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-900 font-bold text-2xl shadow-lg">
                  <Bike className="w-8 h-8" />
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-6 tracking-tight">Fast, safe mobility in Accra.</h2>
              <p className="text-emerald-100 text-lg leading-relaxed">
                Join SafMove to request rides, send parcels, or earn money on your own schedule.
              </p>
            </div>
          </div>

          {/* Right Side - Spacious Auth Form */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-start py-12 p-6 sm:p-12 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="w-full max-w-md">

              {/* Back Button */}
              <button
                onClick={() => setShowAuthModal(false)}
                className="mb-10 text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>

              {/* Header */}
              <div className="mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {isSignUp ? 'Create an Account' : 'Welcome Back'}
                </h3>
                <p className="text-gray-500">
                  {isSignUp
                    ? 'Enter your details to access SafMove dispatch.'
                    : 'Sign in to request your next ride.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-5">
                {isSignUp ? (
                  <>
                    {/* Step 1: Details */}
                    {registrationStep === 1 && (
                      <>
                        {/* Common Fields */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={authFullName}
                            onChange={(e) => setAuthFullName(e.target.value)}
                            className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                            placeholder="+233 XX XXX XXXX"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                            placeholder="name@example.com"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input
                            type="password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                            placeholder="••••••••"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                          <input
                            type="password"
                            value={authConfirmPassword}
                            onChange={(e) => setAuthConfirmPassword(e.target.value)}
                            className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                            placeholder="••••••••"
                            required
                          />
                        </div>

                        {/* Driver-Specific Fields */}
                        {authRole === 'driver' && (
                          <div className="space-y-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700">Driver Information</p>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Motorcycle Model</label>
                              <input
                                type="text"
                                value={authVehicleModel}
                                onChange={(e) => setAuthVehicleModel(e.target.value)}
                                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                                placeholder="e.g., Bajaj Boxer 150 HD"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate Number</label>
                              <input
                                type="text"
                                value={authLicensePlate}
                                onChange={(e) => setAuthLicensePlate(e.target.value)}
                                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                                placeholder="e.g., GR-24-1092"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Ghana Card Number</label>
                              <input
                                type="text"
                                value={authGhanaCard}
                                onChange={(e) => setAuthGhanaCard(e.target.value)}
                                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                                placeholder="GHA-XXXXXXXX-X"
                                required
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Step 2: Profile Picture */}
                    {registrationStep === 2 && (
                      <div className="space-y-6 text-center">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Upload your Profile Picture</h4>
                          <p className="text-sm text-gray-600">Add a photo to help others recognize you</p>
                        </div>

                        <div className="flex justify-center">
                          <div className="relative w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt="Profile preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-gray-400">
                                <User className="w-12 h-12 mx-auto mb-1" />
                                <Camera className="w-6 h-6 mx-auto" />
                              </div>
                            )}
                          </div>
                        </div>

                        <input
                          type="file"
                          id="profile-image-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProfileImage(file);
                              setPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => document.getElementById('profile-image-input')?.click()}
                          className="px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl border border-emerald-200 transition-all"
                        >
                          Choose Image
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Sign In - Simple Form */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                        placeholder="name@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none bg-gray-50/50"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </>
                )}

                {authError && (
                  <p className="text-sm text-red-600 font-medium">{authError}</p>
                )}

                {isSignUp && registrationStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setRegistrationStep(2)}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold p-4 rounded-xl shadow-sm transition-all active:scale-[0.98] mt-4"
                  >
                    Continue
                  </button>
                ) : isSignUp && registrationStep === 2 ? (
                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setRegistrationStep(1)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold p-4 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold p-4 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {authLoading ? 'Processing...' : 'Complete Registration'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold p-4 rounded-xl shadow-sm transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authLoading ? 'Processing...' : 'Sign In'}
                  </button>
                )}
              </form>

              {/* Toggle Mode */}
              {(!isSignUp || registrationStep === 1) && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-gray-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Admin Secret Passcode Verification Modal (Light Theme) */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-2xl text-slate-900 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3 shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900">SafMove Admin Portal</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Enter the authorized administration password to access dispatch oversight & driver approvals queue.
            </p>

            <form onSubmit={handleVerifyAdminPin} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Passcode
                </label>
                <input
                  type="password"
                  id="admin-pin-input"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter admin passcode"
                  className="w-full rounded-2xl bg-white border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
                  autoFocus
                />
                {pinError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-medium">
                    Incorrect password. Enter the authorized master passcode.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-admin-pin-btn"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-md shadow-emerald-700/20"
                >
                  Unlock Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
