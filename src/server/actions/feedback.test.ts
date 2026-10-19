import assert from 'node:assert/strict';
import { pool, query } from '../db/pool';
import { submitUserFeedback } from './feedback';
import {
  buildSupportMailtoUrl,
  SUPPORT_EMAIL_ADDRESS,
} from '../../lib/feedback-mailto';

async function runTests() {
  console.log('🧪 Starting Player Feedback & Support Test Suite...\n');

  const createdFeedbackIds: string[] = [];
  let testUserId: string | null = null;

  try {
    // 1. Test input validation constraints
    console.log('1. Testing submitUserFeedback validation constraints...');
    const shortMsgRes = await submitUserFeedback({
      category: 'BUG_REPORT',
      message: 'Hi',
    });
    assert.equal(shortMsgRes.success, false, 'Should reject message shorter than 5 characters');

    const badRatingRes = await submitUserFeedback({
      category: 'GENERAL_FEEDBACK',
      message: 'Really enjoying the new Championship fixtures!',
      rating: 6,
    });
    assert.equal(badRatingRes.success, false, 'Should reject rating outside 1..5');

    const badEmailRes = await submitUserFeedback({
      category: 'FEATURE_REQUEST',
      message: 'Could we add FA Cup rounds too?',
      contactEmail: 'not-an-email',
    });
    assert.equal(badEmailRes.success, false, 'Should reject malformed contact email');
    console.log('   ✅ Validation constraints verified');

    // 2. Test submitting feedback as an authenticated user
    console.log('\n2. Testing submitUserFeedback persistence for a registered player...');
    const userRes = await query<{ id: string }>(
      `INSERT INTO users (auth_id, display_name, email)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`fb_test_${Date.now()}`, 'Feedback Tester', `fb_${Date.now()}@example.com`]
    );
    testUserId = userRes.rows[0].id;

    const validRes = await submitUserFeedback({
      category: 'FEATURE_REQUEST',
      message: 'Love the new picked games filter in Match Predictor! Would love dark mode themes.',
      rating: 5,
      userId: testUserId,
      pageUrl: 'https://www.squadpicks.co.uk/',
      skipEmailForwarding: true,
    });

    assert.equal(validRes.success, true, 'Valid feedback submission should succeed');
    assert.ok(validRes.feedbackId, 'Should return a feedbackId UUID');
    createdFeedbackIds.push(validRes.feedbackId!);

    const dbRow = await query<{
      user_id: string;
      display_name: string;
      contact_email: string;
      category: string;
      rating: number;
      message: string;
      status: string;
    }>(`SELECT * FROM public.user_feedback WHERE id = $1`, [validRes.feedbackId]);

    assert.equal(dbRow.rowCount, 1);
    assert.equal(dbRow.rows[0].user_id, testUserId);
    assert.equal(dbRow.rows[0].display_name, 'Feedback Tester');
    assert.equal(dbRow.rows[0].category, 'FEATURE_REQUEST');
    assert.equal(dbRow.rows[0].rating, 5);
    assert.equal(dbRow.rows[0].status, 'NEW');
    console.log('   ✅ Feedback persisted in public.user_feedback with rating & user metadata');

    // 3. Test buildSupportMailtoUrl formatting for support@squadpicks.co.uk
    console.log('\n3. Testing buildSupportMailtoUrl for support@squadpicks.co.uk...');
    const mailto = buildSupportMailtoUrl({
      category: 'BUG_REPORT',
      message: 'Found a display glitch on mobile Safari.',
      displayName: 'Dan',
      contactEmail: 'dan@example.com',
      leagueName: 'Sunday Lads LMS',
      rating: 4,
    });

    assert.equal(
      mailto.startsWith(`mailto:${SUPPORT_EMAIL_ADDRESS}?`),
      true,
      `Mailto URL should start with mailto:${SUPPORT_EMAIL_ADDRESS}?`
    );
    assert.equal(mailto.includes('Bug%20Report'), true, 'Mailto subject should include Bug Report');
    assert.equal(
      mailto.includes('Sunday%20Lads%20LMS'),
      true,
      'Mailto body should include active league context'
    );
    console.log('   ✅ Mailto URL properly formatted for support@squadpicks.co.uk');

    console.log('\n✨ All Player Feedback & Support Tests Passed successfully!');
  } finally {
    if (createdFeedbackIds.length > 0) {
      await query(`DELETE FROM public.user_feedback WHERE id = ANY($1::uuid[])`, [
        createdFeedbackIds,
      ]);
    }
    if (testUserId) {
      await query(`DELETE FROM public.users WHERE id = $1`, [testUserId]);
    }
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('❌ Feedback test failed:', err);
  process.exit(1);
});
