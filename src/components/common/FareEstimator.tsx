import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Zap, ChevronRight, Bike, Package } from 'lucide-react';
import { AccraLocation, ServiceType } from '../../types';
import { calculateDistanceKm } from '../../lib/accraData';

interface FareEstimatorProps {
  pickup: AccraLocation;
  dropoff: AccraLocation;
  serviceType: ServiceType;
}

interface FareTier {
  label: string;
  multiplier: number;
  icon: React.ReactNode;
  description: string;
  eta: string;
}

export const FareEstimator: React.FC<FareEstimatorProps> = ({ pickup, dropoff, serviceType }) => {
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  const estDurationMinutes = Math.max(5, Math.round(distanceKm * 2.8));

  // Base fare: GH₵ 5.00 base + GH₵ 2.50/km
  const BASE_FARE = 5.0;
  const RATE_PER_KM = 2.5;
  const baseFare = BASE_FARE + distanceKm * RATE_PER_KM;

  // Check if surge pricing applies (e.g., peak hours 7-9am, 5-8pm)
  const hour = new Date().getHours();
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
  const surgeMultiplier = isPeakHour ? 1.3 : 1.0;

  const tiers: FareTier[] = [
    {
      label: 'Economy',
      multiplier: 1.0,
      icon: <Bike className="w-4 h-4" />,
      description: 'Standard verified rider',
      eta: `${estDurationMinutes}–${estDurationMinutes + 5} min`,
    },
    {
      label: 'Express',
      multiplier: 1.4,
      icon: <Zap className="w-4 h-4" />,
      description: 'Priority dispatch · Fastest',
      eta: `${Math.max(3, estDurationMinutes - 5)}–${estDurationMinutes} min`,
    },
    {
      label: 'Courier',
      multiplier: serviceType === 'parcel' ? 1.2 : 1.6,
      icon: <Package className="w-4 h-4" />,
      description: 'Parcel with delivery receipt',
      eta: `${estDurationMinutes}–${estDurationMinutes + 10} min`,
    },
  ];

  const formatGHS = (amount: number) => `GH₵ ${amount.toFixed(2)}`;

  return (
    <div className="space-y-3">
      {/* Route Summary */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
            <span className="font-bold text-slate-900 truncate">{pickup.name}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-slate-900 flex-shrink-0" />
            <span className="font-bold text-slate-900 truncate">{dropoff.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-slate-200">
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-emerald-600" />
            {distanceKm.toFixed(1)} km
          </span>
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-600" />
            ~{estDurationMinutes} min
          </span>
          {isPeakHour && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              ⚡ Peak Hour
            </span>
          )}
        </div>
      </div>

      {/* Fare Tiers */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Fare Estimate</p>
        {tiers.map((tier) => {
          const fare = baseFare * tier.multiplier * surgeMultiplier;
          return (
            <div
              key={tier.label}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-700 group-hover:text-white transition">
                  {tier.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{tier.label}</p>
                  <p className="text-[11px] text-slate-500">{tier.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-slate-900">{formatGHS(fare)}</p>
                <p className="text-[11px] text-slate-500">{tier.eta}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 text-center px-2">
        Fare is paid in cash or Mobile Money (MoMo) on arrival · No hidden charges
      </p>
    </div>
  );
};
