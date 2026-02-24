import { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native'
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper'
import { useRouter, useFocusEffect } from 'expo-router'
import { Q } from '@nozbe/watermelondb'
import { gamesCollection, playersCollection, Game, GamePlayer } from '@/database'

interface GameHistoryItem {
  game: Game
  players: GamePlayer[]
  winnerName: string | null
}

export default function HistoryScreen() {
  const router = useRouter()
  const [games, setGames] = useState<GameHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadGames = useCallback(async () => {
    try {
      const completedGames = await gamesCollection
        .query(Q.where('status', 'completed'), Q.sortBy('ended_at', Q.desc))
        .fetch()

      const gamesWithPlayers: GameHistoryItem[] = []

      for (const game of completedGames) {
        const players = await playersCollection
          .query(Q.where('game_id', game.id))
          .fetch()

        const winner = game.winnerId
          ? players.find((p) => p.id === game.winnerId)
          : null

        gamesWithPlayers.push({
          game,
          players: players.sort((a, b) => a.position - b.position),
          winnerName: winner?.name || null,
        })
      }

      setGames(gamesWithPlayers)
    } catch (error) {
      console.error('Failed to load games:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadGames()
  }, [loadGames])

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGames()
    }, [loadGames])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadGames()
  }, [loadGames])

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Unknown'
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleGamePress = (gameId: string) => {
    router.push(`/game/${gameId}`)
  }

  const renderGameItem = ({ item }: { item: GameHistoryItem }) => {
    const { game, players, winnerName } = item
    const playerNames = players.map((p) => p.name).join(', ')

    return (
      <Card style={styles.card} onPress={() => handleGamePress(game.id)}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium">
              {game.name || `Game to ${game.targetScore}`}
            </Text>
            <Text variant="bodySmall" style={styles.dateText}>
              {formatDate(game.endedAt)}
            </Text>
          </View>

          <Text variant="bodyMedium" style={styles.playersText}>
            {playerNames}
          </Text>

          {winnerName && (
            <View style={styles.winnerRow}>
              <Chip icon="trophy" compact style={styles.winnerChip}>
                {winnerName} won
              </Chip>
            </View>
          )}

          <View style={styles.statsRow}>
            <Text variant="bodySmall" style={styles.statText}>
              Target: {game.targetScore}
            </Text>
            <Text variant="bodySmall" style={styles.statText}>
              {players.length} players
            </Text>
          </View>
        </Card.Content>
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (games.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Game History
        </Text>
        <View style={styles.emptyState}>
          <Text variant="titleLarge" style={styles.emptyIcon}>
            🎮
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No completed games yet
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Finish a game to see it here!
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Game History
      </Text>

      <FlatList
        data={games}
        keyExtractor={(item) => item.game.id}
        renderItem={renderGameItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    opacity: 0.6,
  },
  playersText: {
    marginBottom: 8,
  },
  winnerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  winnerChip: {
    backgroundColor: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statText: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    opacity: 0.8,
  },
  emptySubtext: {
    opacity: 0.5,
    marginTop: 4,
  },
})
