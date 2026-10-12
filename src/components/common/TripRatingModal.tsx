import React, { useState, useEffect } from 'react';
import { Star, X, ThumbsUp, MessageSquare, CheckCircle2, Bike } from 'lucide-react';
import { TripOrder } from '../../types';

interface TripRatingModalProps {
  trip: TripOrder;
  onSubmit: (rating: number, comment: string) => void;
  onDismiss: () => void;
}

export const TripRatingModal: React.FC<TripRatingModalProps> = ({ trip, onSubmit, onDismiss }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const POSITIVE_TAGS = ['Safe ride', 'On time', 'Clean bike', 'Friendly rider', 'Smooth route'];
  const NEGATIVE_TAGS = ['Late arrival', 'Rough ride', 'Wrong route', 'Unhelpful'];
  const tags = rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;

  const handleSubmit = async () => {
    if (rating === 0) return;
    const fullComment = [comment.trim(), ...selectedTags.map((t) => `#${t.replace(/\s/g, '')}`)].filter(Boolean).join(' ');
    setSubmitted(true);
    setTimeout(() => {
      onSubmit(rating, fullComment);
    }, 1500);
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Thanks for your feedback!</h3>
            <p className="text-sm text-slate-600">Your rating helps keep our riders accountable and safe.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-900">Rate Your Ride</h3>
                <button onClick={onDismiss} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Driver info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg">
                  {(trip.driverName || 'D')[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{trip.driverName || 'SafMove Rider'}</p>
                  <p className="text-xs text-slate-600 font-mono">{trip.driverModel} · {trip.driverPlate}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{trip.pickupLocation.name} → {trip.dropoffLocation.name}</p>
                </div>
              </div>
            </div>

            {/* Star Rating */}
            <div className="p-6 space-y-5">
              <div className="text-center space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">How was your experience?</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(hoverRating || rating) > 0 && (
                  <p className={`text-sm font-bold ${rating >= 4 ? 'text-emerald-700' : rating >= 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {ratingLabels[hoverRating || rating]}
                  </p>
                )}
              </div>

              {/* Quick tags */}
              {rating > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600">Quick feedback:</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                          selectedTags.includes(tag)
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment */}
              {rating > 0 && (
                <div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a note for the rider (optional)..."
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none resize-none bg-slate-50"
                    maxLength={200}
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-500 text-white font-black text-sm transition flex items-center justify-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Submit Rating
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
