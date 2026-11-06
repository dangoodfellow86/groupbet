import { ImageResponse } from 'next/og';

export const alt = 'SquadPicks | Football Last Man Standing & Match Predictor';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0A0A0A',
          backgroundImage:
            'radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.22), transparent 55%), radial-gradient(circle at 15% 85%, rgba(245, 158, 11, 0.14), transparent 50%)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
          color: '#F5F5F5',
        }}
      >
        {/* Top Row: Brand & Free-to-Play Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '34px',
                fontWeight: 900,
                color: '#0A0A0A',
                boxShadow: '0 8px 30px rgba(16, 185, 129, 0.35)',
              }}
            >
              ⚽
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '36px',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  color: '#FFFFFF',
                }}
              >
                Squad<span style={{ color: '#10B981' }}>Picks</span>
              </span>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#A3A3A3',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                www.squadpicks.co.uk
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 22px',
              borderRadius: '999px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34D399',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            100% Free-to-Play • Zero Spreadsheets
          </div>
        </div>

        {/* Center Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxWidth: '960px',
          }}
        >
          <div
            style={{
              fontSize: '66px',
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Last Man Standing &amp;</span>
            <span style={{ color: '#10B981' }}>Match Predictor for Your Mates.</span>
          </div>
          <div
            style={{
              fontSize: '26px',
              color: '#D4D4D4',
              lineHeight: 1.4,
              maxWidth: '860px',
            }}
          >
            Create a private football pool in 10 seconds, share the WhatsApp invite link, and track live matchday scores &amp; eliminations automatically.
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              borderRadius: '18px',
              backgroundColor: '#171717',
              border: '1px solid #262626',
              fontSize: '20px',
              fontWeight: 700,
              color: '#F5F5F5',
            }}
          >
            🦁 Premier League (20 Clubs)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              borderRadius: '18px',
              backgroundColor: '#171717',
              border: '1px solid #262626',
              fontSize: '20px',
              fontWeight: 700,
              color: '#F5F5F5',
            }}
          >
            🏆 EFL Championship (24 Clubs)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 24px',
              borderRadius: '18px',
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              fontSize: '20px',
              fontWeight: 700,
              color: '#34D399',
            }}
          >
            ⚡ Live Matchday Settlement
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
