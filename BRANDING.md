# SQUADPICKS BRAND GUIDELINES & DESIGN SYSTEM

## 1. Brand Identity & Overview
- **Brand Name:** SquadPicks
- **Legal / Code Usages:** `squadpicks`, `SquadPicks`, `SP`
- **Tagline:** The football games you play with mates. Zero spreadsheets.
- **Core Product Mechanics:** 
  - Last Man Standing (LMS / Survivor Eliminator)
  - Match Predictor (1X2, Exact Score, BTTS, Over/Under 2.5)
- **Design Persona:** Deep-midnight pitch aesthetic, tactical football culture, high-contrast matchday accents, clean typography, mobile-first responsive density.

---

## 2. Color Palette (Tailwind CSS Tokens)

All UI elements must utilize these exact hex codes and semantic tokens. Do not use generic, washed-out greys; use pitch-tinted midnight blues.

### Semantic Color Matrix
| Token | Hex | Role & Usage |
| :--- | :--- | :--- |
| `brand-950` | `#070C16` | Root body canvas background |
| `brand-900` | `#0F172A` | Primary card, modal, and drawer backgrounds |
| `brand-850` | `#142038` | Elevated surfaces, dropdowns, sticky headers |
| `brand-800` | `#1E293B` | Borders, subtle dividers, inactive tabs |
| `brand-700` | `#334155` | Disabled button outlines, subdued iconography |
| `brand-600` | `#475569` | Secondary icons, placeholder text |
| `brand-400` | `#94A3B8` | Muted subtitles, match minutes, metadata |
| `brand-200` | `#E2E8F0` | High-readability body text, secondary headings |
| `brand-50` | `#F8FAFC` | Primary headings, club names, vital readouts |
| `pitch-DEFAULT` | `#10B981` | Brand Primary: Confirmed picks, survived gameweek, primary CTA |
| `pitch-hover` | `#059669` | Primary CTA hover state |
| `pitch-glow` | `#34D399` | Glow shadows, active match indicators, gradient stop |
| `pitch-surface` | `#064E3B` | Subtle badges (10%–20% opacity backgrounds) |
| `whistle-DEFAULT` | `#F59E0B` | LMS warnings, deadline timers, ball accent dot |
| `whistle-glow` | `#FBBF24` | Alert halos, gameweek lock badges |
| `whistle-surface` | `#78350F` | Warning badge backgrounds |
| `danger-DEFAULT` | `#EF4444` | Eliminated players, lost lives, match postponements |
| `danger-pulse` | `#F87171` | Live match minute pulses, red cards |
| `danger-surface` | `#7F1D1D` | Critical alerts, elimination strike-throughs |
| `ucl-DEFAULT` | `#38BDF8` | European competition highlights, draw status indicators |

---

## 3. Tailwind Configuration Integration

Agents must ensure the Tailwind config (`tailwind.config.ts`) exports these color definitions:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#070C16',
          900: '#0F172A',
          850: '#142038',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          400: '#94A3B8',
          200: '#E2E8F0',
          50:  '#F8FAFC',
        },
        pitch: {
          DEFAULT: '#10B981',
          hover:   '#059669',
          glow:    '#34D399',
          surface: '#064E3B',
        },
        whistle: {
          DEFAULT: '#F59E0B',
          glow:    '#FBBF24',
          surface: '#78350F',
        },
        danger: {
          DEFAULT: '#EF4444',
          pulse:   '#F87171',
          surface: '#7F1D1D',
        },
        ucl: {
          DEFAULT: '#38BDF8',
          surface: '#0C4A6E',
        },
      },
      boxShadow: {
        'glow-pitch': '0 0 24px -4px rgba(16, 185, 129, 0.35)',
        'glow-whistle': '0 0 24px -4px rgba(245, 158, 11, 0.35)',
        'glow-danger': '0 0 24px -4px rgba(239, 68, 68, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;