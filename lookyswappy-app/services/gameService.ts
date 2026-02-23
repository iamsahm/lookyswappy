import { Q } from '@nozbe/watermelondb'
import {
  database,
  gamesCollection,
  playersCollection,
  Game,
  GamePlayer,
} from '@/database'

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
