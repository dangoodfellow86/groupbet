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

---

### 4. Progressive Web App (PWA) Installability (Web Quick-Win)
> **Goal:** Provide an immediate app-like mobile experience on web while React Native is developed.

- **Add to Home Screen (A2HS):**
  - Web App Manifest (`manifest.json`), service worker, and home screen icons for iOS & Android.
- **Standalone Display:**
  - Runs without browser address bars for a full-screen native feel.
- **Web Push API:**
  - Browser-based lock screen notifications on supported devices.

---

### 5. Tournament Variations & Strategic Power-Ups
> **Goal:** Retain players even if they fall behind early in a long 38-game season.

- **Predictor Power-Ups (1–2 single-use tokens per season):**
  - **Double Down:** 2x points for 1 selected match.
  - **Draw Insurance:** If your chosen team draws, you still receive partial points.
- **LMS Buybacks / Second Chance Pot:**
  - Configurable commissioner rule allowing eliminated players to re-enter before GW 10 by paying into a shared pot.
- **Prize & Stake Tracker:**
  - Commissioner bookkeeping tool to track entry fees, payout splits (1st, 2nd, highest single-gameweek score), and member payment statuses (Paid / Pending).

---

### 6. Team & Match Analytics / Form Guide
> **Goal:** Help players make smart picks without having to leave the app.

- **Recent Form Badges:**
  - Last 5 matches (W/D/L) displayed directly on fixture cards.
- **Head-to-Head & Popularity Trends:**
  - Show group consensus percentages (e.g. *"70% of players picked Man City this week"*).
- **Rival Head-to-Head Statistics:**
  - Profile comparison tab: *"You vs Dave: Dave leads 3–2 across 5 gameweeks"*.

---

## 📋 Suggested Implementation Phases

| Phase | Focus | Key Deliverables |
| :--- | :--- | :--- |
| **Phase A** | **Mobile Web Polish & PWA** | PWA manifest, app icons, touch optimizations, offline fallback |
| **Phase B** | **Matchday Live Hub** | Live matchday screen, real-time score badges, live leaderboard rollups |
| **Phase C** | **Automated Alerts & Digest** | Gameweek deadline reminders, WhatsApp nudge improvements, recap digest |
| **Phase D** | **React Native / Expo App** | Expo cross-platform app, native push notifications, App Store / TestFlight |
| **Phase E** | **Social Banter & Power-Ups** | In-league activity feed, reactions, predictor power-ups, pot tracker |
