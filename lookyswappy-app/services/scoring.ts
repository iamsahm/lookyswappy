/**
 * Scoring Logic Service
 *
 * Implements Lookyswappy scoring rules including the multiple-of-25 bonus.
 * See SDR-7 for full implementation.
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

// TODO: Implement scoring logic (SDR-7)
export function calculateScore(context: ScoreContext): ScoreResult {
  throw new Error('Not implemented - see SDR-7')
}

export function checkGameOver(
  playerTotals: number[],
  targetScore: number
): { isOver: boolean; winnerIndex: number | null } {
  throw new Error('Not implemented - see SDR-7')
}

export function previewScore(
  rawScore: number,
  previousTotal: number,
  gotBonusLastRound: boolean
): { wouldGetBonus: boolean; projectedTotal: number } {
  throw new Error('Not implemented - see SDR-7')
}
