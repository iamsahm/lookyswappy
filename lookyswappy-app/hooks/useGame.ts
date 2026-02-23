import { useState, useEffect, useCallback } from 'react'
import { Q } from '@nozbe/watermelondb'
import {
  gamesCollection,
  playersCollection,
  roundsCollection,
  Game,
  GamePlayer,
} from '@/database'
import { getRoundsWithScores } from '@/services/gameService'
import type { RoundData } from '@/components/RoundHistory'
import type { PlayerScore } from '@/components/ScoreTable'

interface UseGameResult {
  game: Game | null
  players: PlayerScore[]
  rounds: RoundData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to load and observe a game's data.
 * Provides reactive updates when game state changes.
 */
export function useGame(gameId: string): UseGameResult {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<PlayerScore[]>([])
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!gameId) {
      setError('No game ID provided')
      setIsLoading(false)
      return
    }

    try {
      // Fetch game
      const gameRecord = await gamesCollection.find(gameId)
      setGame(gameRecord)

      // Fetch players
      const playersRecords = await playersCollection
        .query(Q.where('game_id', gameId))
        .fetch()

      const playerScores: PlayerScore[] = playersRecords.map((p) => ({
        id: p.id,
        name: p.name,
        currentTotal: p.currentTotal,
        position: p.position,
      }))
      setPlayers(playerScores)

      // Fetch rounds with scores
      const roundsData = await getRoundsWithScores(gameId, playersRecords)
      setRounds(roundsData)

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    } finally {
      setIsLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    fetchData()

    // Set up subscriptions for reactive updates
    const gameSubscription = gamesCollection
      .query(Q.where('id', gameId))
      .observe()
      .subscribe((games) => {
        if (games.length > 0) {
          setGame(games[0])
        }
      })

    const playersSubscription = playersCollection
      .query(Q.where('game_id', gameId))
      .observe()
      .subscribe((playersRecords) => {
        const playerScores: PlayerScore[] = playersRecords.map((p) => ({
          id: p.id,
          name: p.name,
          currentTotal: p.currentTotal,
          position: p.position,
        }))
        setPlayers(playerScores)
      })

    const roundsSubscription = roundsCollection
      .query(Q.where('game_id', gameId))
      .observe()
      .subscribe(async () => {
        // Refetch rounds when they change
        try {
          const playersRecords = await playersCollection
            .query(Q.where('game_id', gameId))
            .fetch()
          const roundsData = await getRoundsWithScores(gameId, playersRecords)
          setRounds(roundsData)
        } catch (err) {
          console.error('Error fetching rounds:', err)
        }
      })

    return () => {
      gameSubscription.unsubscribe()
      playersSubscription.unsubscribe()
      roundsSubscription.unsubscribe()
    }
  }, [gameId, fetchData])

  return {
    game,
    players,
    rounds,
    isLoading,
    error,
    refetch: fetchData,
  }
}
