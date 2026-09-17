/**
 * Utility functions for pre-formatting WhatsApp and social sharing messages.
 */

export interface InviteShareParams {
  leagueName: string;
  inviteCode: string;
  joinUrl: string;
  leagueType?: string;
}

export interface DeadlineNudgeParams {
  leagueName: string;
  gameweekNumber: number;
  deadlineFormatted: string;
  timeLeftFormatted: string;
  joinUrl: string;
}

export interface StandingsShareItem {
  rank: number;
  name: string;
  score: string | number;
  extra?: string;
}

export interface StandingsShareParams {
  leagueName: string;
  leagueType?: string;
  gameweekNumber?: number;
  standings: StandingsShareItem[];
  joinUrl: string;
}

export function generateInviteShareText(params: InviteShareParams): string {
  const { leagueName, inviteCode, joinUrl, leagueType = 'LAST_MAN_STANDING' } = params;

  let modeDesc = 'Last Man Standing';
  if (leagueType === 'ALL_IN_ONE') {
    modeDesc = 'Last Man Standing & Premier League Predictor';
  } else if (leagueType === 'PREDICTOR') {
    modeDesc = 'Premier League Match Predictor';
  }

  return (
    `⚽ *Join my group on Groupbet!*\n\n` +
    `🏆 *Game:* ${leagueName}\n` +
    `🎮 *Mode:* ${modeDesc}\n` +
    `🔑 *Invite Code:* ${inviteCode}\n\n` +
    `Tap the link below to join in seconds:\n` +
    `${joinUrl}`
  );
}

export function generateDeadlineNudgeText(params: DeadlineNudgeParams): string {
  const { leagueName, gameweekNumber, deadlineFormatted, timeLeftFormatted, joinUrl } = params;

  return (
    `⚠️ *DEADLINE ALERT — Groupbet*\n\n` +
    `🏆 *Group:* ${leagueName}\n` +
    `📅 *Gameweek ${gameweekNumber} Deadline:* ${deadlineFormatted}\n` +
    `⏳ *Time Left:* ${timeLeftFormatted}\n\n` +
    `Make sure to lock in your picks before kickoff!\n` +
    `${joinUrl}`
  );
}

export function generateStandingsShareText(params: StandingsShareParams): string {
  const { leagueName, gameweekNumber, standings, joinUrl } = params;

  let header = `🏆 *${leagueName} Standings*`;
  if (gameweekNumber) {
    header += ` *(GW ${gameweekNumber})*`;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = standings.slice(0, 5).map((item) => {
    const medal = item.rank <= 3 ? medals[item.rank - 1] : `${item.rank}.`;
    const extraInfo = item.extra ? ` (${item.extra})` : '';
    return `${medal} ${item.name} — ${item.score}${extraInfo}`;
  });

  return (
    `${header}\n\n` +
    `${lines.join('\n')}\n\n` +
    `View full table & live scores:\n` +
    `${joinUrl}`
  );
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
