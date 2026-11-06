import type { Metadata } from 'next';
import { getLeagueByInviteCode } from '@/server/actions/leagues';

interface JoinLayoutProps {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: JoinLayoutProps): Promise<Metadata> {
  try {
    const { code } = await params;
    const res = await getLeagueByInviteCode(code);
    if (res.success && res.league) {
      const league = res.league;
      const modeLabel =
        league.type === 'ALL_IN_ONE'
          ? 'Last Man Standing + Match Predictor'
          : league.type === 'PREDICTOR'
          ? 'Match Predictor'
          : 'Last Man Standing';
      const title = `Join "${league.name}" on SquadPicks ⚽`;
      const description = `Hosted by ${league.creator_name} • ${league.competition_name || 'Premier League'} (${modeLabel}) • Starts Gameweek ${league.starting_gameweek}. Tap to join the squad!`;

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://www.squadpicks.co.uk/join/${encodeURIComponent(league.invite_code)}`,
          siteName: 'SquadPicks',
          locale: 'en_GB',
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
        },
      };
    }
  } catch {
    // Fallback to default metadata
  }

  return {
    title: 'Join League Invite | SquadPicks',
    description:
      'You have been invited to join a private Last Man Standing & Match Predictor league on SquadPicks.',
  };
}

export default function JoinLeagueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
