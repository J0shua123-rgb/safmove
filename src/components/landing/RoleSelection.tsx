import React, { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────
export type RoleOption = 'passenger' | 'driver';

interface RoleSelectionProps {
  /** Called when user taps Continue — routes to the appropriate portal */
  onSelectRole: (role: RoleOption) => void;
}

// ─── Card data ──────────────────────────────────────────────────────────────────
const CARDS: {
  role: RoleOption;
  image: string;
  imageAlt: string;
  label: string;
  title: string;
  subtitle: string;
  emoji: string;
}[] = [
  {
    role: 'passenger',
    image: '/peesenger.png',
    imageAlt: 'Passenger',
    label: 'Passenger & Courier',
    title: 'Passenger & Courier',
    subtitle: 'Book fast Okada rides or send express packages',
    emoji: '🛵',
  },
  {
    role: 'driver',
    image: '/driver.png',
    imageAlt: 'Driver',
    label: 'Driver Partner',
    title: 'SafMove Driver Partner',
    subtitle: 'Go online, accept ride requests, and earn on your schedule',
    emoji: '🤝',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────────
export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  const [selected, setSelected] = useState<RoleOption | null>(null);
  const [exiting, setExiting] = useState(false);

  const handleContinue = () => {
    if (!selected) return;
    setExiting(true);
    setTimeout(() => onSelectRole(selected), 380);
  };

  return (
    <div
      id="role-selection-screen"
      className="min-h-screen flex flex-col select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        background: 'linear-gradient(160deg, #0a0e1a 0%, #111827 55%, #0f172a 100%)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-24px)' : 'translateY(0)',
        transition: exiting ? 'opacity 0.38s ease, transform 0.38s ease' : 'none',
      }}
    >
      {/* ── Responsive desktop container ──────────────────────────────────── */}
      <div className="max-w-4xl mx-auto w-full min-h-screen md:min-h-0 md:h-screen p-6 flex flex-col justify-between items-center">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="w-full pt-4 md:pt-6 pb-4"
        style={{ animation: 'rs-fade-down 0.5s ease both' }}
      >
        {/* Back chevron / brand pill */}
        <div className="flex items-center gap-2 mb-8">
          <span
            className="text-[11px] font-black tracking-[0.18em] uppercase px-3 py-1 rounded-full"
            style={{
              background: 'rgba(250,204,21,0.12)',
              border: '1px solid rgba(250,204,21,0.35)',
              color: '#FACC15',
            }}
          >
            SafMove
          </span>
        </div>

        <h1
          className="text-3xl font-black text-white leading-tight"
          style={{ letterSpacing: '-0.03em', textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}
        >
          How are you moving
          <br />
          <span style={{ color: '#FACC15' }}>today?</span>
        </h1>
        <p className="mt-3 text-sm font-medium text-white/50">
          Select your role to continue across Accra
        </p>
      </div>

      {/* ── Cards — single column on mobile, two columns on desktop ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {CARDS.map(({ role, image, imageAlt, title, subtitle, emoji }, i) => {
          const isSelected = selected === role;

          return (
            <div
              key={role}
              id={`role-card-${role}`}
              onClick={() => setSelected(role)}
              className="relative cursor-pointer rounded-3xl overflow-hidden"
              style={{
                border: isSelected
                  ? '2px solid #FACC15'
                  : '2px solid rgba(255,255,255,0.08)',
                boxShadow: isSelected
                  ? '0 0 0 4px rgba(250,204,21,0.15), 0 16px 48px rgba(250,204,21,0.18)'
                  : '0 4px 24px rgba(0,0,0,0.35)',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                animation: `rs-fade-up 0.5s ${0.1 + i * 0.1}s ease both`,
                transform: isSelected ? 'scale(1.015)' : 'scale(1)',
                transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
              }}
            >
              {/* ── Image wrapper: object-contain so nothing is cropped ── */}
              <div className="relative w-full h-36 sm:h-44 md:h-48 flex items-center justify-center p-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl overflow-hidden">
                <img
                  src={image}
                  alt={imageAlt}
                  className="w-full h-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                  draggable={false}
                />

                {/* Selection tick */}
                <div
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isSelected ? '#FACC15' : 'rgba(255,255,255,0.12)',
                    border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                    transform: isSelected ? 'scale(1)' : 'scale(0.85)',
                    opacity: isSelected ? 1 : 0.6,
                  }}
                >
                  {isSelected ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#111827"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-white/40" />
                  )}
                </div>
              </div>

              {/* ── Card text section with yellow accent border when active ── */}
              <div
                className="px-5 py-4 rounded-b-3xl transition-all duration-250"
                style={{
                  borderTop: isSelected
                    ? '2px solid #FACC15'
                    : '2px solid rgba(255,255,255,0.06)',
                  background: isSelected
                    ? 'rgba(250,204,21,0.04)'
                    : 'transparent',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5 leading-none">{emoji}</span>
                  <div>
                    <h2
                      className="font-black text-base leading-tight"
                      style={{
                        color: isSelected ? '#FACC15' : '#f1f5f9',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {title}
                    </h2>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Yellow left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 rounded-l-3xl transition-all duration-300"
                style={{
                  width: isSelected ? 4 : 0,
                  background: '#FACC15',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <div
        className="w-full max-w-2xl pt-4 pb-6"
        style={{ animation: 'rs-fade-up 0.5s 0.35s ease both' }}
      >
        <button
          type="button"
          id="role-continue-btn"
          onClick={handleContinue}
          disabled={!selected}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all duration-200"
          style={
            selected
              ? {
                  background: 'linear-gradient(135deg, #FACC15 0%, #f5b800 100%)',
                  color: '#111827',
                  boxShadow: '0 8px 32px rgba(250,204,21,0.45)',
                  transform: 'scale(1)',
                }
              : {
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.3)',
                  border: '1.5px solid rgba(255,255,255,0.10)',
                }
          }
        >
          {selected ? (
            <>
              <span>
                Continue as{' '}
                {selected === 'passenger' ? 'Passenger / Rider' : 'Driver Partner'}
              </span>
              {/* Arrow */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          ) : (
            <span>Select a role to continue</span>
          )}
        </button>

        {/* Small print */}
        <p className="mt-4 text-center text-[11px] text-white/25">
          Fast · Secure · Accra-focused transport network
        </p>
      </div>

      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes rs-fade-down {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rs-fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── /Responsive desktop container ────────────────────────────────── */}
      </div>
    </div>
  );
};

export default RoleSelection;
