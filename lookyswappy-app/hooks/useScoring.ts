import { useMemo, useCallback } from 'react'
import {
  calculateScore,
  checkGameOver,
  previewScore,
  type ScoreContext,
  type ScoreResult,
  type GameOverResult,
  type ScorePreview,
} from '@/services/scoring'

export interface PlayerScoreState {
  currentTotal: number
  gotBonusLastRound: boolean
}

/**
 * Hook for scoring logic integration with UI components.
 * Provides memoized score calculations and game state checks.
 */
export function useScoring(targetScore: number = 100) {
  const calculatePlayerScore = useCallback(
    (rawScore: number, playerState: PlayerScoreState): ScoreResult => {
      return calculateScore({
        rawScore,
        previousTotal: playerState.currentTotal,
        gotBonusLastRound: playerState.gotBonusLastRound,
      })
    },
    []
  )

  const previewPlayerScore = useCallback(
    (rawScore: number, playerState: PlayerScoreState): ScorePreview => {
      return previewScore(
        rawScore,
        playerState.currentTotal,
        playerState.gotBonusLastRound
      )
    },
    []
  )

  const checkGameEnd = useCallback(
    (playerTotals: number[]): GameOverResult => {
      return checkGameOver(playerTotals, targetScore)
    },
    [targetScore]
  )

  return {
    calculatePlayerScore,
    previewPlayerScore,
    checkGameEnd,
    targetScore,
  }
}

/**
 * Hook for previewing a single player's score as they input it.
 * Returns memoized preview that updates when inputs change.
 */
export function useScorePreview(
  rawScore: number,
  currentTotal: number,
  gotBonusLastRound: boolean
): ScorePreview {
  return useMemo(
    () => previewScore(rawScore, currentTotal, gotBonusLastRound),
    [rawScore, currentTotal, gotBonusLastRound]
  )
}

export type { ScoreContext, ScoreResult, GameOverResult, ScorePreview }
