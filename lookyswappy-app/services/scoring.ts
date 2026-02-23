/**
 * Scoring Logic Service
 *
 * Implements Lookyswappy scoring rules including the multiple-of-25 bonus.
 *
 * Rules:
 * - Track cumulative scores across rounds
 * - Game ends when someone hits target score (default 100)
 * - Landing on 25/50/75/100 gives -25 bonus (with exceptions)
 */

export interface ScoreContext {
  rawScore: number
  previousTotal: number
  gotBonusLastRound: boolean
}

export interface ScoreResult {
  rawScore: number
  bonusApplied: number
  finalScore: number
  newTotal: number
}

export interface GameOverResult {
  isOver: boolean
  winnerIndex: number | null
}

export interface ScorePreview {
  wouldGetBonus: boolean
  projectedTotal: number
}

/**
 * Calculate the final score for a round, including bonus logic.
 *
 * Bonus rules:
 * - Landing exactly on 25/50/75/100 gives -25 points
 * - Exception: No bonus if already at 0 points
 * - Exception: No bonus if got -25 last round AND would hit 0 again (prevents infinite loop)
 */
export function calculateScore(context: ScoreContext): ScoreResult {
  const { rawScore, previousTotal, gotBonusLastRound } = context
  const potentialTotal = previousTotal + rawScore
  let bonusApplied = 0

  // Check if landing on a multiple of 25 (between 25 and 100)
  // Must actually score points to "land" somewhere (0 = staying in place)
  if (
    rawScore > 0 &&
    potentialTotal % 25 === 0 &&
    potentialTotal > 0 &&
    potentialTotal <= 100
  ) {
    // Exception 1: Already at 0, no bonus
    if (previousTotal === 0) {
      bonusApplied = 0
    }
    // Exception 2: Got bonus last round and would hit 0 again (anti-loop)
    else if (gotBonusLastRound && potentialTotal === 25) {
      bonusApplied = 0
    }
    // Standard case: apply -25 bonus
    else {
      bonusApplied = -25
    }
  }

  const newTotal = Math.max(0, previousTotal + rawScore + bonusApplied)

  return {
    rawScore,
    bonusApplied,
    finalScore: rawScore + bonusApplied,
    newTotal,
  }
}

/**
 * Check if a player has reached or exceeded the target score.
 * When game is over, the player with the lowest score wins.
 */
export function checkGameOver(
  playerTotals: number[],
  targetScore: number
): GameOverResult {
  const exceededTarget = playerTotals.findIndex((t) => t >= targetScore)

  if (exceededTarget === -1) {
    return { isOver: false, winnerIndex: null }
  }

  // Find player with lowest score (they win)
  const minScore = Math.min(...playerTotals)
  const winnerIndex = playerTotals.indexOf(minScore)

  return { isOver: true, winnerIndex }
}

/**
 * Preview what the score would be (for UI feedback).
 * Shows whether bonus would apply and the projected total.
 */
export function previewScore(
  rawScore: number,
  previousTotal: number,
  gotBonusLastRound: boolean
): ScorePreview {
  const result = calculateScore({ rawScore, previousTotal, gotBonusLastRound })
  return {
    wouldGetBonus: result.bonusApplied !== 0,
    projectedTotal: result.newTotal,
  }
}
