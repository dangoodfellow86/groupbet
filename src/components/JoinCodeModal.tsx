'use client';

import React, { useState } from 'react';
import { KeyRound, X, Loader2, ArrowRight } from 'lucide-react';
import { joinLeague, JoinLeagueResult } from '@/server/actions/leagues';

interface JoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserName?: string;
  onJoined: (result: JoinLeagueResult) => void;
}

export function JoinCodeModal({
  isOpen,
  onClose,
  defaultUserName = '',
  onJoined,
}: JoinCodeModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState(defaultUserName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = inviteCode.trim();
    if (!cleanCode) {
      setErrorMsg('Please enter an invite code');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await joinLeague({
        inviteCode: cleanCode,
        displayName: displayName.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Failed to join game');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onJoined(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to join game');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Join with Code</h2>
              <p className="text-xs text-neutral-400">Enter a 6-character game code</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Invite Code <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. GB-7X9K2"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-widest text-emerald-400 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 uppercase transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Your Display Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jack D, Marcus"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 transition"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>Join Game</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
