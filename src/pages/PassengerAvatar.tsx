import React, { useState, useRef } from 'react';
import { Camera, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase, saveLocalPassengerProfile, getLocalPassengerProfile } from '../lib/supabase';
import { UserProfile } from '../types';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PassengerAvatarProps {
  profile?: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onSkip: (profile: UserProfile) => void;
  onBack?: () => void;
}

export const PassengerAvatar: React.FC<PassengerAvatarProps> = ({
  profile,
  onComplete,
  onSkip,
  onBack,
}) => {
  const currentProfile = profile || getLocalPassengerProfile() || {
    id: `pax_${Date.now()}`,
    username: 'safmove_user',
    fullName: 'Passenger',
    phone: '',
    role: 'user' as const,
    createdAt: new Date().toISOString(),
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentProfile.avatarUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [exiting, setExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default fallback avatar with Accra SafMove yellow brand
  const getDefaultAvatar = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'SafMove Rider')}&background=FACC15&color=111827&bold=true&size=256`;

  // File selection & instant local preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Please select an image smaller than 5MB.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar to Supabase Storage with local base64/URL fallback
  const handleFinish = async () => {
    setError('');
    setUploading(true);

    try {
      let finalAvatarUrl = previewUrl || getDefaultAvatar(currentProfile.fullName);

      // Attempt Supabase storage upload if file was picked and Supabase is configured
      if (selectedFile && supabase) {
        try {
          const fileExt = selectedFile.name.split('.').pop() || 'jpg';
          const fileName = `${currentProfile.id}-${Date.now()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, selectedFile, { upsert: true });

          if (!uploadError) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (data?.publicUrl) {
              finalAvatarUrl = data.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Supabase storage upload error, falling back to local image data:', storageErr);
        }
      }

      // Update Supabase Auth user metadata if logged in
      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: {
              avatar_url: finalAvatarUrl,
            },
          });
        } catch {
          // non-fatal
        }
      }

      const updatedProfile: UserProfile = {
        ...currentProfile,
        avatarUrl: finalAvatarUrl,
      };

      saveLocalPassengerProfile(updatedProfile);

      setExiting(true);
      setTimeout(() => {
        onComplete(updatedProfile);
      }, 350);
    } catch (err: any) {
      setError(err?.message || 'Could not complete upload. You can skip and set it later.');
    } finally {
      setUploading(false);
    }
  };

  // Skip handler
  const handleSkip = () => {
    const finalAvatarUrl = currentProfile.avatarUrl || getDefaultAvatar(currentProfile.fullName);
    const updatedProfile: UserProfile = {
      ...currentProfile,
      avatarUrl: finalAvatarUrl,
    };
    saveLocalPassengerProfile(updatedProfile);

    setExiting(true);
    setTimeout(() => {
      onSkip(updatedProfile);
    }, 350);
  };

  return (
    <div
      id="passenger-avatar-screen"
      className="min-h-screen flex flex-col select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        background: 'linear-gradient(160deg, #0a0e1a 0%, #111827 55%, #0f172a 100%)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-20px) scale(0.98)' : 'translateY(0) scale(1)',
        transition: exiting ? 'opacity 0.35s ease, transform 0.35s ease' : 'none',
      }}
    >
      <div className="max-w-md mx-auto w-full min-h-screen flex flex-col justify-between p-6">
        <div>
          {/* Header & Back Button */}
          <div style={{ animation: 'pr-fade-down 0.5s ease both' }}>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 mt-8 mb-6 text-sm font-semibold text-white/50 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div className="mt-8 mb-6 h-5" />
            )}

            <div className="inline-flex items-center mb-4">
              <span
                className="text-[11px] font-black tracking-[0.18em] uppercase px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(250,204,21,0.12)',
                  border: '1px solid rgba(250,204,21,0.35)',
                  color: '#FACC15',
                }}
              >
                SAFMOVE · PROFILE SETUP
              </span>
            </div>

            {/* Step Dots: Step 3 of 3 */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-[rgba(250,204,21,0.40)]" />
              <div className="w-2 h-2 rounded-full bg-[rgba(250,204,21,0.40)]" />
              <div className="w-6 h-2 rounded-full bg-[#FACC15]" />
              <span className="ml-1 text-[11px] text-white/35 font-semibold">
                Step 3 of 3
              </span>
            </div>

            <h1 className="text-2xl font-black text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
              Upload Profile<br />
              <span style={{ color: '#FACC15' }}>Photo</span>
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Add a picture so drivers can identify you easily
            </p>
          </div>

          {/* Avatar Upload Area */}
          <div
            className="flex flex-col items-center mt-10 mb-6"
            style={{ animation: 'pr-fade-up 0.5s 0.15s ease both' }}
          >
            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="avatar-file-input"
            />

            {/* Circular Box */}
            <div className="relative group">
              <div
                id="avatar-upload-box"
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 rounded-full border-2 border-[#FACC15] flex flex-col items-center justify-center bg-slate-800/60 overflow-hidden relative cursor-pointer shadow-[0_0_32px_rgba(250,204,21,0.22)] transition-all duration-200 group-hover:border-yellow-300 group-hover:scale-105"
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Selected Profile"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                      <Camera className="w-5 h-5 text-[#FACC15]" />
                      <span>Change</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center px-2">
                    <Camera className="w-10 h-10 text-[#FACC15]/80 group-hover:text-[#FACC15] transition-colors mb-1" />
                    <span className="text-[11px] font-bold text-white/60 group-hover:text-white transition-colors">
                      Tap to upload
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Badge Pill */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#FACC15] text-[#111827] flex items-center justify-center shadow-lg border-2 border-[#0a0e1a] transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                aria-label="Upload photo"
              >
                <Camera className="w-4 h-4 text-slate-900" />
              </button>
            </div>

            {/* User display name */}
            <div className="mt-4 text-center">
              <p className="text-base font-bold text-white">
                {currentProfile.fullName || 'Passenger'}
              </p>
              <p className="text-xs text-white/40">
                @{currentProfile.username || 'user'}
              </p>
            </div>

            {/* Micro-copy Info Banner */}
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mt-8 w-full"
              style={{
                background: 'rgba(250,204,21,0.07)',
                border: '1px solid rgba(250,204,21,0.20)',
              }}
            >
              <span className="text-lg leading-none mt-0.5">📸</span>
              <p className="text-xs text-white/60 leading-relaxed">
                A clear photo helps drivers recognize you at busy pick-up spots across Accra.
              </p>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-2xl px-4 py-3 mt-4 w-full"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          className="flex flex-col items-center gap-3 pt-4 pb-2"
          style={{ animation: 'pr-fade-up 0.5s 0.25s ease both' }}
        >
          {/* Primary Action Button */}
          <button
            type="button"
            id="finish-avatar-btn"
            onClick={handleFinish}
            disabled={uploading}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98]"
            style={{
              background: uploading
                ? 'rgba(250,204,21,0.45)'
                : 'linear-gradient(135deg, #FACC15 0%, #f5b800 100%)',
              color: '#111827',
              boxShadow: uploading ? 'none' : '0 8px 32px rgba(250,204,21,0.40)',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Saving photo…</span>
              </>
            ) : (
              <>
                <span>Finish &amp; Go to Map</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Secondary Action: Skip */}
          <button
            type="button"
            id="skip-avatar-btn"
            onClick={handleSkip}
            disabled={uploading}
            className="text-xs font-semibold text-white/40 hover:text-white/80 transition-colors underline underline-offset-4 py-2"
          >
            Skip for Now
          </button>
        </div>
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
};

export default PassengerAvatar;
