'use client';

import React, { useState, useTransition } from 'react';
import {
  signInWithPassword,
  signUpWithPassword,
  sendMagicLink,
} from '@/server/actions/auth';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Send,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
  defaultMode?: 'signin' | 'signup';
  title?: string;
  subtitle?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  defaultMode = 'signin',
  title,
  subtitle,
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [useMagicLink, setUseMagicLink] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    startTransition(async () => {
      try {
        if (useMagicLink) {
          const res = await sendMagicLink({ email: email.trim() });
          if (res.success) {
            setSuccessMessage(res.message);
          } else {
            setErrorMessage(res.message);
          }
          return;
        }

        if (mode === 'signup') {
          if (!displayName.trim()) {
            setErrorMessage('Please enter a display name for the leaderboards.');
            return;
          }
          if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
          }

          const res = await signUpWithPassword({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
          });

          if (res.success) {
            setSuccessMessage(res.message);
            if (res.requiresEmailConfirmation) {
              // Keep message visible
            } else {
              setTimeout(() => {
                onAuthenticated?.();
                onClose();
              }, 1200);
            }
          } else {
            setErrorMessage(res.message);
          }
        } else {
          // Sign in
          if (!password) {
            setErrorMessage('Please enter your password.');
            return;
          }

          const res = await signInWithPassword({
            email: email.trim(),
            password,
          });

          if (res.success) {
            setSuccessMessage('Welcome back! Loading your profile...');
            setTimeout(() => {
              onAuthenticated?.();
              onClose();
            }, 1000);
          } else {
            setErrorMessage(res.message);
          }
        }
      } catch (err: any) {
        console.error('[AuthModal] Error during authentication:', err);
        const errMsg = err?.message || String(err || '');
        if (
          errMsg.includes('was not found on the server') ||
          errMsg.includes('UnrecognizedActionError') ||
          errMsg.includes('failed-to-find-server-action')
        ) {
          setErrorMessage('New update detected. Refreshing application...');
          setTimeout(() => {
            window.location.reload();
          }, 600);
          return;
        }
        setErrorMessage(
          err?.message || 'Connection failed. Please verify your email and network connection.'
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-7 shadow-2xl text-neutral-100 flex flex-col gap-5"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100">
              {title ||
                (useMagicLink
                  ? 'Sign In with Magic Link'
                  : mode === 'signup'
                  ? 'Create Your Account'
                  : 'Sign In to Groupbet')}
            </h3>
            <p className="text-xs text-neutral-400">
              {subtitle || 'Access your survivor leagues & predictions from any device'}
            </p>
          </div>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        {!useMagicLink && (
          <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition cursor-pointer ${
                mode === 'signin'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg font-semibold transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && !useMagicLink && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                Display Name (shown on Leaderboard)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Ferguson"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {!useMagicLink && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-neutral-400">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(true)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isPending || Boolean(successMessage)}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : useMagicLink ? (
              <>
                <Send className="w-4 h-4" />
                <span>Send Magic Link</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Alternative Auth Option Toggles */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          {useMagicLink ? (
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(false);
                setErrorMessage(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer"
            >
              ← Back to password sign-in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(true);
                setErrorMessage(null);
              }}
              className="text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            >
              Passwordless Magic Link
            </button>
          )}

          <span className="text-[11px] text-neutral-600">
            Protected by Supabase Auth
          </span>
        </div>
      </div>
    </div>
  );
}
