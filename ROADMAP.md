# GroupBet — Product Roadmap & Future Enhancements

This document captures prioritized enhancements, feature concepts, and architectural plans for GroupBet.

---

## 📱 Mobile Architecture: React Native & Expo App

### Vision
Deploy GroupBet as a native mobile application on iOS (App Store / TestFlight) and Android (Google Play) using **React Native (Expo)** to provide:
1. **Native Push Notifications** (Lock-screen deadline alerts, live match goal alerts, survivor eliminations).
2. **Instant App Launch** with biometrics (FaceID / Fingerprint) and native gesture performance.
3. **Deep Linking** (`groupbet://league/join/[code]` or `groupbet://gameweek/[id]`) from WhatsApp, SMS, or push alerts directly into pick sheets.

### Shared Infrastructure & Architecture
The React Native mobile app will leverage the **existing GroupBet production backend**:

```
                  ┌──────────────────────────────────────────────┐
                  │          GroupBet Cloud Backend              │
                  │  (Supabase PostgreSQL + Realtime + Auth)     │
                  │         Vercel Serverless REST API           │
                  └──────────────┬────────────────┬──────────────┘
                                 │                │
                                 ▼                ▼
                     ┌──────────────────┐  ┌──────────────────┐
                     │  Next.js Web App │  │ React Native App │
                     │  (Vercel Prod)   │  │   (Expo / iOS /  │
                     │                  │  │     Android)     │
                     └──────────────────┘  └──────────────────┘
```

1. **Shared Database & Auth:**
   - The React Native app authenticates against the same Supabase project (`@supabase/supabase-js` with `AsyncStorage` or `expo-secure-store`).
   - Logins are synchronized: users can log in on web or phone seamlessly with zero data discrepancies.
2. **Shared Scoring & Types:**
   - Core scoring algorithms (`src/core/engine/scoring.ts`) and TypeScript types (`src/core/types/`) are pure TypeScript and can be shared directly (via monorepo or private package).
3. **Native Push Notification Pipeline:**
   - Use **Expo Notifications** (`expo-notifications`) + APNs (Apple) + FCM (Google).
   - User device tokens stored in a `user_device_tokens` table in PostgreSQL.
   - When a gameweek deadline approaches or a match finishes, a lightweight background job (or Supabase Database Webhook / Edge Function) pings Expo Push API to broadcast instant push notifications.

---

## 🏆 Categorized Feature Enhancements

### 1. Matchday Experience & Live "RedZone" Hub
> **Goal:** Drive maximum real-time excitement during Saturday 3:00 PM and midweek kickoffs.

- **Live Gameweek War Room:**
  - Full-screen dashboard during active matches tracking concurrent scorelines.
  - Interactive "Who picked who" matrix updating as goals go in.
  - Dynamic **Casualty Counter** (e.g. *"Chelsea 0-2: 4 group members currently losing a life!"*).
- **Virtual Real-Time Standings:**
  - Live leaderboard updating mid-match (showing provisional points and projected ranks before full-time whistle).
- **Goal Flash Banners:**
  - Real-time alerts when a team picked in your group scores or concedes.

---

### 2. Automated Notifications & Communication
> **Goal:** Eliminate forgotten deadlines and keep players returning every week.

- **Deadline Countdown Alerts:**
  - Push notification / WhatsApp reminder 24 hours and 2 hours before the first kickoff of each gameweek.
- **Gameweek Recap Digest:**
  - Automated matchday debrief generated when the final match concludes (e.g. *"Gameweek 5 Recap: 3 players eliminated by Chelsea's loss; Agadoo scores 18 pts to top the table"*).
- **WhatsApp Nudge Links:**
  - One-tap commissioner button to ping players who haven't placed picks yet directly via WhatsApp group chat.

---

### 3. Social Interaction & In-Group Banter Feed
> **Goal:** Transform GroupBet into the central social hub for friend groups and office leagues.

- **League Activity Stream:**
  - Real-time feed of events:
    - *"Dan locked in Arsenal for GW 6"*
    - *"Dave predicted 2-1 and hit in the 94th min (+6 pts)!"*
    - *"Sam was eliminated (0 lives remaining) 🪦"*
- **Banter & Emoji Reactions:**
  - Allow league members to react (😂, 🔥, 💀, 🍿, 👏) and leave short banter comments on picks, close misses, and eliminations.

### 4. Social Authentication & Profile Enrichment (Google, Apple, Facebook)
> **Goal:** Slash registration friction down to a 1-tap experience and automatically build vibrant, recognizable player profiles.

- **1-Tap Social Providers:**
  - **Google Sign-In:** One-tap sign-in on web and Android; auto-syncs user's real name and Google profile photo.
  - **Sign in with Apple:** Frictionless FaceID / TouchID biometric login on iOS devices and web; supports Apple private relay emails; satisfies mandatory **Apple App Store Guideline 4.8**.
  - **Facebook Login:** Popular for social football communities; extracts verified email, display name, and Facebook profile picture.
- **Automated Profile Enrichment Pipeline:**
  - On OAuth callback or ID token verification, Supabase extracts provider metadata (`picture`, `avatar_url`, `full_name`).
  - `syncAuthenticatedUser` immediately stores the real high-res profile photo into `users.avatar_url`, replacing robot/dicebear placeholders with real avatars across:
    - **Survivor Board & LMS Roster**
    - **Predictor Leaderboards**
    - **Fixture Pick Ownership Badges**
    - **Trophy Cabinet & Career Stats Header**
  - Auto-fills display name and marks email as verified with zero confirmation friction.
  - **Seamless Guest Account Claiming:** If a player previously joined a league as a guest with their Gmail or Apple ID, signing in via social auth instantly claims and links their tournament entries, lives, and predictions.
- **Cross-Platform Parity:**
  - **Next.js Web:** Supabase OAuth redirect flow via `/api/auth/callback`.
  - **React Native (Expo):** Native sheets via `expo-apple-authentication` and `@react-native-google-signin/google-signin` passing cryptographic ID tokens directly to `supabase.auth.signInWithIdToken()`.

---

### 5. Progressive Web App (PWA) Installability (Web Quick-Win)
> **Goal:** Provide an immediate app-like mobile experience on web while React Native is developed.

- **Add to Home Screen (A2HS):**
  - Web App Manifest (`manifest.json`), service worker, and home screen icons for iOS & Android.
- **Standalone Display:**
  - Runs without browser address bars for a full-screen native feel.
- **Web Push API:**
  - Browser-based lock screen notifications on supported devices.

---

### 6. Tournament Variations & Strategic Power-Ups
> **Goal:** Retain players even if they fall behind early in a long 38-game season.

- **Predictor Power-Ups (1–2 single-use tokens per season):**
  - **Double Down:** 2x points for 1 selected match.
  - **Draw Insurance:** If your chosen team draws, you still receive partial points.
- **LMS Buybacks / Second Chance Pot:**
  - Configurable commissioner rule allowing eliminated players to re-enter before GW 10 by paying into a shared pot.
- **Prize & Stake Tracker:**
  - Commissioner bookkeeping tool to track entry fees, payout splits (1st, 2nd, highest single-gameweek score), and member payment statuses (Paid / Pending).

---

### 7. Team & Match Analytics / Form Guide
> **Goal:** Help players make smart picks without having to leave the app.

- **Recent Form Badges:**
  - Last 5 matches (W/D/L) displayed directly on fixture cards.
- **Head-to-Head & Popularity Trends:**
  - Show group consensus percentages (e.g. *"70% of players picked Man City this week"*).
- **Rival Head-to-Head Statistics:**
  - Profile comparison tab: *"You vs Dave: Dave leads 3–2 across 5 gameweeks"*.

---

## 💰 Revenue Generation & Monetization Models

GroupBet has multiple synergistic paths to revenue that scale with user growth, ranging from low-compliance SaaS subscriptions to high-margin sportsbook partnerships.

```
                         ┌──────────────────────────────────────────────┐
                         │         GroupBet Monetization Engines        │
                         └──────┬────────────┬────────────┬─────────────┘
                                │            │            │
             ┌──────────────────┴──┐  ┌──────┴──────┐  ┌──┴──────────────────┐
             │ B2C: Subscriptions  │  │  Platform   │  │   B2B & Affiliates  │
             │   & Freemium Pro    │  │  Pot Fees   │  │ (Pubs, Odds, Brands)│
             └─────────────────────┘  └─────────────┘  └─────────────────────┘
```

### 1. GroupBet Pro & Commissioner Pass (Freemium SaaS / IAP)
* **Free Tier:** Free for up to 10–12 players per group with standard LMS and Predictor formats.
* **GroupBet Pro / Commissioner Pass** (£3.99/month or £24.99/season):
  - **Unlimited League Capacity:** Essential for company offices, sports clubs, fraternities, and pub crowds.
  - **Advanced Edge & Analytics:** In-depth form guides, expected goals (xG) statistics, group consensus picks, and opponent pick history.
  - **Custom Rules & Formats:** Configure second-chance buybacks, custom live point weightings, and custom tie-breaking algorithms.
  - **Custom Branding:** Upload office or club logos to custom league headers, shareable recap cards, and leaderboards.
  - **Automated Broadcast Nudges:** Automated WhatsApp and priority push reminders broadcast to all league members.

---

### 2. Group Pot & Prize Platform Fee (Contest Host)
Many groups play with a voluntary entry fee (e.g. £10 or £20 per player):
* **Level 1 — Peer-to-Peer Pot Tracker (Low Regulatory Barrier):**
  - GroupBet tracks member payment status (Paid / Pending) and payout math (1st, 2nd, highest single-round score), while users settle payments peer-to-peer (Monzo, Revolut, PayPal). Included with Commissioner Pass.
* **Level 2 — Integrated Escrow Pot (Platform Take Rate / Rake):**
  - In-app payment collection via Stripe / Open Banking.
  - GroupBet automatically holds the prize pool in escrow and distributes payouts to winners, taking a **5%–8% platform hosting fee**.

---

### 3. Sportsbook & Affiliate Partnerships (High-Margin Lead Gen)
In regulated markets (e.g. UK, EU, US states):
* **Live Odds & One-Click Acca Deep-Links:**
  - Display odds beside fixtures on the pick sheet (e.g. "Odds via SkyBet / Bet365 / Paddy Power").
  - A "Bet My Picks" button that exports the user's predictor selections directly into an accumulator slip on a partner bookmaker.
  - Generates **Cost-Per-Acquisition (CPA)** fees (£25–£60+ per qualifying new depositor) or lifetime revenue share.
* **Contextual Free Bets:**
  - Promotional partner banners (e.g. *"Bet £10 get £40 in free bets"*).

---

### 4. B2B Pub, Sports Bar & Corporate Packages
* **"Pub League" Venue Subscription** (£29–£59/month per venue):
  - Local sports bars and pubs host an official GroupBet tournament to drive foot traffic on matchdays.
  - **TV Mode / Big-Screen Dashboard:** A dedicated HDMI / Chromecast presentation view showing live standings and casualty lists on pub screens during matches.
  - Local venue rewards (e.g., *"Top scorer this month wins a £30 bar tab"*).
* **Corporate Office Package:**
  - Team-building and employee engagement portal for companies with single-sign-on (SSO) and company-wide leaderboards.

---

### 5. Sponsored Community Tournaments
* **Free-to-Play Open Jackpots:**
  - Public season-long or cup tournaments open to all GroupBet players with no entry fee.
  - Sponsored by brands (e.g., sports nutrition, fan apparel, beer brands, media outlets).
  - Sponsors fund real prizes (e.g., Premier League tickets, retro shirts, gaming consoles) in exchange for title sponsorship and direct in-app exposure.

---

## 📋 Suggested Implementation Phases

| Phase | Focus | Key Deliverables |
| :--- | :--- | :--- |
| **Phase A** | **Social Auth & Profile Pictures** | Google, Apple, Facebook OAuth, auto profile picture syncing, 1-tap onboarding |
| **Phase B** | **Mobile Web Polish & PWA** | PWA manifest, app icons, touch optimizations, offline fallback |
| **Phase C** | **Matchday Live Hub** | Live matchday screen, real-time score badges, live leaderboard rollups |
| **Phase D** | **Automated Alerts & Digest** | Gameweek deadline reminders, WhatsApp nudge improvements, recap digest |
| **Phase E** | **React Native / Expo App** | Expo cross-platform app, native push notifications, App Store / TestFlight |
| **Phase F** | **Monetization: GroupBet Pro** | Player caps, Commissioner Pass, custom branding, Stripe / Apple IAP |
| **Phase G** | **Affiliate & B2B Venues** | TV display mode for pubs, odds deep-links, sponsored tournament jackpots |


