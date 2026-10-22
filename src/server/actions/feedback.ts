'use server';

import { query } from '../db/pool';
import { getCurrentUser } from '../auth/session';
import {
  FeedbackCategory,
  FEEDBACK_CATEGORIES,
  getFeedbackCategoryLabel,
  SUPPORT_EMAIL_ADDRESS,
} from '@/lib/feedback-mailto';

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  message: string;
  rating?: number | null;
  contactEmail?: string;
  displayName?: string;
  leagueId?: string | null;
  leagueName?: string | null;
  pageUrl?: string | null;
  userId?: string | null;
  skipEmailForwarding?: boolean;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  feedbackId?: string;
  emailForwarded?: boolean;
  dartTaskCreated?: boolean;
}

const VALID_CATEGORIES = new Set<string>(FEEDBACK_CATEGORIES.map((c) => c.id));

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function forwardFeedbackToSupportEmail(params: {
  feedbackId: string;
  category: FeedbackCategory;
  message: string;
  rating?: number | null;
  displayName: string;
  contactEmail: string;
  leagueName?: string | null;
  pageUrl?: string | null;
}): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return false;
  }

  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL_ADDRESS;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || `SquadPicks Feedback <${supportEmail}>`;
  const categoryLabel = getFeedbackCategoryLabel(params.category);
  const subject = `[SquadPicks ${categoryLabel}] from ${params.displayName || 'Player'}`;

  const starsDisplay = params.rating
    ? `${'★'.repeat(params.rating)}${'☆'.repeat(5 - params.rating)} (${params.rating}/5)`
    : 'Not rated';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #f5f5f5; border-radius: 16px; border: 1px solid #262626;">
      <h2 style="margin: 0 0 8px 0; color: #34d399; font-size: 18px;">New SquadPicks Player Feedback</h2>
      <p style="margin: 0 0 20px 0; color: #a3a3a3; font-size: 13px;">Reference ID: <code>${escapeHtml(params.feedbackId)}</code></p>
      
      <div style="background: #171717; padding: 16px; border-radius: 12px; border: 1px solid #262626; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Rating:</strong> ${escapeHtml(starsDisplay)}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Player Name:</strong> ${escapeHtml(params.displayName || 'Anonymous')}</p>
        <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Contact Email:</strong> ${escapeHtml(params.contactEmail || 'Not provided')}</p>
        ${params.leagueName ? `<p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Active League:</strong> ${escapeHtml(params.leagueName)}</p>` : ''}
        ${params.pageUrl ? `<p style="margin: 0; font-size: 13px;"><strong>Page URL:</strong> ${escapeHtml(params.pageUrl)}</p>` : ''}
      </div>

      <div style="background: #171717; padding: 16px; border-radius: 12px; border: 1px solid #262626;">
        <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #a3a3a3; font-weight: bold;">Message</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(params.message)}</p>
      </div>
    </div>
  `;

  try {
    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: [supportEmail],
      subject,
      html: htmlBody,
      text: `${categoryLabel} from ${params.displayName || 'Player'} (${params.contactEmail || 'no email'})\nRating: ${starsDisplay}\n\n${params.message}`,
    };

    if (params.contactEmail && params.contactEmail.includes('@')) {
      payload.reply_to = params.contactEmail;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn('[submitUserFeedback] Resend API non-200 response:', res.status, errBody);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[submitUserFeedback] Failed to forward email via Resend:', err);
    return false;
  }
}

async function forwardFeedbackToDart(params: {
  feedbackId: string;
  category: FeedbackCategory;
  message: string;
  rating?: number | null;
  displayName: string;
  contactEmail: string;
  leagueName?: string | null;
  pageUrl?: string | null;
}): Promise<boolean> {
  const dartToken = process.env.DART_TOKEN?.trim();
  if (!dartToken) {
    return false;
  }

  const dartboard = process.env.DART_DARTBOARD?.trim() || 'General/SquadPicks';
  const categoryLabel = getFeedbackCategoryLabel(params.category);
  const shortSnippet = params.message.replace(/\s+/g, ' ').slice(0, 72);
  const title = `[${categoryLabel}] ${params.displayName || 'Player'}: ${shortSnippet}${
    params.message.length > 72 ? '…' : ''
  }`;

  const starsDisplay = params.rating
    ? `${'★'.repeat(params.rating)}${'☆'.repeat(5 - params.rating)} (${params.rating}/5)`
    : 'Not rated';

  const tags: string[] =
    params.category === 'BUG_REPORT'
      ? ['Bug', 'Product']
      : params.category === 'FEATURE_REQUEST'
      ? ['Feature', 'Product']
      : ['Product'];

  const priority =
    params.category === 'BUG_REPORT'
      ? 'High'
      : params.category === 'FEATURE_REQUEST'
      ? 'Medium'
      : 'Low';

  const descriptionLines = [
    `### Player Feedback (${categoryLabel})`,
    `- **Reference ID:** \`${params.feedbackId}\``,
    `- **Player:** ${params.displayName || 'Anonymous'}`,
    `- **Contact Email:** ${params.contactEmail || 'Not provided'}`,
    `- **Experience Rating:** ${starsDisplay}`,
    params.leagueName ? `- **Active League:** ${params.leagueName}` : null,
    params.pageUrl ? `- **Page URL:** ${params.pageUrl}` : null,
    '',
    '### Message',
    params.message,
  ].filter((line): line is string => line !== null);

  try {
    const res = await fetch('https://app.dartai.com/api/v0/public/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dartToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item: {
          title,
          description: descriptionLines.join('\n'),
          dartboard,
          status: 'To-do',
          priority,
          tags,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn('[submitUserFeedback] Dart API non-200 response:', res.status, errBody);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[submitUserFeedback] Failed to create task in Dart:', err);
    return false;
  }
}

export async function submitUserFeedback(
  input: SubmitFeedbackInput
): Promise<SubmitFeedbackResponse> {
  try {
    const category = input.category || 'GENERAL_FEEDBACK';
    if (!VALID_CATEGORIES.has(category)) {
      return {
        success: false,
        message: 'Please select a valid feedback category.',
      };
    }

    const trimmedMessage = (input.message || '').trim();
    if (trimmedMessage.length < 5) {
      return {
        success: false,
        message: 'Please enter a message of at least 5 characters so we can help.',
      };
    }
    if (trimmedMessage.length > 2000) {
      return {
        success: false,
        message: 'Feedback message cannot exceed 2,000 characters.',
      };
    }

    const rating =
      input.rating !== undefined && input.rating !== null ? Number(input.rating) : null;
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return {
        success: false,
        message: 'Experience rating must be between 1 and 5 stars.',
      };
    }

    // Resolve current user from session or explicit userId
    let resolvedUserId: string | null = input.userId || null;
    let resolvedDisplayName = (input.displayName || '').trim();
    let resolvedEmail = (input.contactEmail || '').trim();

    if (!resolvedUserId) {
      try {
        const sessionUser = await getCurrentUser();
        if (sessionUser) {
          resolvedUserId = sessionUser.id;
          if (!resolvedDisplayName) resolvedDisplayName = sessionUser.display_name;
          if (
            !resolvedEmail &&
            sessionUser.email &&
            !sessionUser.email.includes('@squadpicks.internal') &&
            !sessionUser.email.includes('@groupbet.internal')
          ) {
            resolvedEmail = sessionUser.email;
          }
        }
      } catch {
        // Ignore session lookup error in non-request test contexts
      }
    } else if (!resolvedDisplayName || !resolvedEmail) {
      const userRes = await query<{ display_name: string; email: string }>(
        `SELECT display_name, email FROM users WHERE id = $1 LIMIT 1`,
        [resolvedUserId]
      );
      if (userRes.rows[0]) {
        if (!resolvedDisplayName) resolvedDisplayName = userRes.rows[0].display_name;
        if (
          !resolvedEmail &&
          userRes.rows[0].email &&
          !userRes.rows[0].email.includes('@squadpicks.internal') &&
          !userRes.rows[0].email.includes('@groupbet.internal')
        ) {
          resolvedEmail = userRes.rows[0].email;
        }
      }
    }

    if (
      resolvedEmail &&
      (!resolvedEmail.includes('@') || resolvedEmail.length > 255)
    ) {
      return {
        success: false,
        message: 'Please enter a valid contact email address.',
      };
    }

    // Verify leagueId exists if supplied
    let validLeagueId: string | null = null;
    if (input.leagueId) {
      const leagueCheck = await query<{ id: string }>(
        `SELECT id FROM leagues WHERE id = $1 LIMIT 1`,
        [input.leagueId]
      );
      if (leagueCheck.rows[0]) {
        validLeagueId = leagueCheck.rows[0].id;
      }
    }

    const insertRes = await query<{ id: string }>(
      `INSERT INTO public.user_feedback
         (user_id, display_name, contact_email, category, rating, message, league_id, page_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        resolvedUserId,
        resolvedDisplayName || 'Anonymous Player',
        resolvedEmail || null,
        category,
        rating,
        trimmedMessage,
        validLeagueId,
        input.pageUrl ? input.pageUrl.slice(0, 500) : null,
      ]
    );

    const feedbackId = insertRes.rows[0]?.id;

    const forwardParams = {
      feedbackId: feedbackId || 'unknown',
      category,
      message: trimmedMessage,
      rating,
      displayName: resolvedDisplayName || 'Anonymous Player',
      contactEmail: resolvedEmail,
      leagueName: input.leagueName,
      pageUrl: input.pageUrl,
    };

    // Attempt email forwarding (Resend) and Dart task creation in parallel
    const [emailForwarded, dartTaskCreated] = input.skipEmailForwarding
      ? [false, false]
      : await Promise.all([
          forwardFeedbackToSupportEmail(forwardParams),
          forwardFeedbackToDart(forwardParams),
        ]);

    return {
      success: true,
      message:
        'Thank you! Your feedback has been logged with the SquadPicks team.',
      feedbackId,
      emailForwarded,
      dartTaskCreated,
    };
  } catch (err: any) {
    console.error('[submitUserFeedback] Error saving feedback:', err);
    return {
      success: false,
      message: 'Failed to submit feedback. Please try again or email support@squadpicks.co.uk directly.',
    };
  }
}
