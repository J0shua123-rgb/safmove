import React, { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, Bike, Phone, Shield, ChevronRight } from 'lucide-react';
import { TripOrder } from '../../types';

interface DriverETAProps {
  trip: TripOrder;
  onCallDriver?: () => void;
}

export const DriverETATracker: React.FC<DriverETAProps> = ({ trip, onCallDriver }) => {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    // Estimate ETA based on distance from driver to pickup (approx 2min/km at 30km/h city speed)
    return Math.max(30, trip.estDurationMinutes * 60 * 0.4); // ~40% of trip duration as arrival time
  });
  const [arrived, setArrived] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (trip.status === 'accepted') {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setArrived(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trip.status]);

  // Reset if trip status progresses
  useEffect(() => {
    if (trip.status === 'in_progress') {
      setArrived(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [trip.status]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const progressPercent = arrived
    ? 100
    : Math.round(((trip.estDurationMinutes * 60 * 0.4 - secondsLeft) / (trip.estDurationMinutes * 60 * 0.4)) * 100);

  return (
    <div className="space-y-3">
      {/* ETA Countdown Ring */}
      <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="15.9"
              fill="none" stroke="#d1fae5" strokeWidth="3"
            />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none" stroke="#059669" strokeWidth="3"
              strokeDasharray={`${progressPercent} ${100 - progressPercent}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bike className={`w-6 h-6 text-emerald-700 ${!arrived ? 'animate-bounce' : ''}`} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {arrived ? (
            <>
              <p className="font-black text-emerald-800 text-sm">Rider Has Arrived!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Look for your rider at the pickup point</p>
            </>
          ) : (
            <>
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Rider arriving in</p>
              <p className="font-black text-2xl text-emerald-900 tabular-nums">
                {minutes}:{String(seconds).padStart(2, '0')}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {trip.driverName || 'SafMove Rider'} is on the way
              </p>
            </>
          )}
        </div>
      </div>

      {/* Driver Card */}
      {trip.driverName && (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg flex-shrink-0">
              {trip.driverName[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-black text-sm text-slate-900">{trip.driverName}</p>
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 font-mono">{trip.driverModel} · {trip.driverPlate}</p>
              {trip.driverPhone && (
                <p className="text-xs text-slate-500">{trip.driverPhone}</p>
              )}
            </div>
          </div>

          {onCallDriver && trip.driverPhone && (
            <a
              href={`tel:${trip.driverPhone}`}
              className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition flex-shrink-0"
              title="Call rider"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Safety PIN */}
      <div className="flex items-center gap-3 p-3.5 bg-slate-900 rounded-2xl">
        <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-bold">Safety PIN — Confirm with your rider</p>
          <p className="text-lg font-black text-white font-mono tracking-widest">
            {trip.id.replace(/\D/g, '').slice(-4).padStart(4, '8')}
          </p>
        </div>
        <div className="text-[10px] text-slate-500 text-right max-w-[80px]">
          Never share this PIN before boarding
        </div>
      </div>

      {/* Pickup Location */}
      <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
        <MapPin className="w-4 h-4 text-emerald-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Your Pickup</p>
          <p className="text-sm font-bold text-slate-900 truncate">{trip.pickupLocation.name}</p>
          <p className="text-xs text-slate-500 truncate">{trip.pickupLocation.landmark}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </div>
    </div>
  );
};
