'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Scale, ShieldCheck, Mail } from 'lucide-react';
import Link from 'next/link';
import { LegalContent } from './legal/LegalContent';
import { SquadPicksLogo } from './SquadPicksLogo';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export function LegalModal({
  isOpen,
  onClose,
  initialTab = 'terms',
}: LegalModalProps) {
  const [tab, setTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <SquadPicksLogo size="sm" variant="mark" />
            <div>
              <h2 id="legal-modal-title" className="text-sm sm:text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>SquadPicks Legal Policies</span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                UK GDPR &amp; Free-to-Play Social Football Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-auto self-end">
            {/* Tab Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setTab('terms')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  tab === 'terms'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Terms of Service</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('privacy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  tab === 'privacy'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </button>
            </div>

            {/* Direct Link to Full Page */}
            <Link
              href={tab === 'terms' ? '/terms' : '/privacy'}
              target="_blank"
              title="Open full page in new tab"
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              title="Close legal modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 overscroll-contain">
          <LegalContent section={tab} />
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Mail className="w-3.5 h-3.5 text-neutral-500" />
            <span>Questions? Contact </span>
            <a href="mailto:support@squadpicks.co.uk" className="text-emerald-400 font-mono hover:underline">
              support@squadpicks.co.uk
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
