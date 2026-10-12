import React, { useState } from 'react';
import { ShieldAlert, Phone, Copy, Check, AlertTriangle, X, Loader2, Share2 } from 'lucide-react';
import { SafMoveAPI } from '../../lib/supabase';

export interface SOSEmergencyButtonProps {
  tripId?: string;
  passengerName?: string;
  passengerPhone?: string;
  driverName?: string;
  driverPlate?: string;
  driverModel?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  currentCoords?: { lat: number; lng: number };
  className?: string;
  onAlertTriggered?: () => void;
}

export const SOSEmergencyButton: React.FC<SOSEmergencyButtonProps> = ({
  tripId = 'TRIP-ACTIVE',
  passengerName = 'Daniel',
  passengerPhone = '+233 24 123 4567',
  driverName = 'SafMove Verified Rider',
  driverPlate = 'GR-24-4502',
  driverModel = 'Boxer 150',
  pickupAddress = 'Kwame Nkrumah Circle',
  dropoffAddress = 'East Legon – American House',
  currentCoords = { lat: 5.6037, lng: -0.1870 },
  className = '',
  onAlertTriggered,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate complete live tracking dispatch message
  const generateEmergencyText = () => {
    const timestamp = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const mapUrl = `https://www.google.com/maps?q=${currentCoords.lat.toFixed(5)},${currentCoords.lng.toFixed(5)}`;

    return `🚨 SAFMOVE EMERGENCY SAFETY ALERT 🚨
Time: ${timestamp}
Passenger: ${passengerName} (${passengerPhone})
Active Route: ${pickupAddress} ➔ ${dropoffAddress}
Live GPS Location: ${mapUrl}
Assigned Rider: ${driverName}
Vehicle: ${driverPlate} (${driverModel})
Trip Ref: ${tripId}

If unreachable, dispatch police or contact SafMove Accra Emergency: 191 / 112`;
  };

  const handleTriggerEmergency = async () => {
    setLoading(true);
    setErrorMsg(null);

    const trackingText = generateEmergencyText();

    // 1. Copy live tracking text to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(trackingText);
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }

    // 2. Trigger SOS alert in Supabase
    try {
      await SafMoveAPI.triggerSOS({
        tripId,
        triggeredBy: 'user',
        personName: passengerName,
        personPhone: passengerPhone,
        currentLocationName: `${pickupAddress} area (${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)})`,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
      });

      setAlertSent(true);
      if (onAlertTriggered) onAlertTriggered();
    } catch (err: any) {
      console.error('Failed to dispatch SOS alert:', err);
      setErrorMsg(err?.message || 'Emergency dispatch failed over network. Text has been copied to your clipboard!');
    } finally {
      setLoading(false);
    }
  };

  const copyOnlyText = async () => {
    try {
      await navigator.clipboard.writeText(generateEmergencyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* ── Floating SOS Button ────────────────────────────────────────── */}
      <div className={`relative ${className}`}>
        <button
          id="sos-emergency-trigger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Emergency SOS Alert"
          className="group relative flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-600/40 transition-all duration-200 active:scale-95 cursor-pointer border border-rose-400/30"
        >
          {/* Pulsating emergency glow ring */}
          <span className="absolute -inset-1 rounded-2xl bg-rose-500 opacity-40 animate-ping pointer-events-none" />

          <ShieldAlert className="w-4 h-4 text-white animate-pulse" strokeWidth={2.5} />
          <span className="tracking-wider">SOS</span>
        </button>
      </div>

      {/* ── Emergency Modal / Alert State ─────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-6 text-white shadow-2xl shadow-rose-950/60 overflow-hidden">
            {/* Top red warning ribbon */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Emergency Safety Assist
                </h3>
                <p className="text-xs text-rose-300 font-semibold">
                  Accra Rapid Dispatch &amp; Police Hotline
                </p>
              </div>
            </div>

            {/* Information Notice */}
            <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-slate-800/60 p-3 rounded-2xl border border-white/5">
              Pressing the emergency alert immediately notifies SafMove Dispatch, logs your GPS coordinates, and copies complete live tracking details so you can instantly share to WhatsApp or emergency services.
            </p>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Alert Sent Success Banner */}
            {alertSent && (
              <div className="mb-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>SOS Dispatch Signal Active!</strong> Monitoring team has been notified.
                </span>
              </div>
            )}

            {/* Clipboard Status Banner */}
            {copied && (
              <div className="mb-4 bg-amber-950/80 border border-amber-500/50 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Live tracking text copied to clipboard! Paste directly into WhatsApp or SMS.</span>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="space-y-3">
              {/* Trigger & Copy Button */}
              <button
                id="sos-confirm-trigger-btn"
                onClick={handleTriggerEmergency}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/40 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Dispatching Emergency Alert...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5" />
                    <span>{alertSent ? 'Re-Trigger Emergency Alert' : 'Trigger SOS Alert & Copy Tracking'}</span>
                  </>
                )}
              </button>

              {/* Copy Tracking Text Only */}
              <button
                onClick={copyOnlyText}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-white/10"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Live Tracking Link Only'}</span>
              </button>

              {/* Direct Emergency Calls */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href="tel:191"
                  className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition text-center"
                >
                  <Phone className="w-3.5 h-3.5 text-rose-400" />
                  <span>Police (191)</span>
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(generateEmergencyText())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp SOS</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSEmergencyButton;
