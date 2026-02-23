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
      expect(result.finalScore).toBe(15)
    })

    it('handles first round from 0', () => {
      const result = calculateScore({
        rawScore: 10,
        previousTotal: 0,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(10)
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
      expect(result.finalScore).toBe(-10) // 15 - 25 = -10
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

    it('no bonus when starting from 0 and landing on 50', () => {
      const result = calculateScore({
        rawScore: 50,
        previousTotal: 0,
        gotBonusLastRound: false,
      })
      expect(result.newTotal).toBe(50)
      expect(result.bonusApplied).toBe(0)
    })
  })

  describe('exception: anti-loop protection', () => {
    it('no bonus when got bonus last round and would land on 25 from 0', () => {
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

    it('still gives bonus for 75 even if got bonus last round', () => {
      const result = calculateScore({
        rawScore: 25,
        previousTotal: 50,
        gotBonusLastRound: true,
      })
      expect(result.newTotal).toBe(50) // 50 + 25 - 25 = 50
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

    it('no bonus for 125 (multiple of 25 but > 100)', () => {
      const result = calculateScore({
        rawScore: 50,
        previousTotal: 75,
        gotBonusLastRound: false,
      })
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
      expect(result.bonusApplied).toBe(-25)
    })

    it('returns correct rawScore in result', () => {
      const result = calculateScore({
        rawScore: 42,
        previousTotal: 10,
        gotBonusLastRound: false,
      })
      expect(result.rawScore).toBe(42)
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

  it('returns winner when someone exactly hits target', () => {
    const result = checkGameOver([45, 100, 30], 100)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(2) // Player with 30 points wins
  })

  it('handles tie for lowest - first player wins', () => {
    const result = checkGameOver([30, 102, 30], 100)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(0) // First player with 30 wins
  })

  it('handles two players', () => {
    const result = checkGameOver([100, 50], 100)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(1)
  })

  it('handles single player reaching target', () => {
    const result = checkGameOver([105], 100)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(0)
  })

  it('handles custom target score', () => {
    const result = checkGameOver([45, 60, 30], 50)
    expect(result.isOver).toBe(true)
    expect(result.winnerIndex).toBe(2) // Player with 30 wins
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

  it('respects anti-loop protection', () => {
    const result = previewScore(25, 0, true)
    expect(result.wouldGetBonus).toBe(false)
    expect(result.projectedTotal).toBe(25)
  })

  it('respects starting from 0 exception', () => {
    const result = previewScore(25, 0, false)
    expect(result.wouldGetBonus).toBe(false)
    expect(result.projectedTotal).toBe(25)
  })
})
