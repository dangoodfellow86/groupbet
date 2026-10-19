export const SUPPORT_EMAIL_ADDRESS = 'support@squadpicks.co.uk';

export type FeedbackCategory =
  | 'BUG_REPORT'
  | 'FEATURE_REQUEST'
  | 'GAMEPLAY_QUESTION'
  | 'GENERAL_FEEDBACK';

export const FEEDBACK_CATEGORIES: {
  id: FeedbackCategory;
  label: string;
  shortLabel: string;
  placeholder: string;
}[] = [
  {
    id: 'BUG_REPORT',
    label: 'Bug Report',
    shortLabel: 'Bug Report',
    placeholder:
      'Describe what happened, which screen or match you were viewing, and what you expected to see...',
  },
  {
    id: 'FEATURE_REQUEST',
    label: 'Feature Idea',
    shortLabel: 'Feature Idea',
    placeholder:
      'What new game mode, competition, or feature would make SquadPicks even better for your group?',
  },
  {
    id: 'GAMEPLAY_QUESTION',
    label: 'League / Rules Question',
    shortLabel: 'Rules / Help',
    placeholder:
      'Need help with a tournament setting, Last Man Standing rule, or Match Predictor scoring?',
  },
  {
    id: 'GENERAL_FEEDBACK',
    label: 'General Feedback',
    shortLabel: 'General',
    placeholder: 'Share your thoughts, suggestions, or experience playing with your mates...',
  },
];

export function getFeedbackCategoryLabel(category: FeedbackCategory): string {
  const found = FEEDBACK_CATEGORIES.find((c) => c.id === category);
  return found ? found.label : 'General Feedback';
}

export function buildSupportMailtoUrl(params: {
  category?: FeedbackCategory;
  message?: string;
  displayName?: string;
  contactEmail?: string;
  leagueName?: string;
  rating?: number | null;
}): string {
  const categoryLabel = getFeedbackCategoryLabel(params.category || 'GENERAL_FEEDBACK');
  const subject = `[SquadPicks ${categoryLabel}]${
    params.displayName ? ` from ${params.displayName}` : ''
  }`;

  const bodyLines: string[] = [];
  if (params.message && params.message.trim()) {
    bodyLines.push(params.message.trim());
    bodyLines.push('');
  } else {
    bodyLines.push('Hi SquadPicks Support,');
    bodyLines.push('');
    bodyLines.push('[Write your feedback or question here]');
    bodyLines.push('');
  }

  bodyLines.push('---');
  bodyLines.push(`Category: ${categoryLabel}`);
  if (params.rating) {
    bodyLines.push(`Experience Rating: ${params.rating}/5 stars`);
  }
  if (params.displayName) {
    bodyLines.push(`Player: ${params.displayName}`);
  }
  if (params.contactEmail) {
    bodyLines.push(`Email: ${params.contactEmail}`);
  }
  if (params.leagueName) {
    bodyLines.push(`Active League: ${params.leagueName}`);
  }

  const query = new URLSearchParams({
    subject,
    body: bodyLines.join('\n'),
  });

  // URLSearchParams encodes spaces as '+', whereas mailto clients prefer '%20'
  return `mailto:${SUPPORT_EMAIL_ADDRESS}?${query.toString().replace(/\+/g, '%20')}`;
}
