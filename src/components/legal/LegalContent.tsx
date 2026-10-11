import React from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  Mail,
  ExternalLink,
  Cookie,
  AlertTriangle,
  Scale,
  Users,
  Trophy,
} from 'lucide-react';

export interface LegalContentProps {
  section: 'terms' | 'privacy';
}

export function LegalContent({ section }: LegalContentProps) {
  if (section === 'privacy') {
    return (
      <div className="space-y-8 text-neutral-300 text-sm leading-relaxed">
        {/* Header Summary */}
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-neutral-100 text-sm">SquadPicks Privacy Commitment</h3>
            <p className="text-xs text-neutral-400">
              We respect your privacy. SquadPicks collects only the minimal data necessary to run friendly football prediction tournaments. We do not sell your personal data, and we do not use third-party advertising or behavioral tracking cookies.
            </p>
            <div className="text-[11px] text-emerald-400 font-mono pt-1">
              Last updated: October 2026 • Governed by UK GDPR & Data Protection Act 2018
            </div>
          </div>
        </div>

        {/* 1. Data Controller */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">1</span>
            <h4>Data Controller & Contact Information</h4>
          </div>
          <p>
            SquadPicks (<a href="https://www.squadpicks.co.uk" className="text-emerald-400 hover:underline">www.squadpicks.co.uk</a>) is the data controller responsible for your personal information. If you have questions regarding this Privacy Policy, your rights under the UK GDPR, or wish to exercise data rights, please contact our team:
          </p>
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2 text-xs">
            <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Email: </span>
            <a href="mailto:support@squadpicks.co.uk" className="text-emerald-400 font-mono hover:underline">
              support@squadpicks.co.uk
            </a>
          </div>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">2</span>
            <h4>Information We Collect</h4>
          </div>
          <p>Depending on how you use SquadPicks, we collect and process the following categories of data:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-400">
            <li>
              <strong className="text-neutral-200">Account & Profile Information:</strong> Display name, email address (optional for guest players), custom profile photo uploads, club badge selections, and Google profile details (such as account ID, full name, and avatar picture if you choose to sign in via Google OAuth).
            </li>
            <li>
              <strong className="text-neutral-200">Game & Tournament Data:</strong> League memberships, Last Man Standing team selections, Match Predictor scorelines and outcomes, points scored, leaderboard positions, and unlocked trophy badges.
            </li>
            <li>
              <strong className="text-neutral-200">Guest Session Identifiers:</strong> Randomly generated anonymous identifiers stored in session cookies to maintain your tournament picks on your device if you play without registering.
            </li>
            <li>
              <strong className="text-neutral-200">Technical & Operational Data:</strong> Standard server logs (IP address, browser user-agent, timestamp) collected strictly for cybersecurity, abuse prevention, and rate-limiting.
            </li>
          </ul>
        </section>

        {/* 3. Purpose & Lawful Basis */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">3</span>
            <h4>How We Use Your Data & Lawful Basis</h4>
          </div>
          <p>We process your data under the following lawful bases under the UK GDPR:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="font-bold text-neutral-200 block">Performance of Service (Contract)</span>
              <p className="text-neutral-400">
                To create your account, enroll you in private leagues, record and lock your gameweek predictions, settle match outcomes, and calculate leaderboard standings.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="font-bold text-neutral-200 block">Legitimate Interests</span>
              <p className="text-neutral-400">
                To maintain tournament integrity, prevent duplicate voting or fraudulent entries, enable multi-device sync, and monitor server health.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="font-bold text-neutral-200 block">Consent</span>
              <p className="text-neutral-400">
                Where you explicitly upload a personal profile picture from your camera/device or choose to link a Google OAuth account.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
              <span className="font-bold text-neutral-200 block">Legal Compliance</span>
              <p className="text-neutral-400">
                To fulfill our legal, accounting, and regulatory obligations under applicable UK legislation.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Cookies & Local Storage */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">4</span>
            <h4>Cookies & Session Storage</h4>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
            <Cookie className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-neutral-300">
              <p className="font-semibold text-neutral-200">Strictly Essential Cookies Only</p>
              <p className="text-neutral-400">
                SquadPicks uses only essential first-party cookies necessary for authentication and session continuity:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-neutral-400 font-mono text-[11px] pt-1">
                <li><strong className="text-neutral-300 font-sans">gb_user_id:</strong> Secure session token identifying your active player profile.</li>
                <li><strong className="text-neutral-300 font-sans">gb_user_name:</strong> Client-readable cookie to instantly display your name in the navigation header without delay.</li>
                <li><strong className="text-neutral-300 font-sans">sb-*-auth-token:</strong> Supabase authentication JWT token maintaining secure logged-in sessions.</li>
              </ul>
              <p className="text-emerald-400 font-semibold pt-1">
                We do NOT use third-party advertising, remarketing, or behavioral tracking cookies.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Third-Party Sub-Processors */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">5</span>
            <h4>Third-Party Sub-Processors & Data Sharing</h4>
          </div>
          <p>
            We do not sell, rent, or trade your personal data. We utilize trusted infrastructure service providers to operate SquadPicks:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-400">
            <li>
              <strong className="text-neutral-200">Supabase Inc.:</strong> Managed PostgreSQL database hosting, user authentication, and secure cloud storage for custom avatar pictures (`avatars` bucket).
            </li>
            <li>
              <strong className="text-neutral-200">Football-Data.org:</strong> Sports data provider for Premier League match fixture schedules, live scores, and official standings. No personal player data is transmitted to Football-Data.org.
            </li>
            <li>
              <strong className="text-neutral-200">Cloud Hosting & CDN (e.g. Vercel):</strong> Application deployment and content delivery network infrastructure with edge security.
            </li>
          </ul>
        </section>

        {/* 6. Data Retention */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">6</span>
            <h4>Data Retention & Account Deletion</h4>
          </div>
          <p>
            We retain player account data and game history for as long as your account remains active or as needed to maintain group tournament leaderboards for the season. You may at any time request the complete deletion of your account, picks, and uploaded avatar images by emailing <a href="mailto:support@squadpicks.co.uk" className="text-emerald-400 hover:underline">support@squadpicks.co.uk</a>. Upon verified request, all personal data is permanently deleted from our primary database within 30 days.
          </p>
        </section>

        {/* 7. Your Legal Rights (UK GDPR) */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">7</span>
            <h4>Your Rights Under the UK GDPR</h4>
          </div>
          <p>Under UK data protection law, you possess key rights regarding your information:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300">
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block mb-0.5">Right of Access</strong>
              Request a copy of the personal information we hold about you.
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block mb-0.5">Right to Rectification</strong>
              Update or correct your display name and avatar directly via the Profile Editor.
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block mb-0.5">Right to Erasure</strong>
              Request deletion of your profile and data (&quot;Right to be Forgotten&quot;).
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block mb-0.5">Right to Data Portability</strong>
              Request your tournament predictions and metrics in a structured digital format.
            </div>
          </div>
          <p className="text-xs text-neutral-400 pt-1">
            You also have the right to lodge a complaint with the UK Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-0.5">ico.org.uk <ExternalLink className="w-2.5 h-2.5" /></a> if you believe your data has been handled unfairly.
          </p>
        </section>

        {/* 8. Data Security */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">8</span>
            <h4>Data Security & Encryption</h4>
          </div>
          <p>
            We implement strict technical and organizational safeguards including HTTPS/TLS encryption in transit, Postgres Row Level Security (RLS) policies isolating user records, scoped database connection pooling, and secure HTTP-only cookies to protect against unauthorized access or disclosure.
          </p>
        </section>

        {/* 9. Children's Privacy */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">9</span>
            <h4>Children&apos;s Privacy</h4>
          </div>
          <p>
            SquadPicks is not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal data without parental consent, please contact us at <a href="mailto:support@squadpicks.co.uk" className="text-emerald-400 hover:underline">support@squadpicks.co.uk</a> so we can delete such records.
          </p>
        </section>
      </div>
    );
  }

  // Terms of Service Content
  return (
    <div className="space-y-8 text-neutral-300 text-sm leading-relaxed">
      {/* Header Summary */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-3">
        <Scale className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-neutral-100 text-sm">SquadPicks Terms of Service</h3>
          <p className="text-xs text-neutral-400">
            Please read these terms carefully before participating in SquadPicks games. By accessing or using our platform, you agree to be bound by these Terms of Service.
          </p>
          <div className="text-[11px] text-amber-400 font-mono pt-1">
            Last updated: October 2026 • Governing Law: England &amp; Wales
          </div>
        </div>
      </div>

      {/* 1. Acceptance */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">1</span>
          <h4>Agreement to Terms</h4>
        </div>
        <p>
          These Terms of Service constitute a legally binding agreement between you and SquadPicks (<a href="https://www.squadpicks.co.uk" className="text-emerald-400 hover:underline">www.squadpicks.co.uk</a>). By creating an account, joining a game using an invite code, or making a match prediction, you acknowledge that you have read, understood, and agree to these Terms. If you do not agree, you must discontinue using SquadPicks.
        </p>
      </section>

      {/* 2. Strictly Non-Gambling Notice */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">2</span>
          <h4>Strictly Free-to-Play &amp; Non-Gambling Disclaimer</h4>
        </div>
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Important Legal Notice</span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <strong>SquadPicks is NOT a gambling operator, bookmaker, or betting exchange.</strong> The platform is designed solely as an entertainment and tournament organization tool for friendly social competition among friends, work colleagues, and communities.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-neutral-400">
            <li>SquadPicks does not accept, hold, process, or pay out real money, stakes, or financial wagers.</li>
            <li>No deposits, entry fees, or financial transactions are conducted on or through SquadPicks.</li>
            <li>Any private, informal side-arrangements or friendly agreements made between players take place entirely outside the platform; SquadPicks bears zero involvement, oversight, or liability for external arrangements.</li>
          </ul>
        </div>
      </section>

      {/* 3. Description of Service */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">3</span>
          <h4>Description of the Service</h4>
        </div>
        <p>
          SquadPicks provides automated management tools for Premier League football games, including:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-neutral-400">
          <li>
            <strong className="text-neutral-200">Last Man Standing (LMS):</strong> Players select one winning team per gameweek. If the team wins, the player survives; a draw or defeat results in the loss of a life. Under LMS rules, each team may only be selected once per tournament cycle (&quot;burned team&quot; rule).
          </li>
          <li>
            <strong className="text-neutral-200">Match Predictor:</strong> Players forecast exact scores, match outcomes (Home / Draw / Away), Both Teams to Score (BTTS), and Over/Under 2.5 goals across scheduled fixtures. Points are awarded based on standardized scoring rules.
          </li>
          <li>
            <strong className="text-neutral-200">Private Leagues &amp; Invite Codes:</strong> League creators (&quot;Commissioners&quot;) can create customized tournaments, invite friends via WhatsApp or private links, and configure tournament rules (e.g., Exclusive Pick claims).
          </li>
        </ul>
      </section>

      {/* 4. Game Rules & Deadlines */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">4</span>
          <h4>Deadlines, Pick Locks &amp; Settlement</h4>
        </div>
        <p>To ensure fair competition across all leagues, the following rules are strictly enforced:</p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-400">
          <li><strong className="text-neutral-200">Kickoff Deadlines:</strong> Predictions and team picks for any individual fixture lock strictly at the match&apos;s scheduled kickoff time. Late submissions or edits are impossible once kickoff passes.</li>
          <li><strong className="text-neutral-200">Exclusive Pick Rules:</strong> Where a league commissioner activates Exclusive Pick rules, the first player to submit a selection locks that team/fixture for the gameweek; other players must select alternate matches.</li>
          <li><strong className="text-neutral-200">Settlement Data:</strong> Match scores and settlement calculations are populated from official live match feeds provided via Football-Data.org. Postponed, abandoned, or rescheduled matches are handled in accordance with standard sporting guidelines.</li>
        </ul>
      </section>

      {/* 5. User Conduct & Avatar Studio */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">5</span>
          <h4>User Conduct &amp; Avatar Studio Guidelines</h4>
        </div>
        <p>When participating on SquadPicks, you agree not to:</p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-400">
          <li>Use display names or upload avatar images containing hate speech, obscenity, defamation, harassment, or infringing material.</li>
          <li>Deploy automated bots, scrapers, or scripts to manipulate tournament leaderboards or spam server endpoints.</li>
          <li>Attempt to circumvent security controls, Row Level Security, or access other users&apos; accounts.</li>
        </ul>
        <p className="text-xs text-neutral-400">
          SquadPicks reserves the right to remove offensive display names, reset custom avatars, or terminate tournament access for repeated violations.
        </p>
      </section>

      {/* 6. Intellectual Property & Trademarks */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">6</span>
          <h4>Intellectual Property &amp; Football Trademark Disclaimer</h4>
        </div>
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs text-neutral-400">
          <p>
            <strong className="text-neutral-200">Premier League Disclaimer:</strong> SquadPicks is an independent website and is NOT affiliated with, sponsored by, or endorsed by The Football Association Premier League Ltd (&quot;Premier League&quot;) or any of its constituent football clubs.
          </p>
          <p>
            All football team names, club badges, crests, logos, and competition titles are the registered trademarks and copyright of their respective owners. Their presence on SquadPicks is used solely under nominative fair use for descriptive and identification purposes in connection with social match predictions.
          </p>
          <p>
            The SquadPicks brand, logo, website design, and proprietary scoring software are the exclusive intellectual property of SquadPicks.
          </p>
        </div>
      </section>

      {/* 7. Disclaimer of Warranties & Liability */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">7</span>
          <h4>Disclaimer of Warranties &amp; Limitation of Liability</h4>
        </div>
        <p className="text-xs text-neutral-400">
          SquadPicks is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. While we strive for 100% matchday uptime and accurate live score feeds, SquadPicks does not guarantee uninterrupted service, instantaneous realtime delivery during high-traffic matches, or error-free operation. To the maximum extent permitted by English law, SquadPicks and its creators shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the service.
        </p>
      </section>

      {/* 8. Modifications & Governing Law */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-neutral-100 font-bold text-base">
          <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center text-xs font-mono">8</span>
          <h4>Modifications &amp; Governing Law</h4>
        </div>
        <p>
          We may update these Terms from time to time. Continued use of SquadPicks after updates are published constitutes acceptance of the amended terms. These Terms are governed by and construed in accordance with the laws of <strong className="text-neutral-200">England and Wales</strong>, and any disputes shall be subject to the exclusive jurisdiction of the English courts.
        </p>
        <div className="pt-2 text-xs text-neutral-400">
          Questions or concerns? Contact our team at <a href="mailto:support@squadpicks.co.uk" className="text-emerald-400 font-mono hover:underline">support@squadpicks.co.uk</a>.
        </div>
      </section>
    </div>
  );
}
