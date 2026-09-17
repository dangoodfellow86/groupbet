'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Trophy,
  Clock,
  ExternalLink,
  Users,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  generateInviteShareText,
  generateDeadlineNudgeText,
  generateStandingsShareText,
  getWhatsAppShareUrl,
  StandingsShareItem,
} from '@/lib/sharing';
import { CountdownTimer } from '@/components/CountdownTimer';

export interface ShareGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueName: string;
  inviteCode: string;
  leagueType?: string;
  gameweekNumber?: number;
  gameweekDeadline?: string;
  standings?: StandingsShareItem[];
  initialTab?: 'invite' | 'deadline' | 'standings';
}

export function ShareGameModal({
  isOpen,
  onClose,
  leagueName,
  inviteCode,
  leagueType = 'LAST_MAN_STANDING',
  gameweekNumber = 5,
  gameweekDeadline,
  standings = [],
  initialTab = 'invite',
}: ShareGameModalProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'deadline' | 'standings'>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Sync initialTab if opened specifically from a trigger
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const joinUrl = `${origin}/join/${inviteCode}`;

  // 1. Generate text for Invite
  const inviteText = generateInviteShareText({
    leagueName,
    inviteCode,
    joinUrl,
    leagueType,
  });

  // 2. Generate text for Deadline Nudge
  const formattedDeadline = gameweekDeadline
    ? new Date(gameweekDeadline).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Before First Match Kickoff';

  const nudgeText = generateDeadlineNudgeText({
    leagueName,
    gameweekNumber,
    deadlineFormatted: formattedDeadline,
    timeLeftFormatted: 'Soon',
    joinUrl,
  });

  // 3. Generate text for Standings
  const defaultStandings: StandingsShareItem[] =
    standings.length > 0
      ? standings
      : [
          { rank: 1, name: 'Leader', score: leagueType === 'LAST_MAN_STANDING' ? 'Alive (2 lives)' : '18 pts' },
          { rank: 2, name: 'Chaser', score: leagueType === 'LAST_MAN_STANDING' ? 'Alive (1 life)' : '15 pts' },
        ];

  const standingsText = generateStandingsShareText({
    leagueName,
    leagueType,
    gameweekNumber,
    standings: defaultStandings,
    joinUrl,
  });

  const handleCopy = async (text: string, type: 'link' | 'code' | 'text') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Social Hub & WhatsApp Sharing</h2>
              <p className="text-xs text-neutral-400">1-Tap sharing for invites, reminders & bragging rights</p>
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

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'invite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deadline')}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'deadline'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Deadline Nudge</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('standings')}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'standings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Standings</span>
          </button>
        </div>

        {/* TAB 1: INVITE FRIENDS */}
        {activeTab === 'invite' && (
          <div className="flex flex-col gap-4">
            {/* League Summary */}
            <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">
                  {leagueType === 'ALL_IN_ONE' ? 'All-in-One Group' : leagueType === 'PREDICTOR' ? 'Predictor' : 'Last Man Standing'}
                </div>
                <div className="font-bold text-sm text-neutral-100">{leagueName}</div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>

            {/* Invite Code Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Invite Code
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="font-mono text-lg font-extrabold tracking-widest text-emerald-400">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(inviteCode, 'code')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Direct Link */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Direct Join Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-300 truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(joinUrl, 'link')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 1-Tap WhatsApp Button */}
            <a
              href={getWhatsAppShareUrl(inviteText)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition mt-1"
            >
              <MessageCircle className="w-4 h-4 fill-emerald-400/20 text-emerald-400" />
              <span>Share Invite to WhatsApp</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          </div>
        )}

        {/* TAB 2: DEADLINE NUDGE */}
        {activeTab === 'deadline' && (
          <div className="flex flex-col gap-4">
            {/* Gameweek Deadline Card */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Gameweek {gameweekNumber} Deadline</span>
                </div>
                <div className="text-xs font-medium text-neutral-200 mt-0.5">{formattedDeadline}</div>
              </div>
              {gameweekDeadline && (
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">Time Left:</span>
                  <CountdownTimer targetDate={gameweekDeadline} size="sm" showIcon={false} />
                </div>
              )}
            </div>

            {/* Message Preview */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  WhatsApp Reminder Preview
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(nudgeText, 'text')}
                  className="text-neutral-400 hover:text-neutral-200 text-[11px] flex items-center gap-1"
                >
                  {copiedText ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-sans text-xs text-neutral-300 whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed">
                {nudgeText}
              </div>
            </div>

            {/* 1-Tap WhatsApp Nudge Button */}
            <a
              href={getWhatsAppShareUrl(nudgeText)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold text-xs transition"
            >
              <MessageCircle className="w-4 h-4 fill-amber-400/20 text-amber-400" />
              <span>Send Nudge to WhatsApp Group</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          </div>
        )}

        {/* TAB 3: STANDINGS & BRAGGING RIGHTS */}
        {activeTab === 'standings' && (
          <div className="flex flex-col gap-4">
            {/* Standings Summary */}
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">
                    Leaderboard Snapshot
                  </div>
                  <div className="text-xs font-medium text-neutral-200">{leagueName} (GW {gameweekNumber})</div>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Top {defaultStandings.length}
              </span>
            </div>

            {/* Standings Text Preview */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  WhatsApp Standings Preview
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(standingsText, 'text')}
                  className="text-neutral-400 hover:text-neutral-200 text-[11px] flex items-center gap-1"
                >
                  {copiedText ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-sans text-xs text-neutral-300 whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed">
                {standingsText}
              </div>
            </div>

            {/* 1-Tap WhatsApp Standings Button */}
            <a
              href={getWhatsAppShareUrl(standingsText)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-semibold text-xs transition"
            >
              <MessageCircle className="w-4 h-4 fill-blue-400/20 text-blue-400" />
              <span>Share Standings to WhatsApp Group</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          </div>
        )}

        {/* Footer Close */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
