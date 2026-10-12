import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MoMoPaymentProps {
  amount: number;
  rideId: string;
  passengerPhone: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

type MoMoNetwork = 'mtn' | 'vodafone' | 'airteltigo';

const NETWORK_LABELS: Record<MoMoNetwork, string> = {
  mtn: 'MTN Mobile Money',
  vodafone: 'Vodafone Cash',
  airteltigo: 'AirtelTigo Money',
};

const NETWORK_COLORS: Record<MoMoNetwork, string> = {
  mtn: 'bg-yellow-500',
  vodafone: 'bg-red-600',
  airteltigo: 'bg-red-800',
};

const NETWORK_PREFIX: Record<MoMoNetwork, string[]> = {
  mtn: ['024', '054', '055', '059'],
  vodafone: ['020', '050'],
  airteltigo: ['026', '056', '027', '057'],
};

function detectNetwork(phone: string): MoMoNetwork | null {
  const digits = phone.replace(/\D/g, '');
  const prefix = digits.startsWith('233') ? '0' + digits.slice(3, 5) : digits.slice(0, 3);
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIX)) {
    if (prefixes.some((p) => prefix.startsWith(p.slice(1)))) {
      return network as MoMoNetwork;
    }
  }
  return null;
}

export const MoMoPaymentModal: React.FC<MoMoPaymentProps> = ({
  amount,
  rideId,
  passengerPhone,
  onSuccess,
  onCancel,
}) => {
  const [phone, setPhone] = useState(passengerPhone.replace(/\D/g, '').replace(/^233/, '0'));
  const [network, setNetwork] = useState<MoMoNetwork | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState<'enter' | 'confirm' | 'processing' | 'success' | 'error'>('enter');
  const [errorMsg, setErrorMsg] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    setNetwork(detectNetwork(phone));
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'enter') {
      if (phone.length < 10) {
        setErrorMsg('Enter a valid 10-digit Ghana phone number');
        return;
      }
      setErrorMsg('');
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (pin.length < 4) {
        setErrorMsg('Enter your 4-digit MoMo PIN');
        return;
      }
      setErrorMsg('');
      setStep('processing');

      // Simulate MoMo processing (replace with real Paystack/Hubtel API call)
      setTimeout(async () => {
        try {
          const ref = `SAFMOVE-MOMO-${Date.now().toString(36).toUpperCase()}`;
          setReference(ref);

          // Record payment in Supabase rides table
          if (supabase) {
            await supabase
              .from('rides')
              .update({
                payment_method: 'momo',
                payment_status: 'paid_momo',
                payment_reference: ref,
                updated_at: new Date().toISOString(),
              })
              .eq('id', rideId);
          }

          setStep('success');
          setTimeout(() => onSuccess(ref), 2000);
        } catch {
          setStep('error');
          setErrorMsg('Payment failed. Please try again or pay cash.');
        }
      }, 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              <span className="font-black text-sm">Mobile Money (MoMo)</span>
            </div>
            <button onClick={onCancel} className="text-white/70 hover:text-white text-xs font-bold transition">
              Cancel
            </button>
          </div>
          <div className="mt-3">
            <p className="text-emerald-200 text-xs">Amount to pay</p>
            <p className="text-3xl font-black">GH₵ {amount.toFixed(2)}</p>
            <p className="text-emerald-200 text-xs mt-1">Ride ID: {rideId.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {step === 'processing' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-7 h-7 text-emerald-700 animate-spin" />
              </div>
              <div>
                <p className="font-black text-slate-900">Processing Payment...</p>
                <p className="text-xs text-slate-500 mt-1">Check your phone for a MoMo prompt</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-lg">Payment Successful!</p>
                <p className="text-xs text-slate-500 mt-1">Ref: {reference}</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-rose-700" />
              </div>
              <p className="font-bold text-slate-900">{errorMsg}</p>
              <button onClick={() => setStep('enter')} className="text-sm text-emerald-700 font-bold hover:underline">
                Try Again
              </button>
            </div>
          )}

          {(step === 'enter' || step === 'confirm') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Network Badge */}
              {network && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className={`w-3 h-3 rounded-full ${NETWORK_COLORS[network]}`} />
                  <span className="text-sm font-bold text-slate-900">{NETWORK_LABELS[network]}</span>
                  <span className="text-xs text-slate-500 ml-auto">Auto-detected</span>
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">MoMo Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">+233</span>
                  <input
                    type="tel"
                    value={phone.startsWith('0') ? phone.slice(1) : phone}
                    onChange={(e) => setPhone('0' + e.target.value.replace(/\D/g, ''))}
                    placeholder="24 000 0000"
                    maxLength={9}
                    disabled={step === 'confirm'}
                    className="w-full pl-14 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:outline-none text-sm font-mono disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* PIN field — only shown on confirm step */}
              {step === 'confirm' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> MoMo PIN (4 digits)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      maxLength={4}
                      inputMode="numeric"
                      autoFocus
                      className="w-full pr-12 pl-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:outline-none text-sm font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Your PIN is never stored. This goes directly to your network.
                  </p>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-rose-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25"
              >
                {step === 'enter' ? (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Confirm Payment · GH₵ {amount.toFixed(2)}</>
                )}
              </button>

              {step === 'confirm' && (
                <button
                  type="button"
                  onClick={() => setStep('enter')}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-900 font-bold transition"
                >
                  ← Change number
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
