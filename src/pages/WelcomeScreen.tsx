import React, { useRef, useState, useCallback, useEffect } from 'react';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface WelcomeScreenProps {
  onGo: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const SLIDER_HEIGHT = 260;   // total vertical travel in px
const TRIGGER_RATIO = 0.65;  // fraction of travel needed to trigger onGo

// ─── Component ─────────────────────────────────────────────────────────────────
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGo }) => {
  // Drag state
  const [dragY, setDragY] = useState(0);          // 0 = bottom, positive = dragged up
  const [isDragging, setIsDragging] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);  // whole-screen exit animation

  const startYRef = useRef<number>(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Fade-in animation delay
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  // ── Clamp drag value ──────────────────────────────────────────────────────
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  // ── Pointer / Touch handlers ──────────────────────────────────────────────
  const onDragStart = useCallback((clientY: number) => {
    if (triggered) return;
    setIsDragging(true);
    startYRef.current = clientY;
  }, [triggered]);

  const onDragMove = useCallback((clientY: number) => {
    if (!isDragging || triggered) return;
    const delta = startYRef.current - clientY; // positive = dragged up
    setDragY(clamp(delta, 0, SLIDER_HEIGHT));
  }, [isDragging, triggered]);

  const onDragEnd = useCallback(() => {
    if (!isDragging || triggered) return;
    setIsDragging(false);

    if (dragY >= SLIDER_HEIGHT * TRIGGER_RATIO) {
      // Snap thumb to top + show checkmark
      setDragY(SLIDER_HEIGHT);
      setTriggered(true);
      // Brief pause → start full-screen exit → then fire onGo
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => onGo(), 420);
      }, 280);
    } else {
      // Spring back to bottom
      setDragY(0);
    }
  }, [isDragging, triggered, dragY, onGo]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientY);
  };
  const handleMouseMove = useCallback((e: MouseEvent) => onDragMove(e.clientY), [onDragMove]);
  const handleMouseUp   = useCallback(() => onDragEnd(), [onDragEnd]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientY);
  const handleTouchMove  = (e: React.TouchEvent) => { e.preventDefault(); onDragMove(e.touches[0].clientY); };
  const handleTouchEnd   = () => onDragEnd();

  // Attach / detach global mouse listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ── Derived values ────────────────────────────────────────────────────────
  const progress      = dragY / SLIDER_HEIGHT;             // 0 → 1
  const thumbTranslate = -dragY;                           // thumb moves UP
  const trackFill     = dragY;                             // fill grows from bottom
  const glowOpacity   = 0.35 + progress * 0.65;
  const thumbScale    = isDragging ? 1.08 : 1;

  return (
    <div
      id="welcome-screen"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden select-none bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/welcome.png')",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-32px) scale(0.97)' : 'translateY(0) scale(1)',
        transition: exiting ? 'opacity 0.42s ease, transform 0.42s ease' : 'none',
      }}
    >
      {/* ── Dark gradient overlay for text legibility ─────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/90 pointer-events-none" />

      {/* ── Content layer ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-between h-full min-h-[80vh] px-6 pt-14 pb-10">

        {/* ── Top: Brand + Title ─────────────────────────────────────────── */}
        <div
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? 'translateY(0)' : 'translateY(-18px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {/* SAFMOVE brand pill */}
          <div className="inline-flex items-center gap-2 mb-5">
            <span
              className="text-xs font-black tracking-[0.22em] uppercase px-4 py-1.5 rounded-full"
              style={{
                background: 'rgba(250,204,21,0.12)',
                border: '1.5px solid rgba(250,204,21,0.45)',
                color: '#FACC15',
              }}
            >
              SAFMOVE
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-5xl font-black leading-tight text-white"
            style={{
              letterSpacing: '-0.03em',
              textShadow: '0 2px 24px rgba(0,0,0,0.7)',
            }}
          >
            Let&apos;s Move!{' '}
            <br />
            <span style={{ color: '#FACC15' }}>Ride Faster,</span>
            <br />
            Deliver Smarter.
          </h1>

          {/* Subtitle */}
          <p
            className="mt-4 text-sm md:text-base font-medium text-white/60 max-w-sm"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
          >
            Ashaiman&apos;s safest on-demand motorcycle network — verified riders, live GPS, zero stress.
          </p>
        </div>

        {/* ── Middle: spacer (pushes bottom section down) ────────────────── */}
        <div className="flex-1" />

        {/* ── Bottom: Feature pills + Swipe-up GO ────────────────────────── */}
        <div
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
          }}
        >
          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {['🗺️ Live GPS', '🔒 Verified Riders', '⚡ Instant Dispatch'].map((f) => (
              <span
                key={f}
                className="text-xs font-bold px-3.5 py-2 rounded-full"
                style={{
                  background: 'rgba(15,23,42,0.55)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.80)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* ── Swipe-up GO slider ─────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3">

            {/* SWIPE UP TO GO label */}
            <p
              className="text-xs font-black tracking-[0.2em] uppercase text-white/45"
              style={{
                opacity: triggered ? 0 : 1,
                transition: 'opacity 0.3s ease',
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}
            >
              SWIPE UP TO GO
            </p>

            {/* Slider track + thumb */}
            <div
              className="relative flex items-end justify-center"
              style={{ width: 72, height: SLIDER_HEIGHT }}
            >
              {/* Track background */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(15,23,42,0.50)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              />

              {/* Track fill (grows upward) */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-full"
                style={{
                  height: `${trackFill}px`,
                  background: 'linear-gradient(180deg, #FACC15 0%, #f5d90a 100%)',
                  transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                  opacity: 0.85,
                }}
              />

              {/* Thumb – Yellow GO button */}
              <div
                ref={sliderRef}
                id="welcome-go-slider"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="absolute bottom-2 left-1/2 w-14 h-14 flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing z-10 font-extrabold text-slate-950"
                style={{
                  marginLeft: -28,
                  transform: `translateY(${thumbTranslate}px) scale(${thumbScale})`,
                  transition: isDragging
                    ? 'transform 0s, box-shadow 0.15s ease'
                    : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease',
                  background: triggered
                    ? 'linear-gradient(135deg, #FACC15 0%, #ffe135 100%)'
                    : 'linear-gradient(135deg, #FACC15 0%, #f5d90a 100%)',
                  boxShadow: `0 0 0 ${Math.round(progress * 10)}px rgba(250,204,21,0.12),
                              0 6px 28px rgba(250,204,21,${glowOpacity.toFixed(2)})`,
                }}
              >
                {triggered ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="flex flex-col items-center leading-none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mb-0.5">
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                    <span className="text-[9px] font-black tracking-wider">GO</span>
                  </span>
                )}
              </div>

              {/* "GO" floating label above thumb */}
              <div
                className="absolute bottom-0 left-1/2 text-center pointer-events-none"
                style={{
                  transform: `translateX(-50%) translateY(${thumbTranslate - 70}px)`,
                  transition: isDragging
                    ? 'none'
                    : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                  opacity: triggered ? 0 : 1 - progress * 0.5,
                }}
              >
                <span
                  className="text-xs font-black tracking-widest"
                  style={{ color: '#FACC15', textShadow: '0 0 14px rgba(250,204,21,0.6)' }}
                >
                  GO
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
