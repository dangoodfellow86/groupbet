import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.squadpicks.co.uk'),
  title: {
    default: 'SquadPicks | Free Football Last Man Standing & Match Predictor',
    template: '%s | SquadPicks',
  },
  description:
    'Free-to-play Premier League & EFL Championship Last Man Standing and Match Predictor for your group chat. Live matchday scores, auto-elimination & zero spreadsheets.',
  applicationName: 'SquadPicks',
  keywords: [
    'last man standing football',
    'premier league last man standing',
    'football predictor league',
    'football survivor pool',
    'last man standing app',
    'efl championship predictor',
    'last man standing rules',
    'play with friends football pool',
    'squadpicks',
    'free football predictor',
    'football group chat games',
    'last man standing spreadsheet alternative',
  ],
  alternates: {
    canonical: 'https://www.squadpicks.co.uk',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SquadPicks',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'SquadPicks | Free Football Last Man Standing & Match Predictor',
    description:
      'Free-to-play Premier League & EFL Championship Last Man Standing and Match Predictor for your group chat. Live matchday scores, auto-elimination & zero spreadsheets.',
    url: 'https://www.squadpicks.co.uk',
    siteName: 'SquadPicks',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SquadPicks | Free Football Last Man Standing & Match Predictor',
    description:
      'Free-to-play Premier League & EFL Championship Last Man Standing and Match Predictor for your group chat. Live matchday scores, auto-elimination & zero spreadsheets.',
    creator: '@SquadPicks',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': 'https://www.squadpicks.co.uk/#webapp',
      name: 'SquadPicks',
      url: 'https://www.squadpicks.co.uk',
      applicationCategory: 'SportsApplication',
      operatingSystem: 'All (Web, iOS, Android PWA)',
      description:
        'Free-to-play Premier League & EFL Championship Last Man Standing and Match Predictor for your group chat with automated fixtures, live scoring, and instant WhatsApp league invites.',
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'GBP',
      },
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.squadpicks.co.uk/#organization',
      name: 'SquadPicks',
      url: 'https://www.squadpicks.co.uk',
      logo: 'https://www.squadpicks.co.uk/icon-512x512.png',
      sameAs: [
        'https://www.instagram.com/squad.picks/',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.squadpicks.co.uk/#website',
      url: 'https://www.squadpicks.co.uk',
      name: 'SquadPicks',
      description: 'Free Football Last Man Standing & Weekly Match Predictor',
      publisher: {
        '@id': 'https://www.squadpicks.co.uk/#organization',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://www.squadpicks.co.uk/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Football Last Man Standing (LMS)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Last Man Standing (LMS) is a football survivor game where you pick 1 team to win each gameweek. If your team wins, you survive to the next round. If your team draws or loses, you lose a life. The catch is the "burned team" rule: you can only pick each club once per season. The last surviving player wins the league.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is SquadPicks free to play?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! SquadPicks is 100% free to play. It is a free-to-play football predictor and survivor platform created for friends, workplaces, and football communities. No real-money gambling is hosted or facilitated.',
          },
        },
        {
          '@type': 'Question',
          name: 'What leagues are supported on SquadPicks?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SquadPicks supports both the English Premier League (20 clubs) and the EFL Championship (24 clubs), as well as a combined 44-club All-in-One game mode.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens if a match is postponed or cancelled in Last Man Standing?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'If a fixture is postponed before kickoff, players with that pick advance safely to the next round as a void match, or are permitted to amend their selection before the gameweek deadline depending on commissioner settings. Their team is not burned.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does the Weekly Match Predictor scoring work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Players predict the scoreline for weekly fixtures. You earn +3 points for an exact correct scoreline, +1 point for predicting the correct match result (Home/Draw/Away), +1 bonus point for Both Teams to Score (BTTS), and +1 bonus point for Over/Under 2.5 total goals.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need to download an app from the App Store or Google Play?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SquadPicks is a Progressive Web App (PWA). You can play directly in your mobile browser or tap "Add to Home Screen" on iPhone (Safari) or Android (Chrome) to install it as an app with full offline capabilities and instant loading.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-brand-950 text-brand-50 font-sans selection:bg-pitch selection:text-brand-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
