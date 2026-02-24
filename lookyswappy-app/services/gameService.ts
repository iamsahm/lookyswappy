import { Q } from '@nozbe/watermelondb'
import {
  database,
  gamesCollection,
  playersCollection,
  roundsCollection,
  scoresCollection,
  Game,
  GamePlayer,
  Round,
  Score,
} from '@/database'
import type { RoundData, RoundScore } from '@/components/RoundHistory'
import { calculateScore, checkGameOver } from '@/services/scoring'

export interface CreateGameInput {
  name?: string
  targetScore: number
  playerNames: string[]
}

export interface GameWithPlayers {
  game: Game
  players: GamePlayer[]
}

/**
 * Create a new game with players.
 * This creates both the game record and all player records in a single transaction.
 */
export async function createGame(input: CreateGameInput): Promise<GameWithPlayers> {
  const { name, targetScore, playerNames } = input

  if (playerNames.length < 2) {
    throw new Error('At least 2 players are required')
  }

  const now = Date.now()

  return await database.write(async () => {
    // Create the game
    const game = await gamesCollection.create((g) => {
      g.name = name || null
      g.targetScore = targetScore
      g.status = 'active'
      g.winnerId = null
      g.startedAt = new Date(now)
      g.endedAt = null
      g.lastModified = new Date(now)
      g.isSynced = false
    })

    // Create players
    const players: GamePlayer[] = []
    for (let i = 0; i < playerNames.length; i++) {
      const player = await playersCollection.create((p) => {
        p.gameId = game.id
        p.name = playerNames[i].trim()
        p.position = i
        p.currentTotal = 0
        p.lastModified = new Date(now)
        p.isSynced = false
      })
      players.push(player)
    }

    return { game, players }
  })
}

/**
 * Get all active games (not completed).
 */
export async function getActiveGames(): Promise<Game[]> {
  return await gamesCollection.query(Q.where('status', 'active')).fetch()
}

/**
 * Get a game by ID with its players.
 */
export async function getGameWithPlayers(gameId: string): Promise<GameWithPlayers | null> {
  try {
    const game = await gamesCollection.find(gameId)
    const players = await game.players.fetch()
    return { game, players: players.sort((a, b) => a.position - b.position) }
  } catch {
    return null
  }
}

/**
 * Get all games, sorted by most recent first.
 */
export async function getAllGames(): Promise<Game[]> {
  return await gamesCollection
    .query(Q.sortBy('started_at', Q.desc))
    .fetch()
}

/**
 * Get all rounds for a game with their scores.
 */
export async function getRoundsWithScores(
  gameId: string,
  players: GamePlayer[]
): Promise<RoundData[]> {
  const rounds = await roundsCollection
    .query(Q.where('game_id', gameId), Q.sortBy('round_number', Q.asc))
    .fetch()

  const playerMap = new Map(players.map((p) => [p.id, p.name]))

  const roundsWithScores: RoundData[] = []

  for (const round of rounds) {
    const scores = await round.scores.fetch()

    const roundScores: RoundScore[] = scores.map((score) => ({
      playerId: score.playerId,
      playerName: playerMap.get(score.playerId) || 'Unknown',
      rawScore: score.rawScore,
      bonusApplied: score.bonusApplied,
      finalScore: score.finalScore,
      totalAfter: score.totalAfter,
    }))

    roundsWithScores.push({
      id: round.id,
      roundNumber: round.roundNumber,
      scores: roundScores,
      createdAt: round.createdAt,
    })
  }

  return roundsWithScores
}

/**
 * Get the number of rounds played in a game.
 */
export async function getRoundCount(gameId: string): Promise<number> {
  const rounds = await roundsCollection
    .query(Q.where('game_id', gameId))
    .fetchCount()
  return rounds
}

export interface PlayerRoundScore {
  playerId: string
  rawScore: number
}

export interface SubmitRoundInput {
  gameId: string
  scores: PlayerRoundScore[]
  callerId?: string
}

export interface SubmitRoundResult {
  round: Round
  isGameOver: boolean
  winnerId: string | null
}

/**
 * Submit a round with scores for all players.
 * Calculates bonuses, updates player totals, and checks for game over.
 */
export async function submitRound(input: SubmitRoundInput): Promise<SubmitRoundResult> {
  const { gameId, scores, callerId } = input

  return await database.write(async () => {
    const now = Date.now()

    // Get game and players
    const game = await gamesCollection.find(gameId)
    const players = await playersCollection
      .query(Q.where('game_id', gameId))
      .fetch()

    // Get the last round to check for bonus last round
    const existingRounds = await roundsCollection
      .query(Q.where('game_id', gameId), Q.sortBy('round_number', Q.desc))
      .fetch()

    const roundNumber = existingRounds.length + 1
    const lastRound = existingRounds[0]

    // Get scores from last round to check gotBonusLastRound
    let lastRoundScores: Score[] = []
    if (lastRound) {
      lastRoundScores = await lastRound.scores.fetch()
    }

    const lastRoundBonusMap = new Map(
      lastRoundScores.map((s) => [s.playerId, s.bonusApplied !== 0])
    )

    // Create the round
    const round = await roundsCollection.create((r) => {
      r.gameId = gameId
      r.roundNumber = roundNumber
      r.callerId = callerId || null
      r.createdAt = new Date(now)
      r.lastModified = new Date(now)
      r.isSynced = false
    })

    // Process each player's score
    const playerMap = new Map(players.map((p) => [p.id, p]))
    const newTotals: number[] = []

    for (const scoreInput of scores) {
      const player = playerMap.get(scoreInput.playerId)
      if (!player) continue

      const gotBonusLastRound = lastRoundBonusMap.get(player.id) || false

      // Calculate score with bonus logic
      const result = calculateScore({
        rawScore: scoreInput.rawScore,
        previousTotal: player.currentTotal,
        gotBonusLastRound,
      })

      // Create score record
      await scoresCollection.create((s) => {
        s.roundId = round.id
        s.playerId = player.id
        s.rawScore = result.rawScore
        s.bonusApplied = result.bonusApplied
        s.finalScore = result.finalScore
        s.totalAfter = result.newTotal
        s.lastModified = new Date(now)
        s.isSynced = false
      })

      // Update player's current total
      await player.update((p) => {
        p.currentTotal = result.newTotal
        p.lastModified = new Date(now)
        p.isSynced = false
      })

      newTotals.push(result.newTotal)
    }

    // Check if game is over
    const gameOverResult = checkGameOver(newTotals, game.targetScore)

    if (gameOverResult.isOver && gameOverResult.winnerIndex !== null) {
      // Find winner by matching total
      const winnerTotal = newTotals[gameOverResult.winnerIndex]
      const winnerPlayer = players.find((p) => {
        const idx = scores.findIndex((s) => s.playerId === p.id)
        return idx !== -1 && newTotals[idx] === winnerTotal
      })

      await game.update((g) => {
        g.status = 'completed'
        g.winnerId = winnerPlayer?.id || null
        g.endedAt = new Date(now)
        g.lastModified = new Date(now)
        g.isSynced = false
      })

      return {
        round,
        isGameOver: true,
        winnerId: winnerPlayer?.id || null,
      }
    }

    // Update game last modified
    await game.update((g) => {
      g.lastModified = new Date(now)
      g.isSynced = false
    })

    return {
      round,
      isGameOver: false,
      winnerId: null,
    }
  })
}

/**
 * Get player's last round score to determine if they got a bonus.
 */
export async function getPlayerLastRoundBonus(
  gameId: string,
  playerId: string
): Promise<boolean> {
  const rounds = await roundsCollection
    .query(Q.where('game_id', gameId), Q.sortBy('round_number', Q.desc), Q.take(1))
    .fetch()

  if (rounds.length === 0) return false

  const scores = await rounds[0].scores.fetch()
  const playerScore = scores.find((s) => s.playerId === playerId)

  return playerScore?.bonusApplied !== 0
}
