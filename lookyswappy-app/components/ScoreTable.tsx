import { StyleSheet, View } from 'react-native'
import { DataTable, Text, useTheme, Icon } from 'react-native-paper'

export interface PlayerScore {
  id: string
  name: string
  currentTotal: number
  position: number
}

interface ScoreTableProps {
  players: PlayerScore[]
  targetScore: number
  winnerId?: string | null
}

export function ScoreTable({ players, targetScore, winnerId }: ScoreTableProps) {
  const theme = useTheme()

  // Sort by score (lowest first = winning)
  const sortedPlayers = [...players].sort((a, b) => a.currentTotal - b.currentTotal)

  const lowestScore = sortedPlayers[0]?.currentTotal ?? 0
  const highestScore = sortedPlayers[sortedPlayers.length - 1]?.currentTotal ?? 0

  const getRowStyle = (player: PlayerScore) => {
    if (winnerId === player.id) {
      return { backgroundColor: theme.colors.primaryContainer }
    }
    if (player.currentTotal === lowestScore && !winnerId) {
      return { backgroundColor: theme.colors.tertiaryContainer }
    }
    if (player.currentTotal >= targetScore) {
      return { backgroundColor: theme.colors.errorContainer }
    }
    if (player.currentTotal === highestScore && highestScore >= targetScore * 0.8) {
      return { backgroundColor: theme.colors.errorContainer + '40' }
    }
    return {}
  }

  return (
    <View style={styles.container}>
      <DataTable>
        <DataTable.Header>
          <DataTable.Title style={styles.rankColumn}>#</DataTable.Title>
          <DataTable.Title style={styles.nameColumn}>Player</DataTable.Title>
          <DataTable.Title numeric style={styles.scoreColumn}>
            Score
          </DataTable.Title>
        </DataTable.Header>

        {sortedPlayers.map((player, index) => (
          <DataTable.Row key={player.id} style={getRowStyle(player)}>
            <DataTable.Cell style={styles.rankColumn}>
              <View style={styles.rankCell}>
                {index === 0 && !winnerId && (
                  <Icon source="crown" size={16} color={theme.colors.tertiary} />
                )}
                {winnerId === player.id && (
                  <Icon source="trophy" size={16} color={theme.colors.primary} />
                )}
                {index !== 0 && winnerId !== player.id && (
                  <Text variant="bodyMedium">{index + 1}</Text>
                )}
              </View>
            </DataTable.Cell>
            <DataTable.Cell style={styles.nameColumn}>
              <Text
                variant="bodyMedium"
                style={winnerId === player.id ? styles.winnerName : undefined}
              >
                {player.name}
              </Text>
            </DataTable.Cell>
            <DataTable.Cell numeric style={styles.scoreColumn}>
              <Text
                variant="titleMedium"
                style={[
                  styles.score,
                  player.currentTotal >= targetScore && styles.overTarget,
                ]}
              >
                {player.currentTotal}
              </Text>
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>

      <View style={styles.legend}>
        <Text variant="bodySmall" style={styles.legendText}>
          Target: {targetScore} points (first to reach loses)
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  rankColumn: {
    flex: 0.5,
  },
  nameColumn: {
    flex: 2,
  },
  scoreColumn: {
    flex: 1,
  },
  rankCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerName: {
    fontWeight: 'bold',
  },
  score: {
    fontWeight: '600',
  },
  overTarget: {
    color: '#d32f2f',
  },
  legend: {
    marginTop: 12,
    alignItems: 'center',
  },
  legendText: {
    opacity: 0.6,
  },
})
