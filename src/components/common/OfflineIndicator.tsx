import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/90 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-2xl border border-amber-400/40 animate-bounce"
    >
      <WifiOff className="w-4 h-4 text-slate-950 flex-shrink-0" />
      <div>
        <span className="font-bold">Offline Resilience Active</span> — SafMove cached route & emergency dispatch data is preserved.
      </div>
    </div>
  );
};
