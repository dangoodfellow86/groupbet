'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  X,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Star,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { submitUserFeedback } from '@/server/actions/feedback';
import {
  buildSupportMailtoUrl,
  FeedbackCategory,
  FEEDBACK_CATEGORIES,
  SUPPORT_EMAIL_ADDRESS,
} from '@/lib/feedback-mailto';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDisplayName?: string;
  defaultEmail?: string;
  userId?: string;
  activeLeagueId?: string | null;
  activeLeagueName?: string | null;
  initialCategory?: FeedbackCategory;
}

export function FeedbackModal({
  isOpen,
  onClose,
  defaultDisplayName = '',
  defaultEmail = '',
  userId,
  activeLeagueId,
  activeLeagueName,
  initialCategory = 'GENERAL_FEEDBACK',
}: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [contactEmail, setContactEmail] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setErrorMessage(null);
      setSubmittedId(null);
      if (defaultDisplayName) {
        setDisplayName(defaultDisplayName);
      }
      if (
        defaultEmail &&
        !defaultEmail.includes('@squadpicks.internal') &&
        !defaultEmail.includes('@groupbet.internal')
      ) {
        setContactEmail(defaultEmail);
      }
    }
  }, [isOpen, initialCategory, defaultDisplayName, defaultEmail]);

  if (!isOpen) return null;

  const activeCategoryConfig =
    FEEDBACK_CATEGORIES.find((c) => c.id === category) || FEEDBACK_CATEGORIES[3];

  const getCategoryIcon = (catId: FeedbackCategory) => {
    switch (catId) {
      case 'BUG_REPORT':
        return <Bug className="w-3.5 h-3.5 text-rose-400" />;
      case 'FEATURE_REQUEST':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'GAMEPLAY_QUESTION':
        return <HelpCircle className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const handleCopySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL_ADDRESS);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const mailtoHref = buildSupportMailtoUrl({
    category,
    message,
    displayName,
    contactEmail,
    leagueName: activeLeagueName || undefined,
    rating,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (message.trim().length < 5) {
      setErrorMessage('Please enter a brief description (at least 5 characters).');
      return;
    }

    startTransition(async () => {
      const pageUrl = typeof window !== 'undefined' ? window.location.href : null;
      const res = await submitUserFeedback({
        category,
        message: message.trim(),
        rating,
        displayName: displayName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        leagueId: activeLeagueId || null,
        leagueName: activeLeagueName || null,
        pageUrl,
        userId: userId || null,
      });

      if (res.success) {
        setSubmittedId(res.feedbackId || 'logged');
        setMessage('');
        setRating(null);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-7 shadow-2xl text-neutral-100 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
          aria-label="Close Feedback Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <h3 id="feedback-modal-title" className="text-base font-bold text-neutral-100">
              Share Feedback &amp; Support
            </h3>
            <p className="text-xs text-neutral-400">
              Spot a bug, have a feature idea, or need help with a league? Let us know.
            </p>
          </div>
        </div>

        {submittedId ? (
          /* Post-Submission Confirmation State */
          <div className="py-4 flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h4 className="text-lg font-extrabold text-neutral-100">
                Feedback Received!
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Thanks for helping us improve SquadPicks. Your message has been logged for our team
                {contactEmail ? (
                  <>
                    {' '}and we&apos;ll reply to <span className="text-neutral-200 font-semibold">{contactEmail}</span> if you need a hand.
                  </>
                ) : (
                  '.'
                )}
              </p>
            </div>

            <div className="w-full p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct Support:</span>
                <span className="font-mono text-emerald-300 font-semibold">
                  {SUPPORT_EMAIL_ADDRESS}
                </span>
              </div>
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold transition"
              >
                <span>Open Email App</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setSubmittedId(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
              >
                Send Another Note
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                Back to Game
              </button>
            </div>
          </div>
        ) : (
          /* Feedback Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Category Pills */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                What is this about?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      {getCategoryIcon(cat.id)}
                      <span className="truncate">{cat.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Optional 1-5 Star Experience Rating */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800/80">
              <div>
                <span className="block text-xs font-semibold text-neutral-300">
                  How are you finding SquadPicks?
                </span>
                <span className="text-[11px] text-neutral-500">
                  Optional quick rating
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const activeRating = hoverRating ?? rating ?? 0;
                  const isFilled = starValue <= activeRating;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() =>
                        setRating(rating === starValue ? null : starValue)
                      }
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(null)}
                      aria-label={`Rate ${starValue} out of 5 stars`}
                      className="p-1 rounded-lg hover:bg-neutral-800/80 transition cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 transition ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 scale-105'
                            : 'text-neutral-700 hover:text-neutral-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="feedback-message"
                  className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider"
                >
                  Your Message
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  {message.length} / 2000
                </span>
              </div>
              <textarea
                id="feedback-message"
                required
                rows={4}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={activeCategoryConfig.placeholder}
                className="w-full px-3.5 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition resize-y leading-relaxed"
              />
            </div>

            {/* 4. Name & Contact Email (for replies from support@squadpicks.co.uk) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="feedback-name"
                  className="block text-[11px] font-semibold text-neutral-400 mb-1"
                >
                  Your Name <span className="text-neutral-600">(optional)</span>
                </label>
                <input
                  id="feedback-name"
                  type="text"
                  maxLength={100}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dan"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="feedback-email"
                  className="block text-[11px] font-semibold text-neutral-400 mb-1"
                >
                  Reply Email <span className="text-neutral-600">(if you want a reply)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  maxLength={255}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || message.trim().length < 5}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Feedback...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>

            {/* Direct Support Email Footer */}
            <div className="pt-3 border-t border-neutral-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Or email us directly:</span>
                <a
                  href={mailtoHref}
                  className="font-mono text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-2"
                >
                  {SUPPORT_EMAIL_ADDRESS}
                </a>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopySupportEmail}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/90 hover:bg-neutral-800 text-neutral-300 text-[11px] font-medium transition cursor-pointer"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>

                <a
                  href={mailtoHref}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/90 hover:bg-neutral-800 text-neutral-300 text-[11px] font-medium transition"
                >
                  <span>Email App</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
