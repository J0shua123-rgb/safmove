import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserProfile } from '../types';
import { getLocalPassengerProfile } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const YELLOW = '#FACC15';
const DARK   = '#0f172a';
const ASHAIMAN_CENTER: [number, number] = [5.6983, -0.0305];
const DARK_TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─── Ripple CSS injection ─────────────────────────────────────────────────────
let rippleInjected = false;
const injectRipple = () => {
  if (rippleInjected) return;
  const el = document.createElement('style');
  el.textContent = `
    @keyframes sm-ripple{0%{transform:scale(0.6);opacity:0.9;}100%{transform:scale(3.0);opacity:0;}}
    .sm-ripple{position:absolute;border-radius:50%;background:${YELLOW};animation:sm-ripple 2s ease-out infinite;pointer-events:none;}
    .sm-ripple:nth-child(2){animation-delay:0.65s;}
    .sm-ripple:nth-child(3){animation-delay:1.3s;}
    .leaflet-container{background:#0f172a !important;}
    .leaflet-control-zoom{display:none !important;}
  `;
  document.head.appendChild(el);
  rippleInjected = true;
};

// ─── Leaflet icon factories ───────────────────────────────────────────────────
const makePickupIcon  = () => L.divIcon({ className:'', html:'<div style="background:#10b981;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:white;box-shadow:0 3px 10px rgba(0,0,0,0.5)">A</div>', iconSize:[32,32], iconAnchor:[16,16] });
const makeDropoffIcon = () => L.divIcon({ className:'', html:`<div style="background:${YELLOW};width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;color:#111;box-shadow:0 3px 10px rgba(0,0,0,0.5)">B</div>`, iconSize:[32,32], iconAnchor:[16,16] });
const makeVehicleIcon = () => {
  injectRipple();
  return L.divIcon({
    className:'',
    html:`<div style="position:relative;width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
      <div class="sm-ripple" style="width:60px;height:60px;top:0;left:0;"></div>
      <div class="sm-ripple" style="width:60px;height:60px;top:0;left:0;"></div>
      <div class="sm-ripple" style="width:60px;height:60px;top:0;left:0;"></div>
      <div style="position:relative;z-index:10;width:38px;height:38px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px ${YELLOW},0 4px 16px rgba(0,0,0,0.6);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${DARK}">
          <path d="M7 17h10v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V17z"/>
          <path d="M5 11l2-5h10l2 5H5z"/>
          <rect x="5" y="11" width="14" height="7" rx="1.5"/>
          <rect x="6" y="13" width="3.5" height="2.5" rx=".5" fill="white"/>
          <rect x="14.5" y="13" width="3.5" height="2.5" rx=".5" fill="white"/>
        </svg>
      </div>
    </div>`,
    iconSize:[60,60], iconAnchor:[30,30],
  });
};
const makeDriverDot = (idx: number) => L.divIcon({
  className:'',
  html:`<div style="width:20px;height:20px;border-radius:50%;background:${YELLOW};border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#111;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${idx+1}</div>`,
  iconSize:[20,20], iconAnchor:[10,10],
});
const makePassengerIcon = () => L.divIcon({
  className:'',
  html:'<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.5)"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>',
  iconSize:[28,28], iconAnchor:[14,14],
});

// ─── Zone data ────────────────────────────────────────────────────────────────
const ASHAIMAN_ZONES = [
  { label:'Night Market',   emoji:'🌙', lat:5.6983, lng:-0.0305 },
  { label:'Tulaku Jct',     emoji:'🔀', lat:5.7050, lng:-0.0210 },
  { label:'Official Town',  emoji:'🏛️', lat:5.6940, lng:-0.0360 },
  { label:'Lebanon Zone 2', emoji:'📍', lat:5.7010, lng:-0.0420 },
  { label:'Zenu',           emoji:'🔄', lat:5.6870, lng:-0.0270 },
] as const;

// Simulated nearby drivers (idle state)
const NEARBY_DRIVERS = [
  { lat:5.6995, lng:-0.0288, name:'Kwame A.' },
  { lat:5.7015, lng:-0.0340, name:'Issah M.' },
  { lat:5.6960, lng:-0.0265, name:'Yusuf K.' },
  { lat:5.7035, lng:-0.0195, name:'Abdul R.' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceMode = 'okada' | 'parcel';
type NavTab      = 'home' | 'route' | 'profile';

interface RideDetails {
  pickupName: string;   pickupLat: number;  pickupLng: number;
  dropoffName: string;  dropoffLat: number; dropoffLng: number;
  driverName: string;   driverLat: number;  driverLng: number;
  helmetPin: string;    fare: number;       etaMin: number;
  distKm: number;       progress: number;
  status: 'searching' | 'accepted' | 'on_way' | 'arrived' | 'in_trip';
}

export interface PassengerMapScreenProps {
  userProfile?: UserProfile | null;
  userName?:   string;
  avatarUrl?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const PassengerMapScreen: React.FC<PassengerMapScreenProps> = ({
  userProfile, userName, avatarUrl,
}) => {
  const profile       = userProfile || getLocalPassengerProfile();
  const displayName   = userName || profile?.fullName || 'Passenger';
  const displayUser   = profile?.username ? `@${profile.username}` : '@safmove_user';
  const displayAvatar = avatarUrl || profile?.avatarUrl;

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // ── Ride state (null = idle) ───────────────────────────────────────────────
  const [activeRide, setActiveRide] = useState<RideDetails | null>(null);

  // ── Shared UI state ────────────────────────────────────────────────────────
  const [serviceMode,  setServiceMode]  = useState<ServiceMode>('okada');
  const [activeZone,   setActiveZone]   = useState<number>(0);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [notifCount]                    = useState(3);
  const [pickupInput,  setPickupInput]  = useState('');
  const [dropoffInput, setDropoffInput] = useState('Tulaku Junction');

  // Stable map icons
  const pickupIcon    = useRef(makePickupIcon()).current;
  const dropoffIcon   = useRef(makeDropoffIcon()).current;
  const vehicleIcon   = useRef(makeVehicleIcon()).current;
  const passengerIcon = useRef(makePassengerIcon()).current;
  const driverDots    = useRef(NEARBY_DRIVERS.map((_, i) => makeDriverDot(i))).current;

  // Keep pickup input synced with zone
  useEffect(() => { setPickupInput(ASHAIMAN_ZONES[activeZone].label); }, [activeZone]);

  const resolvedAvatar = displayAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FACC15&color=111827&bold=true&rounded=true`;

  const glass: React.CSSProperties       = { background:'rgba(15,23,42,0.72)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.08)' };
  const glassBright: React.CSSProperties = { background:'rgba(30,41,59,0.82)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.10)' };

  // ── Book / cancel ride ─────────────────────────────────────────────────────
  const handleBookRide = () => {
    const zone = ASHAIMAN_ZONES[activeZone];
    const dest = ASHAIMAN_ZONES.find(z =>
      z.label.toLowerCase().includes(dropoffInput.toLowerCase().split(' ')[0])
    ) || ASHAIMAN_ZONES[1];

    setActiveRide({
      pickupName: zone.label, pickupLat: zone.lat, pickupLng: zone.lng,
      dropoffName: dest.label, dropoffLat: dest.lat, dropoffLng: dest.lng,
      driverName: 'SafMove Rider #42',
      driverLat: zone.lat + 0.002, driverLng: zone.lng - 0.001,
      helmetPin: `#${Math.floor(1000 + Math.random() * 9000)}`,
      fare: +(8 + Math.random() * 15).toFixed(2),
      etaMin: Math.floor(4 + Math.random() * 10),
      distKm: +(1.2 + Math.random() * 4).toFixed(1),
      progress: 0,
      status: 'searching',
    });
    // Simulate progression
    setTimeout(() => setActiveRide(r => r ? { ...r, status: 'accepted', progress: 15 } : null), 2000);
    setTimeout(() => setActiveRide(r => r ? { ...r, status: 'on_way',   progress: 35 } : null), 4000);
    setTimeout(() => setActiveRide(r => r ? { ...r, progress: 62 } : null), 7000);
  };

  const handleCancelRide = () => setActiveRide(null);

  // ── Nav items ──────────────────────────────────────────────────────────────
  const NAV_ITEMS: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id:'home', label:'Home',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { id:'route', label:'Route',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-5 h-5"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17V7a4 4 0 0 1 4-4h4"/><path d="M18 7v10a4 4 0 0 1-4 4H8"/></svg> },
    { id:'profile', label:'Profile',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  ];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HOME VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const HomeView = () => (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-5 space-y-5">

        {/* Driver search */}
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={glassBright}>
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="pms-driver-search" type="text" placeholder="Search driver by username…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-white/30 hover:text-white/60" aria-label="Clear">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Service mode switcher */}
        <div className="rounded-2xl p-1.5 flex gap-1" style={glass}>
          {([{ id: 'okada' as const, label: 'Okada Ride', emoji: '🛵' }, { id: 'parcel' as const, label: 'Parcel Express', emoji: '📦' }]).map(({ id, label, emoji }) => (
            <button key={id} id={`pms-service-${id}`} onClick={() => setServiceMode(id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
              style={serviceMode === id ? { background: YELLOW, color: '#111827', boxShadow: '0 4px 20px rgba(250,204,21,0.40)' } : { color: 'rgba(255,255,255,0.50)' }}>
              <span className="text-base leading-none">{emoji}</span><span>{label}</span>
            </button>
          ))}
        </div>

        {/* Zone quick-pills */}
        <div>
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2.5 px-0.5">Ashaiman zones</p>
          <div className="flex flex-wrap gap-2">
            {ASHAIMAN_ZONES.map(({ label, emoji }, i) => (
              <button key={label} id={`pms-zone-${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => { setActiveZone(i); setActiveTab('route'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-95"
                style={activeZone === i
                  ? { background: YELLOW, color: '#111827', boxShadow: '0 3px 14px rgba(250,204,21,0.38)' }
                  : { ...glassBright, color: 'rgba(255,255,255,0.65)' }
                }>
                <span>{emoji}</span><span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conditional: Active trip card OR idle "where to?" prompt */}
        {activeRide ? (
          <div className="rounded-3xl overflow-hidden" style={{ ...glassBright, boxShadow: '0 16px 50px rgba(0,0,0,0.45)' }}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${YELLOW},#f5b800)` }} />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill={YELLOW} stroke="none"/></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: YELLOW }}>
                    {activeRide.pickupName.toUpperCase()} ➔ {activeRide.dropoffName.toUpperCase()}
                  </span>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{
                  background: activeRide.status === 'searching' ? 'rgba(250,204,21,0.15)' : 'rgba(16,185,129,0.15)',
                  color: activeRide.status === 'searching' ? YELLOW : '#10b981',
                  border: `1px solid ${activeRide.status === 'searching' ? 'rgba(250,204,21,0.30)' : 'rgba(16,185,129,0.30)'}`,
                }}>
                  {activeRide.status === 'searching' ? '◎ SEARCHING' : activeRide.status === 'accepted' ? '✓ ACCEPTED' : '● ON WAY'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white leading-tight" style={{ letterSpacing: '-0.4px' }}>{activeRide.driverName}</h3>
                <p className="text-[11px] text-white/40 font-medium mt-0.5">SafMove Verified Rider · Helmet PIN <span style={{ color: YELLOW }}>{activeRide.helmetPin}</span></p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Dest', value: activeRide.dropoffName.split(' ')[0], icon: <svg viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill={YELLOW} stroke="none"/></svg> },
                  { label: 'ETA', value: `${activeRide.etaMin} min`, icon: <svg viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                  { label: 'Dist', value: `${activeRide.distKm} km`, icon: <svg viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M3 12h18M3 6h18M3 18h18"/></svg> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex flex-col items-center rounded-xl p-2.5 gap-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {icon}<p className="text-[9px] text-white/40 font-semibold">{label}</p><p className="text-xs font-extrabold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-white/50">Trip progress</span>
                  <span className="text-[11px] font-extrabold" style={{ color: YELLOW }}>{activeRide.progress}%</span>
                </div>
                <div className="relative w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${activeRide.progress}%`, background: `linear-gradient(90deg,${YELLOW},#f5b800)`, boxShadow: '0 0 8px rgba(250,204,21,0.60)' }} />
                  {activeRide.progress > 0 && <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-all duration-700" style={{ left: `calc(${activeRide.progress}% - 6px)` }} />}
                </div>
              </div>

              {/* Fare + actions */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-white/40 font-semibold">Estimated fare</p>
                  <p className="text-lg font-black text-white">GH₵ {activeRide.fare.toFixed(2)}</p>
                </div>
                <button onClick={() => setActiveTab('route')}
                  className="px-4 py-2.5 rounded-2xl font-black text-xs transition-all active:scale-95"
                  style={{ background: YELLOW, color: '#111827' }}>
                  View on Map
                </button>
                <button onClick={handleCancelRide}
                  className="px-4 py-2.5 rounded-2xl font-black text-xs transition-all active:scale-95"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.30)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden" style={{ ...glassBright, boxShadow: '0 16px 50px rgba(0,0,0,0.45)' }}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${YELLOW},#f5b800)` }} />
            <div className="p-5 space-y-3 text-center">
              <p className="text-lg font-extrabold text-white">Where to?</p>
              <p className="text-xs text-white/40 font-medium">Select a zone above or go to Route tab to pick your destination</p>
              <button onClick={() => setActiveTab('route')}
                className="px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 mx-auto"
                style={{ background: YELLOW, color: '#111827', boxShadow: '0 8px 24px rgba(250,204,21,0.40)' }}>
                🛵 Request SafMove Ride
              </button>
            </div>
          </div>
        )}

        {/* Promo banner */}
        <div className="relative rounded-2xl overflow-hidden h-32 flex-shrink-0">
          <img src="/display.png" alt="SafMove Ashaiman" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(2,6,23,0.82) 0%,rgba(2,6,23,0.28) 100%)' }} />
          <div className="absolute inset-0 flex flex-col justify-center px-5">
            <span className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: YELLOW }}>SafMove · Ashaiman</span>
            <p className="text-white font-extrabold text-base leading-tight">Ride safe across<br/>Ashaiman zones 🛵</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROUTE VIEW — Idle vs Active
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const RouteView = () => {
    const zone = ASHAIMAN_ZONES[activeZone];

    return (
      <div className="flex-1 flex flex-col min-h-0 pb-20">
        {/* Top controls */}
        <div className="flex-shrink-0 px-4 md:px-6 pt-4 pb-3 space-y-2.5">
          {/* Pickup */}
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={glassBright}>
            <span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#10b981' }}>A</span>
            <input type="text" value={pickupInput} onChange={(e) => setPickupInput(e.target.value)} placeholder="Pickup location…"
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-semibold" />
          </div>
          {/* Destination */}
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={glassBright}>
            <span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black" style={{ background: YELLOW, color: '#111' }}>B</span>
            <input type="text" value={dropoffInput} onChange={(e) => setDropoffInput(e.target.value)} placeholder="Destination…"
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none font-semibold" />
          </div>

          {/* Fare + CTA */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2" style={glassBright}>
              <svg viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>
              <div>
                <p className="text-[9px] text-white/40 font-semibold">Fare estimate</p>
                <p className="text-sm font-black text-white">{activeRide ? `GH₵ ${activeRide.fare.toFixed(2)}` : 'GH₵ —'}</p>
              </div>
              <div className="ml-auto text-[9px] text-white/40 font-semibold text-right">
                <p>{activeRide ? `${activeRide.etaMin} min ETA` : '— min'}</p>
                <p>{activeRide ? `${activeRide.distKm} km` : '— km'}</p>
              </div>
            </div>
            {activeRide ? (
              <button onClick={handleCancelRide}
                className="px-5 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 whitespace-nowrap"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.30)' }}>
                Cancel Ride
              </button>
            ) : (
              <button id="pms-route-book-btn" onClick={handleBookRide}
                className="px-5 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 whitespace-nowrap"
                style={{ background: YELLOW, color: '#111827', boxShadow: '0 8px 24px rgba(250,204,21,0.40)' }}>
                Request SafMove Ride
              </button>
            )}
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black px-3 py-1.5 rounded-full" style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.28)', color: YELLOW }}>
              {serviceMode === 'okada' ? '🛵 Okada Ride' : '📦 Parcel Express'}
            </span>
            {activeRide ? (
              <span className="text-[11px] font-black px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', color: '#10b981' }}>
                ● {activeRide.status === 'searching' ? 'Searching…' : activeRide.status === 'accepted' ? 'Driver accepted' : 'Driver on way'}
              </span>
            ) : (
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.40)' }}>
                {NEARBY_DRIVERS.length} riders nearby
              </span>
            )}
          </div>
        </div>

        {/* Leaflet map */}
        <div className="flex-1 relative mx-4 md:mx-6 rounded-3xl overflow-hidden" style={{ minHeight: 320, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}>
          {/* Overlay badges */}
          {activeRide ? (
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ ...glass, pointerEvents: 'none' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: YELLOW }} />
              <span className="text-xs font-bold text-white">{activeRide.pickupName}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" className="w-3 h-3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <span className="text-xs font-bold text-white">{activeRide.dropoffName}</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
          ) : (
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ ...glass, pointerEvents: 'none' }}>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-bold text-white">Your location · {zone.label}</span>
            </div>
          )}
          <div className="absolute top-3 right-3 z-[1000] px-3 py-2 rounded-xl" style={glass}>
            <span className="text-[11px] font-black" style={{ color: YELLOW }}>{serviceMode === 'okada' ? '🛵 Okada' : '📦 Parcel'}</span>
          </div>

          <MapContainer
            center={[zone.lat, zone.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%', minHeight: 320 }}
            zoomControl={false}
            attributionControl={false}
            key={`map-${activeZone}-${activeRide ? 'active' : 'idle'}`}
          >
            <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTR} maxZoom={19} />

            {/* Passenger position — always visible */}
            <Marker position={[zone.lat, zone.lng]} icon={passengerIcon}>
              <Popup>You · {zone.label}</Popup>
            </Marker>

            {activeRide ? (
              <>
                {/* Active ride: yellow route line + A/B/driver markers */}
                <Polyline
                  positions={[[activeRide.pickupLat, activeRide.pickupLng], [activeRide.dropoffLat, activeRide.dropoffLng]]}
                  pathOptions={{ color: YELLOW, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
                />
                <Marker position={[activeRide.pickupLat, activeRide.pickupLng]} icon={pickupIcon}><Popup>{activeRide.pickupName}</Popup></Marker>
                <Marker position={[activeRide.dropoffLat, activeRide.dropoffLng]} icon={dropoffIcon}><Popup>{activeRide.dropoffName}</Popup></Marker>
                <Marker position={[activeRide.driverLat, activeRide.driverLng]} icon={vehicleIcon}><Popup>{activeRide.driverName}</Popup></Marker>
              </>
            ) : (
              <>
                {/* Idle: show nearby driver dots — no polyline */}
                {NEARBY_DRIVERS.map((d, i) => (
                  <Marker key={i} position={[d.lat, d.lng]} icon={driverDots[i]}>
                    <Popup>{d.name} · Available</Popup>
                  </Marker>
                ))}
              </>
            )}
          </MapContainer>
        </div>

        {/* Active ride: progress sheet below map */}
        {activeRide && activeRide.progress > 0 && (
          <div className="mx-4 md:mx-6 mt-3 rounded-2xl p-4 space-y-2" style={glassBright}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-white">{activeRide.driverName}</p>
                <p className="text-[10px] text-white/40 font-medium">Helmet PIN <span style={{ color: YELLOW }}>{activeRide.helmetPin}</span></p>
              </div>
              <span className="text-xs font-black" style={{ color: YELLOW }}>{activeRide.progress}%</span>
            </div>
            <div className="relative w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700" style={{ width: `${activeRide.progress}%`, background: `linear-gradient(90deg,${YELLOW},#f5b800)` }} />
            </div>
            <div className="flex justify-between text-[9px] text-white/30 font-semibold">
              <span>{activeRide.pickupName}</span>
              <span>{activeRide.dropoffName}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROFILE VIEW
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const ProfileView = () => (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="max-w-md mx-auto px-4 md:px-6 pt-6 space-y-5">
        <div className="flex flex-col items-center gap-4 py-6 rounded-3xl" style={glassBright}>
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden" style={{ border: `3px solid ${YELLOW}`, boxShadow: `0 0 0 6px rgba(250,204,21,0.15), 0 8px 32px rgba(0,0,0,0.50)` }}>
              <img src={resolvedAvatar} alt={displayName} className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FACC15&color=111827&bold=true`; }} />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online" />
          </div>
          <div className="text-center">
            <p className="text-xl font-extrabold text-white">{displayName}</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: YELLOW }}>{displayUser}</p>
            <p className="text-xs text-white/40 font-medium mt-1">{profile?.phone || '+233 24 000 0000'}</p>
          </div>
          <div className="flex gap-8 text-center pt-1">
            {[{ label: 'Trips', value: '24' }, { label: 'Rating', value: '4.9 ★' }, { label: 'Saves', value: 'GH₵ 12' }].map(({ label, value }) => (
              <div key={label}>
                <p className="text-base font-extrabold text-white">{value}</p>
                <p className="text-[10px] text-white/40 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden divide-y divide-white/5" style={glassBright}>
          {[
            { icon: '🔔', label: 'Notifications', sub: 'Manage alerts' },
            { icon: '🔒', label: 'Privacy & Security', sub: 'Password, 2FA' },
            { icon: '💳', label: 'Payment Methods', sub: 'MoMo, Cash' },
            { icon: '📍', label: 'Saved Places', sub: 'Home, Work, Favourite spots' },
            { icon: '🛟', label: 'Help & Support', sub: 'FAQs, Contact SafMove' },
            { icon: '🚪', label: 'Sign Out', sub: '', danger: true },
          ].map(({ icon, label, sub, danger }) => (
            <button key={label} className="w-full flex items-center gap-4 px-5 py-4 transition-all duration-150 active:scale-[0.99] hover:bg-white/5 text-left">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${danger ? 'text-rose-400' : 'text-white'}`}>{label}</p>
                {sub && <p className="text-[11px] text-white/40 font-medium truncate">{sub}</p>}
              </div>
              {!danger && <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" className="w-4 h-4 flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>}
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] text-white/20 font-semibold pb-2">SafMove · Ashaiman v1.0 · Verified Platform</p>
      </div>
    </div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROOT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div
      id="passenger-map-screen"
      className="min-h-screen flex flex-col select-none relative"
      style={{ background: 'linear-gradient(160deg,#020617 0%,#0f172a 50%,#020617 100%)', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}
    >
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 flex-shrink-0 flex items-center gap-4 px-4 md:px-8 py-3.5" style={glass}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden cursor-pointer"
            onClick={() => setActiveTab('profile')}
            style={{ border: `2px solid ${YELLOW}`, boxShadow: '0 0 0 3px rgba(250,204,21,0.20)' }}>
            <img src={resolvedAvatar} alt={displayName} className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FACC15&color=111827&bold=true`; }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-white/40 font-semibold tracking-wide">Welcome back 👋</p>
            <p className="text-base font-extrabold text-white leading-tight truncate">{displayName}</p>
            <p className="text-[11px] font-semibold truncate" style={{ color: YELLOW }}>{displayUser}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center">
          <span className="text-[11px] font-black tracking-[0.18em] uppercase px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.30)', color: YELLOW }}>
            SafMove · Ashaiman
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
            <img src="/display.png" alt="SafMove display" className="w-full h-full object-cover" />
          </div>
          <button id="pms-notification-btn" aria-label="Notifications"
            className="relative flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90" style={glassBright}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.70)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 ring-2 ring-slate-900 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {notifCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* TAB CONTENT */}
      {activeTab === 'home'    && <HomeView />}
      {activeTab === 'route'   && <RouteView />}
      {activeTab === 'profile' && <ProfileView />}

      {/* STICKY BOTTOM NAV */}
      <nav id="pms-bottom-nav" className="sticky bottom-0 z-50 w-full flex-shrink-0"
        style={{ background: 'rgba(9,15,30,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-around max-w-lg mx-auto px-4 py-2.5">
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const isActive = activeTab === id;
            return (
              <button key={id} id={`pms-nav-${id}`} onClick={() => setActiveTab(id)} aria-label={label}
                className="flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-all duration-200 active:scale-90"
                style={isActive
                  ? { background: `linear-gradient(135deg,${YELLOW} 0%,#f5b800 100%)`, color: '#111827', boxShadow: '0 4px 16px rgba(250,204,21,0.40)' }
                  : { color: 'rgba(255,255,255,0.42)' }
                }>
                {icon}
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default PassengerMapScreen;
