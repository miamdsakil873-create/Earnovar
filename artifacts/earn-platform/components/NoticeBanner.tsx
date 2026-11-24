import React, { useState } from 'react';
import { Megaphone, X } from 'lucide-react';

interface NoticeBannerProps {
  notice: string;
  active: boolean;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({ notice, active }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!active || !notice || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border-b border-amber-500/20 px-3 py-2 text-xs text-amber-200">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-300 shrink-0 animate-bounce">
            <Megaphone className="w-3.5 h-3.5" />
          </span>
          <p className="text-[11px] leading-snug font-medium text-slate-200 truncate">
            {notice}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
