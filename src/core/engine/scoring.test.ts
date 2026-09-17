import {
  getMatchOutcome,
  isBothTeamsScored,
  isOver2_5Goals,
  evaluatePredictorPick,
  evaluateLmsPick,
} from './scoring';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('--- Running Pure Scoring Engine Tests ---');

// Test 1: Match Outcome
assert(getMatchOutcome(2, 1) === 'HOME', '2-1 should be HOME win');
assert(getMatchOutcome(0, 3) === 'AWAY', '0-3 should be AWAY win');
assert(getMatchOutcome(2, 2) === 'DRAW', '2-2 should be DRAW');
console.log('✓ Match Outcome tests passed');

// Test 2: BTTS & Over 2.5
assert(isBothTeamsScored(2, 1) === true, '2-1 is BTTS');
assert(isBothTeamsScored(2, 0) === false, '2-0 is NOT BTTS');
assert(isOver2_5Goals(2, 1) === true, '3 goals is over 2.5');
assert(isOver2_5Goals(1, 1) === false, '2 goals is under 2.5');
console.log('✓ BTTS and Over/Under tests passed');

// Test 3: Predictor Exact Score
assert(
  evaluatePredictorPick({
    market: 'EXACT_SCORE',
    predictedHomeScore: 2,
    predictedAwayScore: 1,
    actualHomeScore: 2,
    actualAwayScore: 1,
  }) === 3,
  'Exact score should award 3 points'
);
assert(
  evaluatePredictorPick({
    market: 'EXACT_SCORE',
    predictedHomeScore: 2,
    predictedAwayScore: 0,
    actualHomeScore: 2,
    actualAwayScore: 1,
  }) === 0,
  'Wrong exact score should award 0 points'
);
console.log('✓ Predictor Exact Score tests passed');

// Test 4: Predictor Outcome
assert(
  evaluatePredictorPick({
    market: 'OUTCOME',
    predictedOutcome: 'HOME',
    actualHomeScore: 3,
    actualAwayScore: 1,
  }) === 1,
  'Correct OUTCOME should award 1 point'
);
assert(
  evaluatePredictorPick({
    market: 'OUTCOME',
    predictedOutcome: 'DRAW',
    actualHomeScore: 3,
    actualAwayScore: 1,
  }) === 0,
  'Incorrect OUTCOME should award 0 points'
);
console.log('✓ Predictor Outcome tests passed');

// Test 5: Predictor BTTS
assert(
  evaluatePredictorPick({
    market: 'BTTS',
    predictedOutcome: 'YES',
    actualHomeScore: 1,
    actualAwayScore: 1,
  }) === 1,
  'BTTS YES with 1-1 should award 1 point'
);
assert(
  evaluatePredictorPick({
    market: 'BTTS',
    predictedOutcome: 'NO',
    actualHomeScore: 2,
    actualAwayScore: 0,
  }) === 1,
  'BTTS NO with 2-0 should award 1 point'
);
console.log('✓ Predictor BTTS tests passed');

// Test 6: Predictor Over/Under 2.5
assert(
  evaluatePredictorPick({
    market: 'OVER_UNDER_2_5',
    predictedOutcome: 'OVER',
    actualHomeScore: 2,
    actualAwayScore: 2,
  }) === 1,
  'OVER with 4 goals should award 1 point'
);
assert(
  evaluatePredictorPick({
    market: 'OVER_UNDER_2_5',
    predictedOutcome: 'UNDER',
    actualHomeScore: 1,
    actualAwayScore: 0,
  }) === 1,
  'UNDER with 1 goal should award 1 point'
);
console.log('✓ Predictor Over/Under tests passed');

// Test 7: LMS Pick Evaluation
const teamArsenal = 'arsenal-uuid';
const teamChelsea = 'chelsea-uuid';

// Arsenal wins 2-1, picked Arsenal -> SURVIVED
assert(
  evaluateLmsPick({
    pickedTeamId: teamArsenal,
    homeTeamId: teamArsenal,
    awayTeamId: teamChelsea,
    homeScore: 2,
    awayScore: 1,
  }) === 'SURVIVED',
  'LMS: Arsenal win should survive'
);

// Arsenal draws 1-1, picked Arsenal -> LOST_LIFE (draws cost life in LMS)
assert(
  evaluateLmsPick({
    pickedTeamId: teamArsenal,
    homeTeamId: teamArsenal,
    awayTeamId: teamChelsea,
    homeScore: 1,
    awayScore: 1,
  }) === 'LOST_LIFE',
  'LMS: Arsenal draw should cost a life'
);

// Chelsea wins 0-1, picked Arsenal -> LOST_LIFE
assert(
  evaluateLmsPick({
    pickedTeamId: teamArsenal,
    homeTeamId: teamArsenal,
    awayTeamId: teamChelsea,
    homeScore: 0,
    awayScore: 1,
  }) === 'LOST_LIFE',
  'LMS: Arsenal defeat should cost a life'
);

// Match postponed -> VOID
assert(
  evaluateLmsPick({
    pickedTeamId: teamArsenal,
    homeTeamId: teamArsenal,
    awayTeamId: teamChelsea,
    homeScore: 0,
    awayScore: 0,
    isPostponedOrCancelled: true,
  }) === 'VOID',
  'LMS: Postponed match should be VOID'
);
console.log('✓ LMS Pick tests passed');

console.log('All 7 engine test suites passed successfully!');
