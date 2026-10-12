import React, { useEffect, useState } from 'react';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface SplashScreenProps {
  onGo: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const SplashScreen: React.FC<SplashScreenProps> = ({ onGo }) => {
  const [ready, setReady] = useState(false);

  // Brief mount animation delay before showing the CTA
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      id="splash-screen"
      className="min-h-screen flex flex-col items-center justify-between px-6 py-12 select-none"
      style={{
        background: 'linear-gradient(160deg, #111827 0%, #0d1520 55%, #1a2234 100%)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* ── Top spacer */}
      <div />

      {/* ── Logo + brand section ────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8">

        {/* Animated logo ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer spinning ring */}
          <div
            className="absolute w-36 h-36 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: '#F9EB4F',
              borderRightColor: 'rgba(249,235,79,0.25)',
              animation: 'splash-spin 2s linear infinite',
            }}
          />
          {/* Middle pulsing ring */}
          <div
            className="absolute w-28 h-28 rounded-full"
            style={{
              border: '2px solid rgba(249,235,79,0.15)',
              animation: 'splash-pulse 2.5s ease-in-out infinite',
            }}
          />
          {/* Logo disc */}
          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center z-10"
            style={{
              background: '#F9EB4F',
              boxShadow: '0 0 40px rgba(249,235,79,0.4), 0 0 80px rgba(249,235,79,0.15)',
            }}
          >
            {/* SafMove "S" top-down van icon */}
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
              {/* Van body */}
              <rect x="4" y="14" width="36" height="22" rx="5" fill="#111827" />
              {/* Roof */}
              <rect x="8" y="10" width="28" height="6" rx="3" fill="#1f2937" />
              {/* Windows */}
              <rect x="7" y="17" width="8" height="7" rx="2" fill="#F9EB4F" opacity="0.8" />
              <rect x="18" y="17" width="8" height="7" rx="2" fill="#F9EB4F" opacity="0.8" />
              <rect x="29" y="17" width="8" height="7" rx="2" fill="#F9EB4F" opacity="0.8" />
              {/* Wheels */}
              <circle cx="12" cy="36" r="5" fill="#1f2937" />
              <circle cx="12" cy="36" r="2.5" fill="#F9EB4F" />
              <circle cx="36" cy="36" r="5" fill="#1f2937" />
              <circle cx="36" cy="36" r="2.5" fill="#F9EB4F" />
            </svg>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1
            className="text-5xl font-black text-white tracking-tight"
            style={{ letterSpacing: '-1.5px' }}
          >
            Saf<span style={{ color: '#F9EB4F' }}>Move</span>
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/40 tracking-widest uppercase">
            Your Safe Journey Starts Here
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {['🗺️ Live GPS', '🚌 Public Transport', '🔒 Verified Riders'].map((f) => (
            <span
              key={f}
              className="text-xs font-bold text-white/60 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA section ──────────────────────────────────────────────── */}
      <div
        className="w-full max-w-sm flex flex-col items-center gap-4"
        style={{
          opacity: ready ? 1 : 0,
          transform: ready ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* GO button */}
        <button
          id="splash-go-btn"
          onClick={onGo}
          className="w-full py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #F9EB4F 0%, #f5d90a 100%)',
            color: '#111827',
            boxShadow: '0 8px 32px rgba(249,235,79,0.50)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-6 h-6">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          GO
        </button>

        <p className="text-xs text-white/25 text-center">
          Fast · Secure · Accra-focused transport network
        </p>
      </div>

      {/* ── Keyframe injector ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes splash-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splash-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
