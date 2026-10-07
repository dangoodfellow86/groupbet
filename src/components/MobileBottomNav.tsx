'use client';

import React from 'react';
import { ShieldCheck, Swords, Trophy, Flame, Users } from 'lucide-react';

export type MobileNavTab = 'picks' | 'standings' | 'matchday' | 'league';

interface MobileBottomNavProps {
  activeTab: MobileNavTab;
  onTabChange: (tab: MobileNavTab) => void;
  gameMode: 'lms' | 'predictor';
  leagueType?: 'LAST_MAN_STANDING' | 'PREDICTOR' | 'ALL_IN_ONE' | null;
  liveMatchesCount?: number;
  hasPickForGameweek?: boolean;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  gameMode,
  leagueType,
  liveMatchesCount = 0,
  hasPickForGameweek = false,
}: MobileBottomNavProps) {
  const isLms = gameMode === 'lms';

  const tabs: Array<{
    id: MobileNavTab;
    label: string;
    subLabel?: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'picks',
      label: isLms ? 'LMS Pick' : 'Predict',
      icon: isLms ? ShieldCheck : Swords,
      badge: hasPickForGameweek ? (
        <span className="w-1.5 h-1.5 rounded-full bg-pitch shadow-glow-pitch" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-whistle animate-pulse" />
      ),
    },
    {
      id: 'standings',
      label: 'Standings',
      icon: Trophy,
    },
    {
      id: 'matchday',
      label: 'Matchday',
      icon: Flame,
      badge:
        liveMatchesCount > 0 ? (
          <span className="px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-500 text-white animate-pulse">
            {liveMatchesCount}
          </span>
        ) : undefined,
    },
    {
      id: 'league',
      label: 'League',
      icon: Users,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-brand-950/95 backdrop-blur-xl border-t border-brand-800/80 px-2 py-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-4 items-center gap-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-1.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-pitch font-bold bg-pitch/10'
                  : 'text-brand-400 hover:text-brand-200 active:bg-brand-900/50 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-pitch stroke-[2.25]' : 'text-current'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] tracking-tight leading-none truncate max-w-full">
                {tab.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-pitch shadow-glow-pitch" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
