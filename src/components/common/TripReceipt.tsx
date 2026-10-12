import React, { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle2, XCircle, Star, Package, Bike, Download, Share2 } from 'lucide-react';
import { TripOrder } from '../../types';

interface TripReceiptProps {
  trip: TripOrder;
  rating?: number;
  onClose: () => void;
}

export const TripReceipt: React.FC<TripReceiptProps> = ({ trip, rating, onClose }) => {
  const handleShare = async () => {
    const text = [
      `🛵 SafMove Trip Receipt`,
      `ID: ${trip.id}`,
      `From: ${trip.pickupLocation.name}`,
      `To: ${trip.dropoffLocation.name}`,
      `Distance: ${trip.distanceKm.toFixed(1)} km`,
      `Duration: ${trip.estDurationMinutes} min`,
      `Fare: GH₵ ${trip.fareGHS.toFixed(2)}`,
      `Payment: ${trip.paymentMethod === 'cash' ? 'Cash' : 'MoMo'}`,
      `Status: Completed ✓`,
      `Date: ${new Date(trip.createdAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'SafMove Receipt', text });
      } catch {
        // fallback
      }
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const statusColor = trip.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : trip.status === 'cancelled' ? 'text-rose-700 bg-rose-50 border-rose-200'
    : 'text-slate-700 bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bike className="w-5 h-5" />
              <span className="font-black text-sm">SafMove Receipt</span>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition text-xs font-bold">
              Close
            </button>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black">GH₵ {trip.fareGHS.toFixed(2)}</p>
            <p className="text-emerald-200 text-sm mt-1">{trip.paymentMethod === 'cash' ? 'Paid in Cash' : 'Paid via MoMo'}</p>
            {rating && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-emerald-500'}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          {/* Trip ID + Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-500 font-bold">{trip.id}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${statusColor}`}>
              {trip.status === 'completed' ? '✓ Completed' : trip.status}
            </span>
          </div>

          {/* Route */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black mt-0.5 flex-shrink-0">P</div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Pickup</p>
                <p className="text-sm font-bold text-slate-900">{trip.pickupLocation.name}</p>
                <p className="text-xs text-slate-500">{trip.pickupLocation.landmark}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black mt-0.5 flex-shrink-0">D</div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Drop-off</p>
                <p className="text-sm font-bold text-slate-900">{trip.dropoffLocation.name}</p>
                <p className="text-xs text-slate-500">{trip.dropoffLocation.landmark}</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Distance', value: `${trip.distanceKm.toFixed(1)} km` },
              { label: 'Duration', value: `${trip.estDurationMinutes} min` },
              { label: 'Service', value: trip.serviceType === 'parcel' ? 'Courier' : 'Passenger' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                <p className="text-sm font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] text-slate-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Driver */}
          {trip.driverName && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black">
                {trip.driverName[0]}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">Verified Rider</p>
                <p className="text-sm font-black text-slate-900">{trip.driverName}</p>
                <p className="text-xs text-slate-500 font-mono">{trip.driverModel} · {trip.driverPlate}</p>
              </div>
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-slate-400 text-center">
            {new Date(trip.createdAt).toLocaleString('en-GH', { dateStyle: 'full', timeStyle: 'short' })}
          </p>

          {/* Actions */}
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
