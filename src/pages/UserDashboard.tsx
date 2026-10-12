import React, { useState, useRef } from 'react';
import {
  Search,
  Bell,
  MapPin,
  Bus,
  Car,
  Plane,
  Bike,
  Navigation,
  Clock,
  Ruler,
  Home,
  Route,
  User,
  ChevronRight,
  Zap,
  Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TransportMode = 'Car' | 'Airplane' | 'Motorbike' | 'Scooter';
type NavTab = 'home' | 'route' | 'profile';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Scooter icon — lucide doesn't ship one, so we use a minimal inline SVG */
const ScooterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5.5" cy="17.5" r="2.5" />
    <circle cx="18.5" cy="17.5" r="2.5" />
    <path d="M8 17.5h7" />
    <path d="M14 17.5V11l-3-5H8" />
    <path d="M14 11h4l2 4" />
    <path d="M6 10l2 1" />
  </svg>
);

/** Classic bus / van illustration — the "Monument Walley" asset */
const ClassicBusIllustration: React.FC = () => (
  <svg
    viewBox="0 0 200 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))' }}
  >
    {/* Road shadow */}
    <ellipse cx="100" cy="95" rx="78" ry="5.5" fill="rgba(0,0,0,0.18)" />

    {/* Main body */}
    <rect x="8" y="28" width="168" height="52" rx="12" fill="#F9EB4F" />
    {/* Body highlight */}
    <rect x="8" y="28" width="168" height="14" rx="12" fill="#FDF572" opacity="0.5" />

    {/* Roof rack */}
    <rect x="18" y="18" width="148" height="12" rx="5" fill="#E8D420" />
    {/* Luggage on rack */}
    <rect x="24" y="13" width="14" height="8" rx="2" fill="#C9A800" />
    <rect x="42" y="13" width="11" height="8" rx="2" fill="#D4B200" />
    <rect x="57" y="14" width="9" height="7" rx="1.5" fill="#B89600" />
    <rect x="150" y="13" width="12" height="8" rx="2" fill="#C9A800" />
    <rect x="135" y="14" width="10" height="7" rx="1.5" fill="#D4B200" />
    {/* Rack straps */}
    <line x1="31" y1="18" x2="31" y2="21" stroke="#a08000" strokeWidth="1.2" />
    <line x1="53" y1="18" x2="53" y2="21" stroke="#a08000" strokeWidth="1.2" />
    <line x1="141" y1="18" x2="141" y2="21" stroke="#a08000" strokeWidth="1.2" />
    <line x1="156" y1="18" x2="156" y2="21" stroke="#a08000" strokeWidth="1.2" />

    {/* Windows */}
    <rect x="18" y="36" width="26" height="18" rx="5" fill="#0f172a" opacity="0.82" />
    <rect x="50" y="36" width="26" height="18" rx="5" fill="#0f172a" opacity="0.82" />
    <rect x="82" y="36" width="26" height="18" rx="5" fill="#0f172a" opacity="0.82" />
    <rect x="114" y="36" width="26" height="18" rx="5" fill="#0f172a" opacity="0.82" />
    {/* Window glare */}
    <rect x="20" y="38" width="9" height="4" rx="1.5" fill="white" opacity="0.22" />
    <rect x="52" y="38" width="9" height="4" rx="1.5" fill="white" opacity="0.22" />
    <rect x="84" y="38" width="9" height="4" rx="1.5" fill="white" opacity="0.22" />
    <rect x="116" y="38" width="9" height="4" rx="1.5" fill="white" opacity="0.22" />

    {/* Front bumper / grille */}
    <rect x="156" y="52" width="22" height="22" rx="4" fill="#E8D420" />
    <rect x="159" y="55" width="16" height="13" rx="3" fill="#0f172a" opacity="0.55" />
    {/* Grille lines */}
    <line x1="162" y1="57" x2="162" y2="67" stroke="#F9EB4F" strokeWidth="0.8" opacity="0.5" />
    <line x1="167" y1="57" x2="167" y2="67" stroke="#F9EB4F" strokeWidth="0.8" opacity="0.5" />
    <line x1="172" y1="57" x2="172" y2="67" stroke="#F9EB4F" strokeWidth="0.8" opacity="0.5" />
    {/* Front headlight */}
    <circle cx="172" cy="73" r="4" fill="#E8D420" />
    <circle cx="172" cy="73" r="2.5" fill="white" opacity="0.8" />

    {/* Rear detail */}
    <rect x="8" y="52" width="14" height="22" rx="4" fill="#E8D420" />
    {/* Rear tail-light */}
    <circle cx="12" cy="71" r="3.5" fill="#ef4444" opacity="0.8" />
    <circle cx="12" cy="71" r="1.5" fill="white" opacity="0.4" />

    {/* Body stripe */}
    <rect x="8" y="60" width="168" height="4" rx="2" fill="#0f172a" opacity="0.10" />

    {/* SafMove badge */}
    <rect x="70" y="63" width="60" height="14" rx="4" fill="#0f172a" opacity="0.14" />
    <text
      x="100" y="73.5"
      textAnchor="middle"
      fontSize="7.5"
      fontWeight="800"
      fill="#0f172a"
      opacity="0.6"
      fontFamily="monospace"
      letterSpacing="1.5"
    >SAFMOVE</text>

    {/* Front wheel */}
    <circle cx="38" cy="84" r="13" fill="#1e293b" />
    <circle cx="38" cy="84" r="8" fill="#475569" />
    <circle cx="38" cy="84" r="4" fill="#cbd5e1" />
    <circle cx="38" cy="84" r="2" fill="#1e293b" />
    <path d="M32 79 Q38 76 44 79" stroke="white" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />

    {/* Rear wheel */}
    <circle cx="152" cy="84" r="13" fill="#1e293b" />
    <circle cx="152" cy="84" r="8" fill="#475569" />
    <circle cx="152" cy="84" r="4" fill="#cbd5e1" />
    <circle cx="152" cy="84" r="2" fill="#1e293b" />
    <path d="M146 79 Q152 76 158 79" stroke="white" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />
  </svg>
);

// ─── Transport mode config ─────────────────────────────────────────────────────

const TRANSPORT_MODES: { id: TransportMode; label: string; icon: React.ReactNode }[] = [
  { id: 'Car',      label: 'Car',      icon: <Car      className="w-5 h-5" /> },
  { id: 'Airplane', label: 'Airplane', icon: <Plane    className="w-5 h-5" /> },
  { id: 'Motorbike',label: 'Motorbike',icon: <Bike     className="w-5 h-5" /> },
  { id: 'Scooter',  label: 'Scooter',  icon: <ScooterIcon className="w-5 h-5" /> },
];

// ─── Main Component ────────────────────────────────────────────────────────────

interface UserDashboardProps {
  /** User's display name — falls back to 'Daniel' */
  userName?: string;
  /** Avatar URL — falls back to ui-avatars initials */
  avatarUrl?: string;
  onFindRoute?: () => void;
  onPublicTransport?: () => void;
  onNavChange?: (tab: NavTab) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  userName = 'Daniel',
  avatarUrl,
  onFindRoute,
  onPublicTransport,
  onNavChange,
}) => {
  const [selectedMode, setSelectedMode] = useState<TransportMode>('Motorbike');
  const [activeTab, setActiveTab]       = useState<NavTab>('home');
  const [tripProgress]                  = useState(62); // % — static demo
  const [notifCount]                    = useState(3);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resolvedAvatar =
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=F9EB4F&color=111827&bold=true&rounded=true`;

  const handleNav = (tab: NavTab) => {
    setActiveTab(tab);
    onNavChange?.(tab);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-['Plus_Jakarta_Sans',sans-serif] select-none">

      {/* ── Scrollable content area ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24 px-5 pt-6 space-y-6 max-w-md mx-auto w-full">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between">

          {/* Avatar + greeting */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex-shrink-0">
              <img
                src={resolvedAvatar}
                alt={userName}
                id="user-avatar"
                className="w-13 h-13 rounded-2xl object-cover"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  boxShadow: '0 0 0 3px #F9EB4F, 0 0 0 5px rgba(249,235,79,0.25)',
                }}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=F9EB4F&color=111827&bold=true&rounded=true`;
                }}
              />
              {/* Online status dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Online"
              />
            </div>

            <div>
              <p className="text-xs text-dark-500 font-semibold tracking-wide">Good morning 👋</p>
              <h1 className="text-xl font-extrabold text-dark leading-tight">
                Hello, {userName}
              </h1>
            </div>
          </div>

          {/* Icon actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              id="header-search-btn"
              aria-label="Search"
              className="w-11 h-11 rounded-2xl bg-white border border-dark-200 flex items-center justify-center text-dark-500 shadow-sm transition-all duration-200 hover:bg-primary hover:text-dark hover:border-primary hover:shadow-md active:scale-90"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </button>
            {/* Notifications */}
            <button
              id="header-notifications-btn"
              aria-label="Notifications"
              className="relative w-11 h-11 rounded-2xl bg-white border border-dark-200 flex items-center justify-center text-dark-500 shadow-sm transition-all duration-200 hover:bg-primary hover:text-dark hover:border-primary hover:shadow-md active:scale-90"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={2.2} />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 ring-2 ring-white text-white text-[9px] font-bold flex items-center justify-center px-1">
                  {notifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ── Action Buttons ──────────────────────────────────────────────────── */}
        <section id="action-buttons" className="grid grid-cols-2 gap-3">

          {/* Find a Route */}
          <button
            id="find-route-btn"
            onClick={onFindRoute}
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-3xl transition-all duration-200 active:scale-[0.96]"
            style={{
              background: 'linear-gradient(135deg, #F9EB4F 0%, #f5d90a 100%)',
              boxShadow: '0 8px 24px rgba(249,235,79,0.45)',
            }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/20" />
            <div className="w-11 h-11 rounded-2xl bg-dark/10 flex items-center justify-center z-10">
              <Navigation className="w-5 h-5 text-dark" strokeWidth={2.2} />
            </div>
            <div className="text-left z-10">
              <p className="text-sm font-extrabold text-dark leading-tight">Find a route</p>
              <p className="text-[11px] text-dark/60 font-medium mt-0.5">Live GPS routing</p>
            </div>
            <ChevronRight className="absolute right-3 bottom-4 w-4 h-4 text-dark/40 group-hover:translate-x-1 transition-transform duration-200 z-10" />
          </button>

          {/* Public Transport */}
          <button
            id="public-transport-btn"
            onClick={onPublicTransport}
            className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-3xl transition-all duration-200 active:scale-[0.96]"
            style={{
              background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
              boxShadow: '0 8px 24px rgba(17,24,39,0.35)',
            }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center z-10">
              <Bus className="w-5 h-5 text-primary" strokeWidth={2.2} />
            </div>
            <div className="text-left z-10">
              <p className="text-sm font-extrabold text-white leading-tight">Public Transport</p>
              <p className="text-[11px] text-white/50 font-medium mt-0.5">Buses &amp; shared rides</p>
            </div>
            <ChevronRight className="absolute right-3 bottom-4 w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform duration-200 z-10" />
          </button>
        </section>

        {/* ── Transport Mode Selector ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-bold text-dark-700 mb-3">Transport mode</h2>
          <div
            ref={scrollRef}
            className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {TRANSPORT_MODES.map(({ id, label, icon }) => {
              const active = selectedMode === id;
              return (
                <button
                  key={id}
                  id={`transport-mode-${id.toLowerCase()}`}
                  onClick={() => setSelectedMode(id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3.5 rounded-2xl transition-all duration-200 active:scale-95"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, #F9EB4F 0%, #f5d90a 100%)',
                          color: '#111827',
                          boxShadow: '0 4px 16px rgba(249,235,79,0.4)',
                          transform: 'scale(1.04)',
                        }
                      : {
                          background: '#ffffff',
                          color: '#6b7280',
                          border: '1.5px solid #e5e7eb',
                        }
                  }
                >
                  {icon}
                  <span className="text-[11px] font-bold">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Quick Destinations ───────────────────────────────────────────── */}
        <section id="quick-destinations">
          <h2 className="text-sm font-bold text-dark-700 mb-3">Quick destinations</h2>
          <div
            className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { label: 'Ashaiman Night Market', icon: '🌙' },
              { label: 'Tulaku Junction',       icon: '🔀' },
              { label: 'Official Town',          icon: '🏛️' },
              { label: 'Lebanon Zone 2',         icon: '📍' },
              { label: 'Zenu / Ashaiman Circuit',icon: '🔄' },
            ].map(({ label, icon }) => (
              <button
                key={label}
                id={`quick-dest-${label.toLowerCase().replace(/[\s/]+/g, '-')}`}
                onClick={onFindRoute}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl transition-all duration-200 active:scale-95 hover:shadow-md"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e5e7eb',
                  color: '#374151',
                }}
              >
                <span className="text-base leading-none">{icon}</span>
                <span className="text-[11px] font-bold whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Active Trip Card ────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-dark-700">Active trip</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ON WAY
            </span>
          </div>

          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1a2234 0%, #111827 60%, #0d1520 100%)',
              boxShadow: '0 20px 40px rgba(17,24,39,0.30)',
            }}
          >
            {/* Card body */}
            <div className="p-5 pb-3">

              {/* Destination tag + stars */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary/90">
                    ASHAIMAN · NIGHT MARKET ➔ TULAKU JUNCTION
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star
                      key={s}
                      className="w-2.5 h-2.5"
                      fill={s <= 4 ? '#F9EB4F' : 'transparent'}
                      stroke={s <= 4 ? '#F9EB4F' : '#6b7280'}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>

              {/* Trip name */}
              <h3 className="text-2xl font-extrabold text-white leading-tight mb-1" style={{ letterSpacing: '-0.5px' }}>
                Tulaku Junction
              </h3>
              <p className="text-xs text-white/40 font-medium mb-5">SafMove Verified Rider · Helmet PIN #8821</p>

              {/* Bus illustration */}
              <div className="w-full h-36 mb-4">
                <ClassicBusIllustration />
              </div>

              {/* Trip stats row */}
              <div className="grid grid-cols-3 gap-2.5 mb-2">
                {/* Destination */}
                <div className="flex flex-col items-center rounded-2xl p-3 gap-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <MapPin className="w-4 h-4 text-primary" strokeWidth={2} />
                  <p className="text-[10px] text-white/40 font-medium">Destination</p>
                  <p className="text-xs font-extrabold text-white">Tulaku</p>
                </div>
                {/* Duration */}
                <div className="flex flex-col items-center rounded-2xl p-3 gap-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Clock className="w-4 h-4 text-primary" strokeWidth={2} />
                  <p className="text-[10px] text-white/40 font-medium">Duration</p>
                  <p className="text-xs font-extrabold text-white">18 mins</p>
                </div>
                {/* Distance */}
                <div className="flex flex-col items-center rounded-2xl p-3 gap-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Ruler className="w-4 h-4 text-primary" strokeWidth={2} />
                  <p className="text-[10px] text-white/40 font-medium">Distance</p>
                  <p className="text-xs font-extrabold text-white">12.4 km</p>
                </div>
              </div>
            </div>

            {/* Progress bar section */}
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-white/60">Trip progress</span>
                </div>
                <span className="text-[11px] font-extrabold text-primary">{tripProgress}%</span>
              </div>

              {/* Glowing progress track */}
              <div
                className="relative w-full h-3 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${tripProgress}%`,
                    background: 'linear-gradient(90deg, #F9EB4F 0%, #f5d90a 100%)',
                    boxShadow: '0 0 10px rgba(249,235,79,0.6)',
                  }}
                />
                {/* Thumb dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-all duration-700"
                  style={{ left: `calc(${tripProgress}% - 7px)` }}
                />
              </div>

              {/* Waypoint labels */}
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-white/35 font-semibold">Night Market (Ashaiman)</span>
                <span className="text-[10px] text-white/35 font-semibold">Tulaku Junction</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Eco tip banner ──────────────────────────────────────────────────── */}
        <section id="eco-tip-banner">
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #ecfccb 50%, #fef9c3 100%)',
              border: '1px solid rgba(16,185,129,0.20)',
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-dark">Eco mode active 🌱</p>
              <p className="text-xs text-dark/55 mt-0.5">You saved 2.4 kg CO₂ this week</p>
            </div>
          </div>
        </section>

      </main>

      {/* ── Bottom Navigation ─────────────────────────────────────────────────── */}
      <nav id="bottom-nav" className="fixed bottom-0 inset-x-0 z-50 max-w-md mx-auto">
        <div
          className="mx-4 mb-5 rounded-3xl px-4 py-3 flex items-center justify-around"
          style={{
            background: 'linear-gradient(160deg, #1a2234 0%, #111827 100%)',
            boxShadow: '0 20px 40px rgba(17,24,39,0.45)',
          }}
        >

          {/* Home */}
          <button
            id="nav-home-btn"
            onClick={() => handleNav('home')}
            aria-label="Home"
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200 active:scale-90"
            style={
              activeTab === 'home'
                ? {
                    background: 'linear-gradient(135deg, #F9EB4F 0%, #f5d90a 100%)',
                    color: '#111827',
                    boxShadow: '0 4px 12px rgba(249,235,79,0.4)',
                  }
                : { color: '#6b7280' }
            }
          >
            <Home className="w-5 h-5" strokeWidth={activeTab === 'home' ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold">Home</span>
          </button>

          {/* Route */}
          <button
            id="nav-route-btn"
            onClick={() => handleNav('route')}
            aria-label="Route"
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200 active:scale-90"
            style={
              activeTab === 'route'
                ? {
                    background: 'linear-gradient(135deg, #F9EB4F 0%, #f5d90a 100%)',
                    color: '#111827',
                    boxShadow: '0 4px 12px rgba(249,235,79,0.4)',
                  }
                : { color: '#6b7280' }
            }
          >
            <Route className="w-5 h-5" strokeWidth={activeTab === 'route' ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold">Route</span>
          </button>

          {/* Profile */}
          <button
            id="nav-profile-btn"
            onClick={() => handleNav('profile')}
            aria-label="Profile"
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200 active:scale-90"
            style={
              activeTab === 'profile'
                ? {
                    background: 'linear-gradient(135deg, #F9EB4F 0%, #f5d90a 100%)',
                    color: '#111827',
                    boxShadow: '0 4px 12px rgba(249,235,79,0.4)',
                  }
                : { color: '#6b7280' }
            }
          >
            <User className="w-5 h-5" strokeWidth={activeTab === 'profile' ? 2.5 : 1.8} />
            <span className="text-[10px] font-bold">Profile</span>
          </button>

        </div>
      </nav>
    </div>
  );
};

export default UserDashboard;
