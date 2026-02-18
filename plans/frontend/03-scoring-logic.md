# 03 - Scoring Logic

## Overview

Implementation of lookyswappy scoring rules, including the multiple-of-25 bonus with its exceptions.

---

## Rules Summary

1. Track cumulative scores across rounds
2. Game ends when someone hits target score (default 100)
3. **Multiple of 25 bonus**: Landing exactly on 25/50/75/100 gives -25 points
   - Exception: Not if already at 0 points
   - Exception: Not if got -25 last round AND would hit 0 again (prevents infinite loop)
4. No penalty for calling lookyswappy without lowest hand

---

## Core Implementation

### services/scoring.ts

```typescript
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

/**
 * Calculate the final score for a round, including bonus logic.
 */
export function calculateScore(context: ScoreContext): ScoreResult {
  const { rawScore, previousTotal, gotBonusLastRound } = context
  const potentialTotal = previousTotal + rawScore
  let bonusApplied = 0

  // Check if landing on a multiple of 25 (between 25 and 100)
  if (
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
 * Check if a player has won (reached or exceeded target score).
 */
export function checkGameOver(
  playerTotals: number[],
  targetScore: number
): { isOver: boolean; winnerIndex: number | null } {
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
 */
export function previewScore(
  rawScore: number,
  previousTotal: number,
  gotBonusLastRound: boolean
): { wouldGetBonus: boolean; projectedTotal: number } {
  const result = calculateScore({ rawScore, previousTotal, gotBonusLastRound })
  return {
    wouldGetBonus: result.bonusApplied !== 0,
    projectedTotal: result.newTotal,
  }
}
```

---

## Test Cases

### services/__tests__/scoring.test.ts

```typescript
import { calculateScore, checkGameOver, previewScore } from '../scoring'

describe('calculateScore', () => {
  describe('standard scoring (no bonus)', () => {
    it('adds raw score to total', () => {
      const result = calculateScore({
        rawScore: 15,
        previousTotal: 30,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(45)
      expect(result.bonusApplied).toBe(0)
    })
  })

  describe('multiple of 25 bonus', () => {
    it('applies -25 bonus when landing on 25', () => {
      const result = calculateScore({
        rawScore: 15,
        previousTotal: 10,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(0) // 10 + 15 - 25 = 0
      expect(result.bonusApplied).toBe(-25)
    })

    it('applies -25 bonus when landing on 50', () => {
      const result = calculateScore({
        rawScore: 20,
        previousTotal: 30,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(25) // 30 + 20 - 25 = 25
      expect(result.bonusApplied).toBe(-25)
    })

    it('applies -25 bonus when landing on 75', () => {
      const result = calculateScore({
        rawScore: 25,
        previousTotal: 50,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(50) // 50 + 25 - 25 = 50
      expect(result.bonusApplied).toBe(-25)
    })

    it('applies -25 bonus when landing on 100', () => {
      const result = calculateScore({
        rawScore: 30,
        previousTotal: 70,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(75) // 70 + 30 - 25 = 75
      expect(result.bonusApplied).toBe(-25)
    })
  })

  describe('exception: already at 0', () => {
    it('no bonus when starting from 0 and landing on 25', () => {
      const result = calculateScore({
        rawScore: 25,
        previousTotal: 0,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(25)
      expect(result.bonusApplied).toBe(0)
    })
  })

  describe('exception: anti-loop protection', () => {
    it('no bonus when got bonus last round and would hit 0', () => {
      // Player was at 25, got -25 to reach 0, now scoring 25 again
      const result = calculateScore({
        rawScore: 25,
        previousTotal: 0,
        gotBonusLastRound: true,
      })
      expect(result.newTotal).toBe(25)
      expect(result.bonusApplied).toBe(0)
    })

    it('still gives bonus for 50 even if got bonus last round', () => {
      const result = calculateScore({
        rawScore: 25,
        previousTotal: 25,
        gotBonusLastRound: true,
      })
      expect(result.newTotal).toBe(25) // 25 + 25 - 25 = 25
      expect(result.bonusApplied).toBe(-25)
    })
  })

  describe('edge cases', () => {
    it('no bonus above 100', () => {
      const result = calculateScore({
        rawScore: 50,
        previousTotal: 75,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(125)
      expect(result.bonusApplied).toBe(0)
    })

    it('handles 0 raw score', () => {
      const result = calculateScore({
        rawScore: 0,
        previousTotal: 25,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(25)
      expect(result.bonusApplied).toBe(0)
    })

    it('total cannot go below 0', () => {
      const result = calculateScore({
        rawScore: 5,
        previousTotal: 20,
        gotBonusLastRound: false,
      })
      // 20 + 5 = 25, bonus -25, result = 0 (not negative)
      expect(result.newTotal).toBe(0)
    })
  })
})

describe('checkGameOver', () => {
  it('returns false when no one has reached target', () => {
    const result = checkGameOver([45, 60, 30], 100)
    expect(result.isOver).toBe(false)
    expect(result.winnerIndex).toBeNull()
  })

  it('returns winner with lowest score when someone exceeds target', () => {
    const result = checkGameOver([45, 102, 30], 100)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(2) // Player with 30 points wins
  })

  it('handles tie for lowest', () => {
    const result = checkGameOver([30, 102, 30], 100)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(0) // First player with 30 wins
  })
})

describe('previewScore', () => {
  it('indicates when bonus would apply', () => {
    const result = previewScore(15, 10, false)
    expect(result.wouldGetBonus).toBe(true)
    expect(result.projectedTotal).toBe(0)
  })

  it('indicates when no bonus', () => {
    const result = previewScore(10, 10, false)
    expect(result.wouldGetBonus).toBe(false)
    expect(result.projectedTotal).toBe(20)
  })
})
```

---

## Usage in Components

### Example: Score Input with Preview

```typescript
import { useState, useMemo } from 'react'
import { previewScore } from '@/services/scoring'

function ScoreInput({ player, onSubmit }) {
  const [rawScore, setRawScore] = useState(0)

  const preview = useMemo(() => {
    return previewScore(rawScore, player.currentTotal, player.gotBonusLastRound)
  }, [rawScore, player.currentTotal, player.gotBonusLastRound])

  return (
    <View>
      <Text>{player.name}</Text>
      <TextInput
        value={String(rawScore)}
        onChangeText={(v) => setRawScore(Number(v) || 0)}
        keyboardType="numeric"
      />
      {preview.wouldGetBonus && (
        <Text style={{ color: 'green' }}>-25 bonus!</Text>
      )}
      <Text>Projected: {preview.projectedTotal}</Text>
    </View>
  )
}
```

---

## Tasks

- [ ] Create scoring.ts with calculateScore, checkGameOver, previewScore
- [ ] Write comprehensive tests
- [ ] Verify edge cases match game rules
- [ ] Create scoring preview hook for UI
