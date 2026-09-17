import assert from 'node:assert/strict';
import {
  generateInviteShareText,
  generateDeadlineNudgeText,
  generateStandingsShareText,
  getWhatsAppShareUrl,
} from './sharing';

function runTests() {
  console.log('🧪 Starting WhatsApp & Social Sharing Tests...\n');

  // 1. Test Invite Share Text
  console.log('1. Testing generateInviteShareText...');
  const inviteText = generateInviteShareText({
    leagueName: 'Premier League Legends',
    inviteCode: 'GB-K92NZ',
    joinUrl: 'https://groupbet.app/join/GB-K92NZ',
    leagueType: 'ALL_IN_ONE',
  });

  assert.ok(inviteText.includes('Premier League Legends'), 'Should include league name');
  assert.ok(inviteText.includes('GB-K92NZ'), 'Should include invite code');
  assert.ok(inviteText.includes('https://groupbet.app/join/GB-K92NZ'), 'Should include join link');
  assert.ok(inviteText.includes('Last Man Standing & Premier League Predictor'), 'Should include mode description');
  console.log('   ✅ Invite share text generated properly');

  // 2. Test Deadline Nudge Text
  console.log('\n2. Testing generateDeadlineNudgeText...');
  const nudgeText = generateDeadlineNudgeText({
    leagueName: 'Friday Night Pub League',
    gameweekNumber: 5,
    deadlineFormatted: 'Saturday 12:30 PM',
    timeLeftFormatted: '2 hours 15 mins',
    joinUrl: 'https://groupbet.app/join/GB-TEST1',
  });

  assert.ok(nudgeText.includes('DEADLINE ALERT'), 'Should include deadline alert header');
  assert.ok(nudgeText.includes('*Gameweek 5 Deadline:* Saturday 12:30 PM'), 'Should include gameweek deadline');
  assert.ok(nudgeText.includes('*Time Left:* 2 hours 15 mins'), 'Should include time remaining');
  assert.ok(nudgeText.includes('https://groupbet.app/join/GB-TEST1'), 'Should include direct link');
  console.log('   ✅ Deadline nudge text generated properly');

  // 3. Test Standings Share Text
  console.log('\n3. Testing generateStandingsShareText...');
  const standingsText = generateStandingsShareText({
    leagueName: 'Premier Clash',
    gameweekNumber: 5,
    standings: [
      { rank: 1, name: 'Alice', score: '24 pts', extra: '3 exact' },
      { rank: 2, name: 'Bob', score: '19 pts' },
      { rank: 3, name: 'Charlie', score: '16 pts' },
      { rank: 4, name: 'Dave', score: '12 pts' },
    ],
    joinUrl: 'https://groupbet.app/join/GB-TEST1',
  });

  assert.ok(standingsText.includes('🥇 Alice — 24 pts (3 exact)'), 'Should format 1st place with medal and score');
  assert.ok(standingsText.includes('🥈 Bob — 19 pts'), 'Should format 2nd place with medal');
  assert.ok(standingsText.includes('🥉 Charlie — 16 pts'), 'Should format 3rd place with medal');
  assert.ok(standingsText.includes('4. Dave — 12 pts'), 'Should format 4th place with number');
  console.log('   ✅ Standings share text generated properly');

  // 4. Test WhatsApp URL encoding
  console.log('\n4. Testing getWhatsAppShareUrl...');
  const url = getWhatsAppShareUrl(nudgeText);
  assert.ok(url.startsWith('https://wa.me/?text='), 'Should start with WhatsApp API base URL');
  assert.ok(url.includes(encodeURIComponent('DEADLINE ALERT')), 'Should encode special characters safely');
  console.log('   ✅ WhatsApp URL correctly encoded');

  console.log('\n✨ All WhatsApp & Sharing Tests Passed successfully!\n');
}

runTests();
