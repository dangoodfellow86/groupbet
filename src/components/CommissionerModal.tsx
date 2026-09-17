'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Settings,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  Trophy,
  Heart,
  Trash2,
  Lock,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  getLeagueMembersRoster,
  updateLeagueSettings,
  removeLeagueMember,
  startTournamentRoundTwo,
  LeagueMemberRosterItem,
} from '@/server/actions/commissioner';

export interface CommissionerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  leagueName: string;
  leagueType?: 'LAST_MAN_STANDING' | 'PREDICTOR';
  currentRound?: number;
  currentUserId?: string;
  initialSettings?: {
    startingLives?: number;
    allowRepeatTeams?: boolean;
    exclusiveTeamPicks?: boolean;
    exclusiveMatchClaims?: boolean;
  };
  onLeagueUpdated?: () => void;
}

export function CommissionerModal({
  isOpen,
  onClose,
  leagueId,
  leagueName,
  leagueType = 'LAST_MAN_STANDING',
  currentRound = 1,
  currentUserId,
  initialSettings,
  onLeagueUpdated,
}: CommissionerModalProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'roster' | 'reset'>('settings');

  // Form states for settings
  const [name, setName] = useState(leagueName);
  const [startingLives, setStartingLives] = useState(initialSettings?.startingLives ?? 3);
  const [exclusiveTeamPicks, setExclusiveTeamPicks] = useState(initialSettings?.exclusiveTeamPicks ?? true);
  const [exclusiveMatchClaims, setExclusiveMatchClaims] = useState(initialSettings?.exclusiveMatchClaims ?? false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Roster states
  const [roster, setRoster] = useState<LeagueMemberRosterItem[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmKickUser, setConfirmKickUser] = useState<LeagueMemberRosterItem | null>(null);

  // Reset states
  const [isResettingRound, setIsResettingRound] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(leagueName);
      setStartingLives(initialSettings?.startingLives ?? 3);
      setExclusiveTeamPicks(initialSettings?.exclusiveTeamPicks ?? true);
      setExclusiveMatchClaims(initialSettings?.exclusiveMatchClaims ?? false);
      setSettingsSuccess(false);
      setResetSuccessMessage(null);
      setResetError(null);
      setResetConfirmInput('');
      setConfirmKickUser(null);
      loadRoster();
    }
  }, [isOpen, leagueId, leagueName, initialSettings]);

  async function loadRoster() {
    setIsLoadingRoster(true);
    setRosterError(null);
    try {
      const res = await getLeagueMembersRoster(leagueId);
      if (res.success) {
        setRoster(res.members);
      } else {
        setRosterError(res.message || 'Failed to load member roster');
      }
    } catch (err: any) {
      setRosterError(err?.message || 'Error fetching roster');
    } finally {
      setIsLoadingRoster(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await updateLeagueSettings({
        leagueId,
        name: name.trim(),
        startingLives,
        exclusiveTeamPicks,
        exclusiveMatchClaims,
      });

      if (res.success) {
        setSettingsSuccess(true);
        onLeagueUpdated?.();
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        alert(res.message || 'Failed to update settings');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating league settings');
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleConfirmKick() {
    if (!confirmKickUser) return;
    setRemovingUserId(confirmKickUser.userId);
    try {
      const res = await removeLeagueMember(leagueId, confirmKickUser.userId);
      if (res.success) {
        setRoster((prev) => prev.filter((m) => m.userId !== confirmKickUser.userId));
        setConfirmKickUser(null);
        onLeagueUpdated?.();
      } else {
        alert(res.message || 'Failed to remove member');
      }
    } catch (err: any) {
      alert(err?.message || 'Error kicking member');
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleLaunchRoundTwo() {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      setResetError('Please type "RESET" into the confirmation box to proceed.');
      return;
    }

    setIsResettingRound(true);
    setResetError(null);
    setResetSuccessMessage(null);

    try {
      const res = await startTournamentRoundTwo(leagueId);
      if (res.success) {
        setResetSuccessMessage(res.message);
        setResetConfirmInput('');
        onLeagueUpdated?.();
        // Refresh roster view
        loadRoster();
      } else {
        setResetError(res.message || 'Failed to launch Round 2');
      }
    } catch (err: any) {
      setResetError(err?.message || 'Unexpected error during tournament reset');
    } finally {
      setIsResettingRound(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Commissioner Tools</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Round {currentRound}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage settings, member roster, and tournament resets for{' '}
                <span className="text-amber-300 font-semibold">{leagueName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Rules & Settings
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'roster'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Member Roster ({roster.length})
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'reset'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-rose-300'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Tournament Reset (Round 2)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {settingsSuccess && (
                <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-sm">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span>League settings saved successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  League Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition"
                  placeholder="Premier League Showdown"
                />
              </div>

              {leagueType === 'LAST_MAN_STANDING' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Starting Lives per Player
                  </label>
                  <div className="flex items-center gap-4">
                    {[1, 2, 3, 5].map((lives) => (
                      <button
                        key={lives}
                        type="button"
                        onClick={() => setStartingLives(lives)}
                        className={`flex-1 py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                          startingLives === lives
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            startingLives === lives ? 'text-rose-500 fill-rose-500' : 'text-slate-500'
                          }`}
                        />
                        {lives} {lives === 1 ? 'Life' : 'Lives'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Controls starting lives for new tournament rounds.
                  </p>
                </div>
              )}

              {/* Toggle Options */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Pick & Claim Rules
                </label>

                <div
                  onClick={() => setExclusiveTeamPicks(!exclusiveTeamPicks)}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={exclusiveTeamPicks}
                    onChange={() => {}} // Handled by container
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">Exclusive Team Picks (Draft Mode)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      First-come first-served: Once a player locks in a team for a gameweek, no other player can pick that team in the same round.
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setExclusiveMatchClaims(!exclusiveMatchClaims)}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={exclusiveMatchClaims}
                    onChange={() => {}} // Handled by container
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">Exclusive Match Claims</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Only one player in the entire league can claim predictions for a specific fixture each week.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save League Rules'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MEMBER ROSTER */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Tournament Roster</h3>
                  <p className="text-xs text-slate-400">
                    Review enrolled participants or remove inactive players.
                  </p>
                </div>
                <button
                  onClick={loadRoster}
                  disabled={isLoadingRoster}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Refresh Roster"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRoster ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {rosterError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {rosterError}
                </div>
              )}

              {/* Kick Confirmation Dialog */}
              {confirmKickUser && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Remove {confirmKickUser.displayName}?
                  </div>
                  <p className="text-xs text-slate-300">
                    This will remove the player and clear their current tournament entry from this league. This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmKickUser(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmKick}
                      disabled={removingUserId === confirmKickUser.userId}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {removingUserId === confirmKickUser.userId ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Confirm Removal
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
                  {roster.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    return (
                      <div
                        key={member.userId}
                        className="px-4 py-3 flex items-center justify-between hover:bg-slate-900/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.displayName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              member.displayName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-white">
                                {member.displayName}
                              </span>
                              {member.isCreator && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                  👑 Creator
                                </span>
                              )}
                              {!member.isCreator && member.role === 'ADMIN' && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                                  Admin
                                </span>
                              )}
                              {isSelf && (
                                <span className="text-[10px] text-slate-500 font-medium">(You)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              {leagueType === 'LAST_MAN_STANDING' ? (
                                <span className="flex items-center gap-1">
                                  <Heart
                                    className={`w-3 h-3 ${
                                      member.lmsStatus === 'ELIMINATED'
                                        ? 'text-slate-600 fill-none'
                                        : 'text-rose-500 fill-rose-500'
                                    }`}
                                  />
                                  {member.lmsStatus === 'ELIMINATED'
                                    ? 'Eliminated'
                                    : `${member.lmsLives ?? 0} lives remaining`}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-amber-400" />
                                  {member.predictorPoints ?? 0} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {!member.isCreator && !isSelf ? (
                            <button
                              type="button"
                              onClick={() => setConfirmKickUser(member)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Remove player"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="text-slate-600 p-1.5" title="Immune to removal">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TOURNAMENT RESET / ROUND 2 */}
          {activeTab === 'reset' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-base mb-1">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Round {currentRound + 1} Tournament Launch
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Has your current tournament concluded with a champion or total wipeout? Launching a new round
                  archives the current champion and round standings into league history, resets all active participants
                  back to <span className="text-emerald-400 font-semibold">ALIVE</span> status with full starting lives,
                  and clears burned team restrictions so everyone gets a fresh clean slate!
                </p>
              </div>

              {resetSuccessMessage && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Check className="w-5 h-5 flex-shrink-0" />
                    Round {currentRound + 1} Successfully Launched!
                  </div>
                  <p className="text-xs text-emerald-200">{resetSuccessMessage}</p>
                </div>
              )}

              {resetError && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  What happens when you launch Round {currentRound + 1}:
                </h4>
                <ul className="text-xs text-slate-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-slate-200">Zero re-joining needed:</strong> All {roster.length} members remain in the league with their roles intact.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-slate-200">Full lives restored:</strong> Every participant is revived to ALIVE with {startingLives} {startingLives === 1 ? 'life' : 'lives'}.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-slate-200">Burned teams wiped clean:</strong> Previously picked Premier League clubs from Round {currentRound} are unlocked for Round {currentRound + 1}.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-slate-200">Permanent Trophy Audit:</strong> The victor of Round {currentRound} is recorded into the league archive.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Confirmation section */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                <label className="block text-xs font-bold text-rose-300">
                  Type <span className="underline font-mono">RESET</span> to confirm tournament progression:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={resetConfirmInput}
                    onChange={(e) => setResetConfirmInput(e.target.value)}
                    placeholder="RESET"
                    className="w-36 bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-rose-300 font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="button"
                    onClick={handleLaunchRoundTwo}
                    disabled={isResettingRound || resetConfirmInput.trim().toUpperCase() !== 'RESET'}
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isResettingRound ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Launching Round {currentRound + 1}...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        🚀 Launch Round {currentRound + 1}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>League ID: {leagueId.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
