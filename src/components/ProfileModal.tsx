'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlayerCareerStats,
  TrophyBadge,
  PlayerTournamentItem,
  updateUserProfile,
  getPremierLeagueClubBadges,
  ClubBadgeItem,
} from '@/server/actions/profile';
import { createClient } from '@/lib/supabase/client';
import {
  Trophy,
  Award,
  Users,
  Shield,
  Target,
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Flame,
  ArrowRight,
  Pencil,
  Camera,
  Upload,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  Dices,
  Image as ImageIcon,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSelectLeague?: (leagueId: string) => void;
  initialTab?: 'overview' | 'trophies' | 'tournaments' | 'edit';
}

/**
 * Client-side helper to center-crop and compress an image file
 * into an optimized 256x256 square WebP Blob.
 */
async function compressImageToSquareBlob(file: File, targetSize = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        // Center crop square
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetSize, targetSize);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback to jpeg if webp blob creation fails
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) resolve(jpegBlob);
                  else reject(new Error('Failed to compress image blob'));
                },
                'image/jpeg',
                0.85
              );
            }
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const FUN_DICEBEAR_STYLES = [
  { id: 'bottts', name: 'Tactical Robots' },
  { id: 'adventurer', name: 'Adventurers' },
  { id: 'fun-emoji', name: 'Fun Emoji' },
  { id: 'pixel-art', name: 'Pixel Retro' },
  { id: 'lorelei', name: 'Illustrated' },
  { id: 'miniavs', name: 'Minimalist' },
];

export function ProfileModal({
  isOpen,
  onClose,
  userId,
  onSelectLeague,
  initialTab = 'overview',
}: ProfileModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'trophies' | 'tournaments' | 'edit'>(initialTab);

  // Edit Mode State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');
  const [avatarTab, setAvatarTab] = useState<'upload' | 'clubs' | 'fun'>('upload');
  const [funSeed, setFunSeed] = useState(() => Math.random().toString(36).substring(2, 9));
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query Career Stats
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['player-career-stats', userId],
    queryFn: async () => {
      return await getPlayerCareerStats(userId);
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  // Query Premier League Club Badges
  const { data: clubBadges = [], isLoading: isClubsLoading } = useQuery({
    queryKey: ['premier-league-club-badges'],
    queryFn: async () => {
      const res = await getPremierLeagueClubBadges();
      return res.clubs;
    },
    enabled: isOpen,
    staleTime: 60 * 60 * 1000,
  });

  const user = data?.user;
  const metrics = data?.metrics;
  const badges = data?.badges || [];
  const tournaments = data?.tournaments || [];
  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  // Synchronize edit inputs when modal opens or user data loads
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (user) {
        setEditDisplayName(user.displayName || '');
        setSelectedAvatarUrl(user.avatarUrl || '');
        setPendingBlob(null);
        setPreviewDataUrl(null);
        setSaveError(null);
        setSaveSuccess(false);
      }
    }
  }, [isOpen, initialTab, user]);

  if (!isOpen) return null;

  // Handle local photo selection & instant square compression
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setSaveError('Please select a valid image file (PNG, JPEG, WebP, GIF).');
      return;
    }

    setIsUploading(true);
    setSaveError(null);
    try {
      const compressedBlob = await compressImageToSquareBlob(file, 256);
      const dataUrl = await blobToDataUrl(compressedBlob);
      setPendingBlob(compressedBlob);
      setPreviewDataUrl(dataUrl);
      setSelectedAvatarUrl(dataUrl);
    } catch (err: any) {
      console.error('Failed to compress image:', err);
      setSaveError('Failed to process image file. Please try another image.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Roll new fun avatar seed
  const handleRollRandomAvatar = () => {
    const newSeed = Math.random().toString(36).substring(2, 9);
    setFunSeed(newSeed);
  };

  // Handle Save Profile Changes
  const handleSaveProfile = async () => {
    const trimmed = editDisplayName.trim();
    if (!trimmed || trimmed.length < 2) {
      setSaveError('Display name must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 30) {
      setSaveError('Display name cannot exceed 30 characters.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      let finalAvatarUrl = selectedAvatarUrl;

      // If user uploaded a new local file Blob, upload to Supabase Storage
      if (pendingBlob && user?.id) {
        try {
          const supabase = createClient();
          const filePath = `${user.id}-${Date.now()}.webp`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, pendingBlob, {
              contentType: 'image/webp',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              finalAvatarUrl = publicUrlData.publicUrl;
            }
          } else {
            console.warn('[handleSaveProfile] Supabase storage upload warning, using local data URL fallback:', uploadError);
            if (previewDataUrl) finalAvatarUrl = previewDataUrl;
          }
        } catch (storageErr) {
          console.warn('[handleSaveProfile] Storage upload failed, using data URL fallback:', storageErr);
          if (previewDataUrl) finalAvatarUrl = previewDataUrl;
        }
      }

      const res = await updateUserProfile({
        displayName: trimmed,
        avatarUrl: finalAvatarUrl,
        customAvatar: true,
      });

      if (!res.success) {
        setSaveError(res.message || 'Failed to update profile.');
        return;
      }

      setSaveSuccess(true);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['user-session'] });
      await queryClient.invalidateQueries({ queryKey: ['player-career-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
      await queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['league-history-matrix'] });

      setTimeout(() => {
        setSaveSuccess(false);
        setActiveTab('overview');
      }, 1200);
    } catch (err: any) {
      console.error('[handleSaveProfile] Error:', err);
      setSaveError(err.message || 'Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentDisplayAvatar =
    selectedAvatarUrl ||
    user?.avatarUrl ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.displayName || 'Player')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-neutral-100 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Player Profile & Trophy Cabinet</h2>
              <p className="text-xs text-neutral-400">Career statistics, tournament achievements & avatar studio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Profile Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={currentDisplayAvatar}
                alt={user?.displayName || 'Player'}
                className="w-14 h-14 rounded-2xl bg-neutral-800 border-2 border-amber-500/30 object-cover shadow-lg"
              />
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition cursor-pointer"
                title="Change Avatar"
                aria-label="Change Avatar"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-neutral-100 truncate">{user?.displayName || 'Player'}</h3>
                {user?.isGuest ? (
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
              <p className="text-xs text-neutral-400 mt-0.5 truncate">
                Member since {user?.memberSince || '2026'} • {unlockedCount} of {badges.length} Trophies Unlocked
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {activeTab !== 'edit' ? (
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700/60 transition cursor-pointer"
              >
                <Pencil className="w-3 h-3 text-emerald-400" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700/60 transition cursor-pointer"
              >
                <span>View Stats</span>
              </button>
            )}

            {/* Badge completion pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>{unlockedCount}/{badges.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 text-center rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Career</span> Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trophies')}
            className={`py-2 px-1 text-center rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'trophies'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Trophies ({unlockedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tournaments')}
            className={`py-2 px-1 text-center rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'tournaments'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Tournaments ({tournaments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`py-2 px-1 text-center rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
            }`}
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            <span>Calculating career stats...</span>
          </div>
        )}

        {/* TAB 1: CAREER OVERVIEW */}
        {!isLoading && activeTab === 'overview' && metrics && (
          <div className="flex flex-col gap-5">
            {/* 4 Hero Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Trophies</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {metrics.tournamentsWon}
                </div>
                <span className="text-[10px] text-neutral-500">Tournaments Won</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Points</span>
                  <Award className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black font-mono text-blue-400 mt-1">
                  {metrics.totalPredictorPoints}
                </div>
                <span className="text-[10px] text-neutral-500">Predictor Score</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Survival</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {metrics.lmsWeeksSurvived}
                </div>
                <span className="text-[10px] text-neutral-500">Rounds Survived</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Exact Hits</span>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black font-mono text-purple-400 mt-1">
                  {metrics.correctExactScores}
                </div>
                <span className="text-[10px] text-neutral-500">Correct Scorelines</span>
              </div>
            </div>

            {/* Performance Analytics Box */}
            <div className="p-4 rounded-2xl bg-neutral-950/90 border border-neutral-800 flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Performance Analytics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                  <span className="text-neutral-500 text-[11px]">Tournaments Entered</span>
                  <span className="font-mono font-bold text-neutral-200">{metrics.tournamentsEntered}</span>
                </div>
                <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                  <span className="text-neutral-500 text-[11px]">Correct Outcomes (1X2)</span>
                  <span className="font-mono font-bold text-neutral-200">{metrics.correctOutcomes}</span>
                </div>
                <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                  <span className="text-neutral-500 text-[11px]">Total Matches Predicted</span>
                  <span className="font-mono font-bold text-neutral-200">{metrics.totalPicksMade}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TROPHY CABINET */}
        {!isLoading && activeTab === 'trophies' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                  b.isUnlocked
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-neutral-950/60 border-neutral-800/80 opacity-60'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                    b.isUnlocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                  }`}
                >
                  {b.isUnlocked ? b.icon : <Lock className="w-4 h-4 text-neutral-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-neutral-100 truncate">{b.title}</span>
                    {b.isUnlocked && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        Unlocked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{b.description}</p>
                  {b.progressText && (
                    <div className="mt-2 text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                      <span>Progress:</span>
                      <span className="text-neutral-300 font-bold">{b.progressText}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MY TOURNAMENTS */}
        {!isLoading && activeTab === 'tournaments' && (
          <div className="flex flex-col gap-2.5">
            {tournaments.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-40 text-neutral-400" />
                <span>You haven't joined any tournaments yet. Join with an invite code to get started!</span>
              </div>
            ) : (
              tournaments.map((t) => (
                <div
                  key={t.leagueId}
                  className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                      {t.leagueType === 'ALL_IN_ONE' ? (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      ) : t.leagueType === 'PREDICTOR' ? (
                        <Target className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-100">{t.leagueName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {t.leagueType === 'ALL_IN_ONE'
                            ? 'All-in-One'
                            : t.leagueType === 'PREDICTOR'
                            ? 'Predictor'
                            : 'LMS'}
                        </span>
                        {t.role === 'CREATOR' && (
                          <span className="text-[10px] text-amber-400 font-semibold">Host</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {t.memberCount} Players • Code: <span className="font-mono text-neutral-300">{t.inviteCode}</span>
                        {t.lmsLives !== undefined && ` • ${t.lmsLives} Lives Left`}
                        {t.predictorPoints !== undefined && ` • ${t.predictorPoints} Pts`}
                      </p>
                    </div>
                  </div>

                  {onSelectLeague && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLeague(t.leagueId);
                        onClose();
                      }}
                      className="self-end sm:self-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Switch to Game</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: EDIT PROFILE & AVATAR STUDIO */}
        {!isLoading && activeTab === 'edit' && (
          <div className="flex flex-col gap-5">
            {/* Success notification banner */}
            {saveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">Profile updated successfully! Refreshing view...</span>
              </div>
            )}

            {/* Error notification banner */}
            {saveError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Section 1: Display Name */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="displayNameInput" className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Display Name</span>
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  {editDisplayName.trim().length} / 30 characters
                </span>
              </div>
              <input
                id="displayNameInput"
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={30}
                placeholder="Enter your player name..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm font-semibold text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition"
              />
              <p className="text-[11px] text-neutral-500">
                Visible to friends across Survivor Boards, Predictor Leaderboards, and invitations.
              </p>
            </div>

            {/* Section 2: Avatar Studio */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Profile Picture & Avatar</span>
                </span>
                <span className="text-[10px] text-neutral-500">
                  Choose photo, club crest, or fun avatar
                </span>
              </div>

              {/* Sub-tabs for Avatar Source */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAvatarTab('upload')}
                  className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    avatarTab === 'upload'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Upload Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('clubs')}
                  className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    avatarTab === 'clubs'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Club Crests</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('fun')}
                  className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    avatarTab === 'fun'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Dices className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fun Avatars</span>
                </button>
              </div>

              {/* Sub-tab 1: Device Photo Upload */}
              {avatarTab === 'upload' && (
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900/50 transition cursor-pointer flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-200 block">
                        Click to upload photo from your device or camera
                      </span>
                      <span className="text-[11px] text-neutral-500 mt-0.5 block">
                        Auto-crops to square & compresses to lightweight WebP (~20 KB)
                      </span>
                    </div>
                  </div>

                  {previewDataUrl && (
                    <div className="p-3 rounded-xl bg-neutral-900/60 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={previewDataUrl}
                          alt="Uploaded Preview"
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-500/50"
                        />
                        <div>
                          <span className="font-bold text-emerald-400 block">Custom Photo Ready</span>
                          <span className="text-[10px] text-neutral-500">256x256 WebP Compressed</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingBlob(null);
                          setPreviewDataUrl(null);
                          setSelectedAvatarUrl(user?.avatarUrl || '');
                        }}
                        className="text-neutral-400 hover:text-rose-400 text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Premier League Club Badges */}
              {avatarTab === 'clubs' && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] text-neutral-400">
                    Proudly rep your club! Tap any Premier League crest to set it as your profile badge:
                  </p>
                  {isClubsLoading ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-neutral-500 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Loading club crests...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                      {clubBadges.map((club) => {
                        const isSelected = selectedAvatarUrl === club.crestUrl;
                        return (
                          <button
                            key={club.id}
                            type="button"
                            onClick={() => {
                              setSelectedAvatarUrl(club.crestUrl);
                              setPendingBlob(null);
                              setPreviewDataUrl(null);
                            }}
                            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer relative ${
                              isSelected
                                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                            }`}
                            title={club.name}
                          >
                            <img
                              src={club.crestUrl}
                              alt={club.name}
                              className="w-8 h-8 object-contain shrink-0"
                              loading="lazy"
                            />
                            <span className="text-[10px] font-bold text-neutral-300 truncate max-w-full">
                              {club.shortName}
                            </span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: DiceBear Fun Avatars */}
              {avatarTab === 'fun' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400">
                      Choose a fun avatar style or roll a fresh random seed:
                    </p>
                    <button
                      type="button"
                      onClick={handleRollRandomAvatar}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Roll Seed</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FUN_DICEBEAR_STYLES.map((style) => {
                      const avatarSrc = `https://api.dicebear.com/7.x/${style.id}/svg?seed=${encodeURIComponent(funSeed)}`;
                      const isSelected = selectedAvatarUrl === avatarSrc;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatarUrl(avatarSrc);
                            setPendingBlob(null);
                            setPreviewDataUrl(null);
                          }}
                          className={`p-3 rounded-2xl border flex items-center gap-2.5 transition text-left cursor-pointer relative ${
                            isSelected
                              ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/50'
                              : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                          }`}
                        >
                          <img
                            src={avatarSrc}
                            alt={style.name}
                            className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-neutral-200 block truncate">{style.name}</span>
                            <span className="text-[10px] text-neutral-500">Preset style</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 flex items-center justify-center text-black">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reset to Name-based Dicebear Button */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-500">Want the default icon?</span>
                <button
                  type="button"
                  onClick={() => {
                    const defaultUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(editDisplayName || 'Player')}`;
                    setSelectedAvatarUrl(defaultUrl);
                    setPendingBlob(null);
                    setPreviewDataUrl(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-200 text-xs font-semibold underline underline-offset-4 cursor-pointer"
                >
                  Reset to Default Robot Icon
                </button>
              </div>
            </div>

            {/* Save & Cancel Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {activeTab !== 'edit' && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
          >
            Close Profile
          </button>
        )}
      </div>
    </div>
  );
}
