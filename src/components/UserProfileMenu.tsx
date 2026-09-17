'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from '@/core/types/database';
import { signOut } from '@/server/actions/auth';
import {
  User as UserIcon,
  LogOut,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  KeyRound,
  LogIn,
  Trophy,
} from 'lucide-react';

interface UserProfileMenuProps {
  user: User | null;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenJoinCode: () => void;
  onOpenProfile?: () => void;
  onUserLoggedOut?: () => void;
}

export function UserProfileMenu({
  user,
  onOpenAuth,
  onOpenJoinCode,
  onOpenProfile,
  onUserLoggedOut,
}: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isGuest = !user || user.auth_id?.startsWith('guest_') || user.email?.includes('@groupbet.internal');

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
      onUserLoggedOut?.();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
        <button
          type="button"
          onClick={() => onOpenAuth('signin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5 text-neutral-400" />
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenAuth('signup')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Register</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative pl-2 border-l border-neutral-800" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 transition cursor-pointer"
      >
        <img
          src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.display_name)}`}
          alt={user.display_name}
          className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 object-cover"
        />
        <span className="text-xs font-semibold text-neutral-300 hidden sm:inline max-w-[120px] truncate">
          {user.display_name}
        </span>
        <ChevronDown className="w-3 h-3 text-neutral-500" />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2.5 z-50 flex flex-col gap-2 text-neutral-200 animate-in fade-in zoom-in-95 duration-150">
          {/* User info header */}
          <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-100 truncate">
                {user.display_name}
              </span>
              {isGuest ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-400 text-[10px] font-semibold">
                  Guest
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Verified
                </span>
              )}
            </div>
            {!user.email?.includes('@groupbet.internal') && (
              <span className="text-[11px] text-neutral-500 truncate font-mono">
                {user.email}
              </span>
            )}
          </div>

          {/* Guest Upgrade Prompt */}
          {isGuest && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAuth('signup');
              }}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 hover:from-emerald-900/60 hover:to-teal-900/60 border border-emerald-800/60 text-emerald-300 text-xs text-left flex items-start gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-[11px]">Save Your Account</span>
                <span className="text-[10px] text-emerald-400/80">
                  Sync picks and leagues across mobile & desktop.
                </span>
              </div>
            </button>
          )}

          {/* Menu Actions */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/80">
            {onOpenProfile && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenProfile();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-2 text-left cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>My Profile & Trophies</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenJoinCode();
              }}
              className="w-full px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition flex items-center gap-2 text-left cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
              <span>Join with Invite Code</span>
            </button>

            {isGuest && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAuth('signin');
                }}
                className="w-full px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition flex items-center gap-2 text-left cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-neutral-500" />
                <span>Sign In to Existing Account</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-3 py-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition flex items-center gap-2 text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
