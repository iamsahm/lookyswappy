import { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, ActivityIndicator, DataTable, Divider } from 'react-native-paper'
import { useFocusEffect } from 'expo-router'
import { Q } from '@nozbe/watermelondb'
import {
  gamesCollection,
  playersCollection,
  scoresCollection,
  Game,
  GamePlayer,
} from '@/database'

interface PlayerStats {
  name: string
  gamesPlayed: number
  wins: number
  avgScore: number
  totalBonuses: number
}

interface OverallStats {
  totalGames: number
  completedGames: number
  activeGames: number
  totalRounds: number
  avgGameLength: number
  playerStats: PlayerStats[]
  mostCommonBonus: number | null
  bonusCounts: Map<number, number>
}

export default function StatsScreen() {
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const calculateStats = useCallback(async () => {
    try {
      // Get all games
      const allGames = await gamesCollection.query().fetch()
      const completedGames = allGames.filter((g) => g.status === 'completed')
      const activeGames = allGames.filter((g) => g.status === 'active')

      // Get all players grouped by name
      const allPlayers = await playersCollection.query().fetch()

      // Build player stats by name
      const playerNameMap = new Map<
        string,
        { gamesPlayed: number; wins: number; totalScore: number; bonuses: number }
      >()

      for (const player of allPlayers) {
        const game = allGames.find((g) => g.id === player.gameId)
        if (!game || game.status !== 'completed') continue

        const existing = playerNameMap.get(player.name) || {
          gamesPlayed: 0,
          wins: 0,
          totalScore: 0,
          bonuses: 0,
        }

        existing.gamesPlayed++
        existing.totalScore += player.currentTotal

        if (game.winnerId === player.id) {
          existing.wins++
        }

        // Get bonus count for this player
        const scores = await scoresCollection
          .query(Q.where('player_id', player.id))
          .fetch()
        existing.bonuses += scores.filter((s) => s.bonusApplied !== 0).length

        playerNameMap.set(player.name, existing)
      }

      // Convert to array and sort by wins
      const playerStats: PlayerStats[] = Array.from(playerNameMap.entries())
        .map(([name, data]) => ({
          name,
          gamesPlayed: data.gamesPlayed,
          wins: data.wins,
          avgScore:
            data.gamesPlayed > 0
              ? Math.round(data.totalScore / data.gamesPlayed)
              : 0,
          totalBonuses: data.bonuses,
        }))
        .sort((a, b) => b.wins - a.wins)

      // Calculate total rounds and average game length
      let totalRounds = 0
      for (const game of completedGames) {
        const players = await playersCollection
          .query(Q.where('game_id', game.id))
          .fetch()
        if (players.length > 0) {
          // Get round count by checking scores
          const firstPlayer = players[0]
          const scores = await scoresCollection
            .query(Q.where('player_id', firstPlayer.id))
            .fetch()
          totalRounds += scores.length
        }
      }

      const avgGameLength =
        completedGames.length > 0
          ? Math.round(totalRounds / completedGames.length)
          : 0

      // Calculate most common bonus landing
      const bonusCounts = new Map<number, number>()
      const allScores = await scoresCollection.query().fetch()

      for (const score of allScores) {
        if (score.bonusApplied !== 0) {
          // The bonus landing point is totalAfter (when bonus was applied)
          const landingPoint = score.totalAfter
          const count = bonusCounts.get(landingPoint) || 0
          bonusCounts.set(landingPoint, count + 1)
        }
      }

      let mostCommonBonus: number | null = null
      let maxCount = 0
      for (const [point, count] of bonusCounts.entries()) {
        if (count > maxCount) {
          maxCount = count
          mostCommonBonus = point
        }
      }

      setStats({
        totalGames: allGames.length,
        completedGames: completedGames.length,
        activeGames: activeGames.length,
        totalRounds,
        avgGameLength,
        playerStats,
        mostCommonBonus,
        bonusCounts,
      })
    } catch (error) {
      console.error('Failed to calculate stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    calculateStats()
  }, [calculateStats])

  useFocusEffect(
    useCallback(() => {
      calculateStats()
    }, [calculateStats])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    calculateStats()
  }, [calculateStats])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Statistics
        </Text>
        <View style={styles.emptyState}>
          <Text variant="titleLarge" style={styles.emptyIcon}>
            📊
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            No statistics yet
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Play some games to see your stats!
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text variant="headlineMedium" style={styles.title}>
        Statistics
      </Text>

      {/* Overview Card */}
      <Card style={styles.card}>
        <Card.Title title="Overview" />
        <Card.Content>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineLarge" style={styles.statValue}>
                {stats.completedGames}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Games Played
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="headlineLarge" style={styles.statValue}>
                {stats.activeGames}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                In Progress
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="headlineLarge" style={styles.statValue}>
                {stats.totalRounds}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Total Rounds
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="headlineLarge" style={styles.statValue}>
                {stats.avgGameLength}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Avg Rounds/Game
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Bonus Stats */}
      {stats.mostCommonBonus !== null && (
        <Card style={styles.card}>
          <Card.Title title="Bonus Landings" />
          <Card.Content>
            <View style={styles.bonusRow}>
              <Text variant="bodyMedium">Most common bonus landing:</Text>
              <Text variant="titleLarge" style={styles.bonusValue}>
                {stats.mostCommonBonus}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.bonusGrid}>
              {[25, 50, 75, 100].map((point) => (
                <View key={point} style={styles.bonusItem}>
                  <Text variant="titleMedium">{point}</Text>
                  <Text variant="bodySmall" style={styles.bonusCount}>
                    {stats.bonusCounts.get(point) || 0} times
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Player Leaderboard */}
      {stats.playerStats.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Player Leaderboard" />
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Player</DataTable.Title>
                <DataTable.Title numeric>Games</DataTable.Title>
                <DataTable.Title numeric>Wins</DataTable.Title>
                <DataTable.Title numeric>Avg</DataTable.Title>
              </DataTable.Header>

              {stats.playerStats.slice(0, 10).map((player, index) => (
                <DataTable.Row key={player.name}>
                  <DataTable.Cell>
                    {index === 0 ? '🏆 ' : ''}
                    {player.name}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>{player.gamesPlayed}</DataTable.Cell>
                  <DataTable.Cell numeric>{player.wins}</DataTable.Cell>
                  <DataTable.Cell numeric>{player.avgScore}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card.Content>
        </Card>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  card: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    opacity: 0.6,
    marginTop: 4,
  },
  bonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bonusValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  divider: {
    marginVertical: 12,
  },
  bonusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bonusItem: {
    alignItems: 'center',
  },
  bonusCount: {
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
  bottomPadding: {
    height: 32,
  },
})
