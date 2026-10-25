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
  title: 'SquadPicks | Football Predictor & Last Man Standing',
  description:
    'The football games you play with mates. Zero spreadsheets.',
  applicationName: 'SquadPicks',
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
    title: 'SquadPicks | Football Predictor & Last Man Standing',
    description: 'The football games you play with mates. Zero spreadsheets.',
    url: 'https://www.squadpicks.co.uk',
    siteName: 'SquadPicks',
    locale: 'en_GB',
    type: 'website',
  },
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
      <body className="min-h-full flex flex-col bg-brand-950 text-brand-50 font-sans selection:bg-pitch selection:text-brand-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
