'use client';

import React from 'react';

interface SquadPicksLogoProps {
  variant?: 'full' | 'mark' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function SquadPicksLogo({
  variant = 'full',
  size = 'md',
  showTagline = false,
  className = '',
}: SquadPicksLogoProps) {
  // Dimension scale maps
  const markDimensions = {
    sm: { box: 'w-7 h-7', icon: 'w-4 h-4' },
    md: { box: 'w-9 h-9', icon: 'w-5 h-5' },
    lg: { box: 'w-12 h-12', icon: 'w-7 h-7' },
  }[size];

  const fontSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Tactical Pitch Shield Crest */}
      <div
        className={`${markDimensions.box} rounded-xl bg-gradient-to-br from-brand-900 via-brand-850 to-brand-950 border border-pitch/40 flex items-center justify-center shadow-lg shadow-pitch/10 relative overflow-hidden group shrink-0`}
      >
        {/* Subtle Pitch Grass Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:6px_6px] opacity-15" />

        {/* Vector Monogram Crest (S + P tactical pitch lines + whistle dot) */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${markDimensions.icon} text-pitch relative z-10`}
        >
          {/* Outer Shield Contour */}
          <path
            d="M16 2L5 6.5V14.5C5 21.5 9.7 27.9 16 30C22.3 27.9 27 21.5 27 14.5V6.5L16 2Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            className="text-pitch"
          />

          {/* Tactical Center Pitch Arch (P) */}
          <path
            d="M12 9.5H18C19.933 9.5 21.5 11.067 21.5 13C21.5 14.933 19.933 16.5 18 16.5H12V23"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          />

          {/* Tactical Cutting Curve (S) */}
          <path
            d="M19 16.5H14C12.8954 16.5 12 17.3954 12 18.5C12 19.6046 12.8954 20.5 14 20.5H18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-pitch-glow"
          />

          {/* Whistle / Match Kickoff Accent Dot (Amber) */}
          <circle cx="20.5" cy="20.5" r="1.75" fill="#F59E0B" />
        </svg>

        {/* Glow Halo */}
        <div className="absolute -inset-1 bg-pitch/20 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Wordmark Typography */}
      {variant !== 'mark' && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${fontSizes} flex items-center`}>
            <span className="text-brand-50 tracking-tight">SQUAD</span>
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-pitch bg-clip-text text-transparent ml-0.5 font-black">
              PICKS
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] font-medium text-brand-400 tracking-normal mt-0.5">
              Zero spreadsheets. Play with mates.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
