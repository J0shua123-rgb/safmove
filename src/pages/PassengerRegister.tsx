import React, { useState } from 'react';
import { supabase, saveLocalPassengerProfile } from '../lib/supabase';
import { UserProfile } from '../types';
import { PassengerAvatar } from './PassengerAvatar';

// ─── Props ────────────────────────────────────────────────────────────────────
interface PassengerRegisterProps {
  onRegistered: (profile: UserProfile) => void;
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatPhone = (raw: string): string => {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, '');

  // Handle double-prefix: if the UI already shows "+233" and the user types
  // "0557448975", the combined value may arrive as "2330557448975".
  // Also normalise local "0XX" prefixes to international form.
  if (digits.startsWith('2330')) {
    digits = '233' + digits.slice(4);       // 2330XXXXXXXXX → 233XXXXXXXXX
  } else if (digits.startsWith('0')) {
    digits = '233' + digits.slice(1);       // 0XXXXXXXXX → 233XXXXXXXXX
  } else if (!digits.startsWith('233') && digits.length > 0) {
    digits = '233' + digits;                // bare XXXXXXXXX → 233XXXXXXXXX
  }

  // E.164: "+" followed by country code + subscriber number
  return digits.length > 0 ? `+${digits}` : raw;
};

// ─── Shared field component ───────────────────────────────────────────────────
interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  type?: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: React.ReactNode;
  required?: boolean;
  autoComplete?: string;
}
const Field: React.FC<FieldProps> = ({
  id, label, hint, type = 'text', value, placeholder,
  onChange, prefix, suffix, required, autoComplete = 'off',
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-white/60 mb-1.5 tracking-wide uppercase">
        {label}
        {required && <span style={{ color: '#FACC15' }}> *</span>}
      </label>
      <div
        className="flex items-center rounded-2xl overflow-hidden transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: focused ? '1.5px solid #FACC15' : '1.5px solid rgba(255,255,255,0.10)',
          boxShadow: focused ? '0 0 0 3px rgba(250,204,21,0.12)' : 'none',
        }}
      >
        {prefix && (
          <span
            className="pl-4 pr-2 text-sm font-bold shrink-0"
            style={{ color: focused ? '#FACC15' : 'rgba(255,255,255,0.4)' }}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        />
        {suffix && <span className="pr-3 shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-white/35 leading-relaxed">{hint}</p>}
    </div>
  );
};

// ─── Step progress indicator ──────────────────────────────────────────────────
const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="transition-all duration-300 rounded-full"
        style={{
          width: i === current ? 24 : 8,
          height: 8,
          background: i === current
            ? '#FACC15'
            : i < current
              ? 'rgba(250,204,21,0.40)'
              : 'rgba(255,255,255,0.12)',
        }}
      />
    ))}
    <span className="ml-1 text-[11px] text-white/35 font-semibold">
      Step {current + 1} of {total}
    </span>
  </div>
);

// ─── Spinner icon ─────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#111827" strokeWidth="4" />
    <path className="opacity-75" fill="#111827" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
  </svg>
);

// ─── Arrow icon ───────────────────────────────────────────────────────────────
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// ─── Eye / Eye-off icon ───────────────────────────────────────────────────────
const EyeIcon: React.FC<{ visible: boolean; onToggle: () => void }> = ({ visible, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
    style={{ color: 'rgba(255,255,255,0.35)' }}
    tabIndex={-1}
    aria-label={visible ? 'Hide password' : 'Show password'}
  >
    {visible ? (
      /* eye-off */
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      /* eye */
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )}
  </button>
);

// ─── Error banner ─────────────────────────────────────────────────────────────
const ErrorBanner: React.FC<{ msg: string }> = ({ msg }) => (
  <div
    className="flex items-start gap-2 rounded-2xl px-4 py-3"
    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}
  >
    <span className="text-base leading-none mt-0.5">⚠️</span>
    <p className="text-xs text-red-300 leading-relaxed">{msg}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
type AppStep = 'profile' | 'otp' | 'credentials' | 'avatar';

export const PassengerRegister: React.FC<PassengerRegisterProps> = ({ onRegistered, onBack }) => {

  // ── Step 1 state ─────────────────────────────────────────────────────────
  const [fullName,  setFullName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');
  const [emergency, setEmergency] = useState('');

  // ── OTP state ────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState('');

  // ── Step 2 state ─────────────────────────────────────────────────────────
  const [username,        setUsername]        = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<AppStep>('profile');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [exiting, setExiting] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const stepIndex = step === 'profile' ? 0 : step === 'otp' ? 0 : 1;

  // ── Completed profile after Step 2 (passed to Step 3) ────────────────────
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);

  const buildProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: `pax_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: username.trim().replace(/^@/, '') ||
              fullName.toLowerCase().replace(/\s+/g, '_').slice(0, 20) ||
              'safmove_user',
    fullName:  fullName.trim(),
    phone:     formatPhone(phone),
    email:     email.trim() || undefined,
    role:      'user',
    trustedContactName:  emergency.split('/')[0]?.trim() || '',
    trustedContactPhone: formatPhone(emergency.split('/')[1]?.trim() || ''),
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  const exit = (profile: UserProfile) => {
    setExiting(true);
    setTimeout(() => onRegistered(profile), 380);
  };

  const handleBack = () => {
    setError('');
    if (step === 'otp')         { setStep('profile'); setOtp(''); return; }
    if (step === 'credentials') { setStep('otp');     return; }
    if (step === 'avatar')      { setStep('credentials'); return; }
    onBack();
  };

  // ── Step 1 submit: validate → OTP or skip straight to credentials ─────────
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim())  { setError('Please enter your full name.');    return; }
    if (!phone.trim())     { setError('Please enter your phone number.'); return; }

    const formattedPhone = formatPhone(phone);
    setLoading(true);

    try {
      if (supabase) {
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
        if (otpError) throw otpError;
        setStep('otp');
      } else {
        // No Supabase — skip OTP, go straight to credentials
        setStep('credentials');
      }
    } catch (err: any) {
      const msg: string = err?.message || '';
      const msgLower = msg.toLowerCase();
      // Graceful bypass: if SMS/phone provider is not configured in this
      // environment, skip OTP entirely and proceed to credentials.
      const isProviderMissing =
        msgLower.includes('phone provider')   ||
        msgLower.includes('not enabled')      ||
        msgLower.includes('twilio')           ||
        msgLower.includes('not configured')   ||
        msgLower.includes('unsupported')      ||
        msgLower.includes('sms provider');
      if (isProviderMissing) {
        setStep('credentials');
      } else {
        setError(msg || 'Could not send verification code. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP submit: verify → credentials ─────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the 6-digit code.'); return; }

    setLoading(true);
    try {
      if (supabase) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: formatPhone(phone),
          token: otp.trim(),
          type: 'sms',
        });
        if (verifyError) throw verifyError;
      }
      setStep('credentials');
    } catch (err: any) {
      setError(err?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 submit: set credentials & complete registration ────────────────
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('Please choose a username.');      return; }
    if (username.replace(/^@/, '').length < 3) {
      setError('Username must be at least 3 characters.');              return;
    }
    if (!password)        { setError('Please create a password.');      return; }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');              return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');                              return;
    }

    setLoading(true);
    try {
      const profile = buildProfile();

      if (supabase) {
        // Update the OTP-authenticated user with email+password if email provided
        if (email.trim()) {
          try {
            await supabase.auth.updateUser({
              email:    email.trim(),
              password: password,
              data: {
                full_name:         fullName.trim(),
                username:          profile.username,
                phone:             formatPhone(phone),
                role:              'passenger',
                emergency_contact: emergency.trim(),
              },
            });
          } catch {
            // non-fatal — profile still saved locally
          }
        } else {
          // No email — just update metadata
          try {
            await supabase.auth.updateUser({
              data: {
                full_name:         fullName.trim(),
                username:          profile.username,
                phone:             formatPhone(phone),
                role:              'passenger',
                emergency_contact: emergency.trim(),
              },
            });
          } catch {
            // non-fatal
          }
        }
      }

      saveLocalPassengerProfile(profile);
      // Transition to Step 3 — avatar upload — instead of finishing
      setPendingProfile(profile);
      setStep('avatar');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sub-components (CtaButton, BackButton, Screen, Badge) are declared
  // OUTSIDE this function — see below the component. Declaring them here
  // would cause React to recreate them on every re-render, unmounting
  // inputs and losing focus on each keystroke.

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3 — Avatar Upload (rendered by PassengerAvatar)
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'avatar') {
    return (
      <PassengerAvatar
        profile={pendingProfile ?? undefined}
        onComplete={(updatedProfile) => exit(updatedProfile)}
        onSkip={(updatedProfile) => exit(updatedProfile)}
        onBack={handleBack}
      />
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1 — Profile Info
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'profile') {
    return (
      <RegScreen exiting={exiting}>
        <div>
          {/* Header */}
          <div style={{ animation: 'pr-fade-down 0.5s ease both' }}>
            <RegBackButton onBack={handleBack} />
            <div className="inline-flex items-center mb-4">
              <RegBadge label="SafMove · Passenger" />
            </div>
            <StepDots current={0} total={3} />
            <h1 className="text-2xl font-black text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
              Create Your<br />
              <span style={{ color: '#FACC15' }}>Passenger Account</span>
            </h1>
            <p className="mt-2 text-sm text-white/45">Quick setup — ride across Accra in seconds</p>
          </div>

          {/* Form */}
          <form
            id="passenger-step1-form"
            onSubmit={handleProfileSubmit}
            className="flex flex-col gap-4 mt-6"
            style={{ animation: 'pr-fade-up 0.5s 0.1s ease both' }}
            noValidate
          >
            <Field
              id="pr-fullname"
              label="Full Name"
              placeholder="e.g. Kwame Mensah"
              value={fullName}
              onChange={setFullName}
              required
              autoComplete="name"
            />

            <Field
              id="pr-phone"
              label="Phone Number"
              hint="Ghana format: 024 XXX XXXX or +233 24 XXX XXXX"
              type="tel"
              placeholder="024 000 0000"
              value={phone}
              prefix="+233"
              onChange={setPhone}
              required
              autoComplete="tel"
            />

            <Field
              id="pr-email"
              label="Email Address (optional)"
              hint="For ride receipts and account recovery"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />

            <Field
              id="pr-emergency"
              label="Emergency Contact"
              hint="SOS Safety — format: Name / +233 XX XXX XXXX"
              placeholder="e.g. Abena Asante / 054 000 0000"
              value={emergency}
              onChange={setEmergency}
            />

            {/* SOS note */}
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3 mt-1"
              style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.20)' }}
            >
              <span className="text-lg leading-none mt-0.5">🛡️</span>
              <p className="text-xs text-white/55 leading-relaxed">
                Your emergency contact will be alerted with your live GPS location if you trigger the SOS button during a ride.
              </p>
            </div>

            {error && <ErrorBanner msg={error} />}

            <RegCtaButton loading={loading} label="Register & Continue" loadingLabel="Sending code…" />

            {/* Sign-in hint */}
            <p className="text-center text-[11px] text-white/25 pb-2">
              Already registered?{' '}
              <button
                type="button"
                id="passenger-register-signin-hint"
                className="underline underline-offset-2 hover:text-white/50 transition-colors"
                onClick={() => {
                  const stored = localStorage.getItem('safmove_passenger_profile_v2');
                  if (stored) {
                    try { exit(JSON.parse(stored)); return; } catch { /* fall through */ }
                  }
                  exit(buildProfile());
                }}
              >
                Sign in
              </button>
            </p>
          </form>
        </div>
        <div />
      </RegScreen>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // OTP VERIFICATION (between step 1 and step 2)
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'otp') {
    return (
      <RegScreen exiting={exiting}>
        <div>
          <div style={{ animation: 'pr-fade-down 0.5s ease both' }}>
            <RegBackButton onBack={handleBack} />
            <div className="inline-flex items-center mb-4">
              <RegBadge label="SafMove · Verify" />
            </div>
            <StepDots current={0} total={3} />
            <h1 className="text-2xl font-black text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
              Verify Your<br />
              <span style={{ color: '#FACC15' }}>Phone Number</span>
            </h1>
            <p className="mt-2 text-sm text-white/45">We sent a 6-digit code to your number</p>
          </div>

          <form
            id="passenger-otp-form"
            onSubmit={handleOtpSubmit}
            className="flex flex-col gap-4 mt-6"
            style={{ animation: 'pr-fade-up 0.5s 0.1s ease both' }}
            noValidate
          >
            {/* Info banner */}
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)' }}
            >
              <span className="text-lg leading-none mt-0.5">📱</span>
              <p className="text-xs text-white/60 leading-relaxed">
                We sent a 6-digit code to{' '}
                <strong className="text-white">{formatPhone(phone)}</strong>.
                Enter it below to verify your number.
              </p>
            </div>

            <Field
              id="pr-otp"
              label="Verification Code"
              type="tel"
              placeholder="_ _ _ _ _ _"
              value={otp}
              onChange={setOtp}
              required
            />

            {error && <ErrorBanner msg={error} />}

            <RegCtaButton loading={loading} label="Verify & Continue" loadingLabel="Verifying…" />

            <button
              type="button"
              onClick={() => { setStep('profile'); setOtp(''); setError(''); }}
              className="mt-1 text-xs text-white/35 hover:text-white/60 underline underline-offset-2 transition-colors text-center"
            >
              ← Change phone number
            </button>
          </form>
        </div>
        <div />
      </RegScreen>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2 — Credentials (username + password)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <RegScreen exiting={exiting}>
      <div>
        <div style={{ animation: 'pr-fade-down 0.5s ease both' }}>
          <RegBackButton onBack={handleBack} />
          <div className="inline-flex items-center mb-4">
            <RegBadge label="SafMove · Security Setup" />
          </div>
          <StepDots current={1} total={3} />
          <h1 className="text-2xl font-black text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
            Set Up<br />
            <span style={{ color: '#FACC15' }}>Credentials</span>
          </h1>
          <p className="mt-2 text-sm text-white/45">Choose a unique username &amp; secure password</p>
        </div>

        <form
          id="passenger-credentials-form"
          onSubmit={handleCredentialsSubmit}
          className="flex flex-col gap-4 mt-6"
          style={{ animation: 'pr-fade-up 0.5s 0.1s ease both' }}
          noValidate
        >
          {/* Username */}
          <Field
            id="pr-username"
            label="Username"
            hint="Min 3 characters — letters, numbers, underscores only"
            placeholder="@kwamemensah"
            prefix="@"
            value={username.replace(/^@/, '')}
            onChange={(v) => setUsername(v.replace(/^@/, ''))}
            required
            autoComplete="username"
          />

          {/* Password */}
          <div>
            <label htmlFor="pr-password" className="block text-xs font-bold text-white/60 mb-1.5 tracking-wide uppercase">
              Password <span style={{ color: '#FACC15' }}>*</span>
            </label>
            <div
              className="flex items-center rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.10)',
              }}
            >
              <input
                id="pr-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                placeholder="Min 6 characters"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="flex-1 bg-transparent px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none"
                style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
              />
              <EyeIcon visible={showPw} onToggle={() => setShowPw(p => !p)} />
            </div>
            {password && (
              <PasswordStrength password={password} />
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="pr-confirm-password" className="block text-xs font-bold text-white/60 mb-1.5 tracking-wide uppercase">
              Confirm Password <span style={{ color: '#FACC15' }}>*</span>
            </label>
            <div
              className="flex items-center rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: confirmPassword && confirmPassword !== password
                  ? '1.5px solid rgba(239,68,68,0.50)'
                  : confirmPassword && confirmPassword === password
                    ? '1.5px solid rgba(34,197,94,0.50)'
                    : '1.5px solid rgba(255,255,255,0.10)',
                boxShadow: confirmPassword && confirmPassword === password
                  ? '0 0 0 3px rgba(34,197,94,0.08)'
                  : 'none',
              }}
            >
              <input
                id="pr-confirm-password"
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                placeholder="Re-enter your password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="flex-1 bg-transparent px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none"
                style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
              />
              <EyeIcon visible={showConfirmPw} onToggle={() => setShowConfirmPw(p => !p)} />
            </div>
            {confirmPassword && confirmPassword === password && (
              <p className="mt-1 text-[11px]" style={{ color: 'rgba(34,197,94,0.80)' }}>✓ Passwords match</p>
            )}
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-[11px]" style={{ color: 'rgba(239,68,68,0.80)' }}>✗ Passwords do not match</p>
            )}
          </div>

          {/* Profile summary card */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-1"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
              style={{ background: '#FACC15', color: '#111827' }}
            >
              {fullName.trim().charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{fullName.trim() || 'Your Name'}</p>
              <p className="text-xs text-white/40 truncate">{formatPhone(phone)}</p>
            </div>
            <div
              className="ml-auto text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'rgba(250,204,21,0.15)', color: '#FACC15' }}
            >
              STEP 1 ✓
            </div>
          </div>

          {error && <ErrorBanner msg={error} />}

          <RegCtaButton loading={loading} label="Complete Account Setup" loadingLabel="Setting up…" />

          <p className="text-center text-[11px] text-white/25 pb-2">
            Your credentials are encrypted and stored securely.
          </p>
        </form>
      </div>
      <div />
    </RegScreen>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components — declared OUTSIDE PassengerRegister to prevent React from
// unmounting / remounting them (and their child inputs) on every state change.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Screen wrapper ───────────────────────────────────────────────────────────
const RegScreen: React.FC<{ exiting: boolean; children: React.ReactNode }> = ({ exiting, children }) => (
  <div
    id="passenger-register-screen"
    className="min-h-screen flex flex-col select-none"
    style={{
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      background: 'linear-gradient(160deg, #0a0e1a 0%, #111827 55%, #0f172a 100%)',
      opacity:   exiting ? 0 : 1,
      transform: exiting ? 'translateY(-20px) scale(0.98)' : 'translateY(0) scale(1)',
      transition: exiting ? 'opacity 0.38s ease, transform 0.38s ease' : 'none',
    }}
  >
    <div className="max-w-md mx-auto w-full min-h-screen flex flex-col justify-between p-6">
      {children}
    </div>
    <style>{`
      @keyframes pr-fade-down {
        from { opacity: 0; transform: translateY(-18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pr-fade-up {
        from { opacity: 0; transform: translateY(22px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);

// ─── Back button ──────────────────────────────────────────────────────────────
const RegBackButton: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <button
    type="button"
    onClick={onBack}
    className="flex items-center gap-2 mt-8 mb-6 text-sm font-semibold text-white/50 hover:text-white transition-colors"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
    Back
  </button>
);

// ─── Yellow CTA button ────────────────────────────────────────────────────────
const RegCtaButton: React.FC<{ loading: boolean; label: string; loadingLabel: string }> = ({ loading, label, loadingLabel }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] mt-2"
    style={{
      background: loading
        ? 'rgba(250,204,21,0.45)'
        : 'linear-gradient(135deg, #FACC15 0%, #f5b800 100%)',
      color: '#111827',
      boxShadow: loading ? 'none' : '0 8px 32px rgba(250,204,21,0.40)',
      cursor: loading ? 'not-allowed' : 'pointer',
    }}
  >
    {loading ? (<><Spinner /><span>{loadingLabel}</span></>) : (<><span>{label}</span><Arrow /></>)}
  </button>
);

// ─── Badge pill ───────────────────────────────────────────────────────────────
const RegBadge: React.FC<{ label: string }> = ({ label }) => (
  <span
    className="text-[11px] font-black tracking-[0.18em] uppercase px-3 py-1 rounded-full"
    style={{
      background: 'rgba(250,204,21,0.12)',
      border: '1px solid rgba(250,204,21,0.35)',
      color: '#FACC15',
    }}
  >
    {label}
  </span>
);

// ─── Password strength indicator ──────────────────────────────────────────────
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ['Weak', 'Fair', 'Good', 'Strong'][score - 1] || 'Weak';
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const color  = colors[score - 1] || '#ef4444';

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? color : 'rgba(255,255,255,0.10)' }}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px]" style={{ color }}>
        Password strength: <strong>{label}</strong>
      </p>
    </div>
  );
};

export default PassengerRegister;
