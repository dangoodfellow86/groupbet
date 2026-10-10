# SquadPicks — Product Backlog & Active Tasks

## 🚀 Next Up (Ready for Tomorrow)

### 👤 Player Profile Customization & Avatar Studio
- **Status:** 📋 Ready for Implementation (Approved Plan)
- **Design Decisions & Confirmed Scope:**
  1. **Display Name Editing:**
     - In-place text input in `<ProfileModal />` with live character counter (2–30 characters) and validation.
     - Immediate reflection across all leaderboards, survivor boards, matchday hub, and top navigation.
  2. **Custom Avatar / Photo Upload:**
     - Upload from device or camera (`image/*`).
     - Client-side auto-crop & compression via HTML5 Canvas into a clean 256x256 square WebP thumbnail (~15–30 KB).
     - Storage in Supabase Storage `avatars` bucket with public CDN URLs.
     - Graceful offline / data-URL fallback.
  3. **Premier League Club Badges Gallery:**
     - 20-club Premier League crest picker grid so players can rep their team as their profile avatar.
  4. **Fun DiceBear Avatar Randomizer:**
     - Preset avatar styles (`bottts`, `adventurer`, `fun-emoji`, `pixel-art`) with a "🎲 Roll Random Avatar" button.
  5. **Google Photo Integration:**
     - "Use Google Account Photo" button for users authenticated via Google OAuth.
  6. **Google OAuth Conflict Safeguard:**
     - Track `custom_avatar = true` in PostgreSQL.
     - When an existing player logs in via Google, their custom avatar is never overwritten.
  7. **Guest & Authenticated Support:**
     - Works for both guest cookie sessions and authenticated accounts.
     - Preserves custom avatars during guest-to-registered account claiming.

#### Implementation Checklist for Tomorrow:
- [ ] **1. Database & Storage Migration (`007_user_profile_customization.sql`):**
  - Add `custom_avatar BOOLEAN DEFAULT FALSE` to `users`.
  - Ensure public `avatars` bucket exists in `storage.buckets`.
  - Add RLS policies on `storage.objects` for public reads and uploads.
- [ ] **2. Data Types (`src/core/types/database.ts`):**
  - Add `custom_avatar?: boolean` to `User` interface.
- [ ] **3. Server Actions (`src/server/actions/profile.ts`):**
  - Implement `updateUserProfile(input: UpdateUserProfileInput): Promise<UpdateUserProfileResult>`.
  - Implement `getPremierLeagueClubBadges(): Promise<Array<{ id: string; name: string; shortName: string; tla: string; crestUrl: string }>>`.
- [ ] **4. OAuth Preservation (`src/server/actions/auth.ts`):**
  - In `syncAuthenticatedUser`, respect `user.custom_avatar` so Google logins don't overwrite custom avatars.
- [ ] **5. Profile Modal UI (`src/components/ProfileModal.tsx`):**
  - Add "Edit Profile" button to profile banner.
  - Build interactive Edit Profile view with Display Name input and avatar selector tabs (📷 Upload, 🛡️ Club Badges, 🎲 Fun Avatars, 🌐 Google Photo).
  - Add client-side canvas square image compressor.
- [ ] **6. Navigation Shortcut (`src/components/UserProfileMenu.tsx`):**
  - Add "Edit Profile" shortcut item that opens `<ProfileModal />` directly in edit mode.
- [ ] **7. Session Hook (`src/hooks/useUserSession.ts`):**
  - Add `updateProfile` helper method for instant local state sync.
- [ ] **8. Automated Tests & Verification:**
  - Update `src/server/actions/profile.test.ts` to test profile updates, name validation, and custom avatar flags.
  - Update `src/server/actions/auth.test.ts` to verify Google OAuth preservation.
  - Run `npm test`, `npx tsc --noEmit`, and `npm run build`.

---

## 🔮 Future Backlog (Prioritized)

1. **Sign in with Apple & Biometric Login**
   - Native Apple OAuth with FaceID / TouchID support.
   - Private relay email support.
2. **PWA Installability & Offline Shell**
   - Web App Manifest (`manifest.json`), service worker, and home screen icon badges.
3. **Automated WhatsApp Nudges & Deadline Reminders**
   - 24-hour and 2-hour pre-kickoff deadline alerts.
   - Automated gameweek recap debrief.
4. **React Native (Expo) Native App**
   - Shared Supabase backend, native push notifications via APNs and FCM.
