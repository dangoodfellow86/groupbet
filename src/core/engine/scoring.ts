import {
  MatchOutcome,
  MarketType,
  PickResult,
  PredictorLeagueSettings,
} from '../types/database';

export const DEFAULT_PREDICTOR_POINTS = {
  EXACT_SCORE: 3,
  OUTCOME: 1,
  BTTS: 1,
  OVER_UNDER_2_5: 1,
} as const;

/**
 * Determine match outcome from scores.
 */
export function getMatchOutcome(
  homeScore: number,
  awayScore: number
): MatchOutcome {
  if (homeScore > awayScore) return 'HOME';
  if (awayScore > homeScore) return 'AWAY';
  return 'DRAW';
}

/**
 * Determine if both teams scored.
 */
export function isBothTeamsScored(homeScore: number, awayScore: number): boolean {
  return homeScore > 0 && awayScore > 0;
}

/**
 * Determine if match was over 2.5 goals.
 */
export function isOver2_5Goals(homeScore: number, awayScore: number): boolean {
  return homeScore + awayScore > 2.5;
}

/**
 * Evaluate points awarded for a specific predictor pick.
 */
export function evaluatePredictorPick(params: {
  market: MarketType;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  predictedOutcome?: string | null;
  actualHomeScore: number;
  actualAwayScore: number;
  settings?: PredictorLeagueSettings;
}): number {
  const {
    market,
    predictedHomeScore,
    predictedAwayScore,
    predictedOutcome,
    actualHomeScore,
    actualAwayScore,
    settings,
  } = params;

  const pointsConfig = {
    exactScore: settings?.points_exact_score ?? DEFAULT_PREDICTOR_POINTS.EXACT_SCORE,
    outcome: settings?.points_outcome ?? DEFAULT_PREDICTOR_POINTS.OUTCOME,
    btts: settings?.points_btts ?? DEFAULT_PREDICTOR_POINTS.BTTS,
    overUnder: settings?.points_over_under ?? DEFAULT_PREDICTOR_POINTS.OVER_UNDER_2_5,
  };

  switch (market) {
    case 'EXACT_SCORE': {
      if (
        predictedHomeScore === actualHomeScore &&
        predictedAwayScore === actualAwayScore
      ) {
        return pointsConfig.exactScore;
      }
      return 0;
    }

    case 'OUTCOME': {
      const actualOutcome = getMatchOutcome(actualHomeScore, actualAwayScore);
      if (predictedOutcome?.toUpperCase() === actualOutcome) {
        return pointsConfig.outcome;
      }
      return 0;
    }

    case 'BTTS': {
      const actualBtts = isBothTeamsScored(actualHomeScore, actualAwayScore);
      const isYes = predictedOutcome?.toUpperCase() === 'YES';
      const isNo = predictedOutcome?.toUpperCase() === 'NO';
      if ((isYes && actualBtts) || (isNo && !actualBtts)) {
        return pointsConfig.btts;
      }
      return 0;
    }

    case 'OVER_UNDER_2_5': {
      const actualOver = isOver2_5Goals(actualHomeScore, actualAwayScore);
      const isOver = predictedOutcome?.toUpperCase() === 'OVER';
      const isUnder = predictedOutcome?.toUpperCase() === 'UNDER';
      if ((isOver && actualOver) || (isUnder && !actualOver)) {
        return pointsConfig.overUnder;
      }
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Evaluate LMS pick outcome.
 * Chosen club must win outright. Draws or defeats result in LOST_LIFE.
 */
export function evaluateLmsPick(params: {
  pickedTeamId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  isPostponedOrCancelled?: boolean;
}): PickResult {
  if (params.isPostponedOrCancelled) {
    return 'VOID';
  }

  const { pickedTeamId, homeTeamId, awayTeamId, homeScore, awayScore } = params;

  let winningTeamId: string | null = null;
  if (homeScore > awayScore) {
    winningTeamId = homeTeamId;
  } else if (awayScore > homeScore) {
    winningTeamId = awayTeamId;
  }

  if (winningTeamId && winningTeamId === pickedTeamId) {
    return 'SURVIVED';
  }

  return 'LOST_LIFE';
}
