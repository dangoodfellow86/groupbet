'use client';

import React from 'react';
import { SquadPicksLogo } from './SquadPicksLogo';

interface AppLoadingScreenProps {
  message?: string;
}

export function AppLoadingScreen({
  message = 'Loading your leagues & live matchday data...',
}: AppLoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 select-none">
      {/* Top Navbar Skeleton */}
      <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <SquadPicksLogo variant="full" size="md" />
            <div className="h-5 w-px bg-neutral-800 hidden sm:block" />
            <div className="h-9 w-40 sm:w-48 rounded-xl bg-neutral-900/90 border border-neutral-800/80 animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-xl bg-neutral-900/90 border border-neutral-800/80 animate-pulse hidden sm:block" />
            <div className="h-9 w-9 rounded-xl bg-neutral-900/90 border border-neutral-800/80 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Content with Centered Branded Loader + Subtle Dashboard Backdrop Skeleton */}
      <main className="relative flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col">
        {/* Centered Branded Loading Card */}
        <div className="flex-1 flex flex-col items-center justify-center py-12 z-10">
          <div className="relative flex flex-col items-center gap-5 p-7 sm:p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800/90 shadow-2xl backdrop-blur-md max-w-sm w-full text-center">
            {/* Ambient Emerald Pitch Glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-emerald-500/15 blur-2xl rounded-full pointer-events-none" />

            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-3 rounded-2xl bg-emerald-500/15 animate-ping opacity-40 duration-1000" />
              <SquadPicksLogo variant="mark" size="lg" />
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="font-black tracking-tight text-lg flex items-center justify-center">
                <span className="text-neutral-100">SQUAD</span>
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent ml-0.5">
                  PICKS
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-400">{message}</p>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-48 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Faint Background Skeleton Grid for Visual Continuity */}
        <div
          aria-hidden="true"
          className="pointer-events-none opacity-25 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4"
        >
          <div className="lg:col-span-8 flex flex-col gap-3.5">
            <div className="h-14 rounded-2xl bg-neutral-900 border border-neutral-800" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-28 rounded-xl bg-neutral-900 border border-neutral-800"
                />
              ))}
            </div>
          </div>
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-4">
            <div className="h-64 rounded-2xl bg-neutral-900 border border-neutral-800" />
          </div>
        </div>
      </main>
    </div>
  );
}
