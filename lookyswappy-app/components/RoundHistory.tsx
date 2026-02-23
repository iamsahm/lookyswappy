import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { List, Text, Chip, useTheme } from 'react-native-paper'

export interface RoundScore {
  playerId: string
  playerName: string
  rawScore: number
  bonusApplied: number
  finalScore: number
  totalAfter: number
}

export interface RoundData {
  id: string
  roundNumber: number
  scores: RoundScore[]
  createdAt: Date
}

interface RoundHistoryProps {
  rounds: RoundData[]
}

export function RoundHistory({ rounds }: RoundHistoryProps) {
  const [expandedRound, setExpandedRound] = useState<string | null>(null)
  const theme = useTheme()

  if (rounds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          No rounds played yet
        </Text>
      </View>
    )
  }

  // Show most recent rounds first
  const sortedRounds = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Round History
      </Text>

      <List.Section>
        {sortedRounds.map((round) => (
          <List.Accordion
            key={round.id}
            title={`Round ${round.roundNumber}`}
            expanded={expandedRound === round.id}
            onPress={() =>
              setExpandedRound(expandedRound === round.id ? null : round.id)
            }
            left={(props) => <List.Icon {...props} icon="cards" />}
          >
            {round.scores.map((score) => (
              <View key={score.playerId} style={styles.scoreRow}>
                <Text variant="bodyMedium" style={styles.playerName}>
                  {score.playerName}
                </Text>
                <View style={styles.scoreDetails}>
                  {score.bonusApplied !== 0 && (
                    <Chip
                      compact
                      mode="flat"
                      style={[
                        styles.bonusChip,
                        { backgroundColor: theme.colors.tertiaryContainer },
                      ]}
                      textStyle={styles.bonusChipText}
                    >
                      {score.bonusApplied > 0 ? '+' : ''}
                      {score.bonusApplied}
                    </Chip>
                  )}
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.scoreValue,
                      score.bonusApplied !== 0 && styles.withBonus,
                    ]}
                  >
                    +{score.rawScore}
                  </Text>
                  <Text variant="bodySmall" style={styles.totalAfter}>
                    → {score.totalAfter}
                  </Text>
                </View>
              </View>
            ))}
          </List.Accordion>
        ))}
      </List.Section>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  emptyContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 40,
  },
  playerName: {
    flex: 1,
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bonusChip: {
    height: 24,
  },
  bonusChipText: {
    fontSize: 12,
    marginVertical: 0,
    marginHorizontal: 4,
  },
  scoreValue: {
    minWidth: 40,
    textAlign: 'right',
  },
  withBonus: {
    fontWeight: '600',
  },
  totalAfter: {
    minWidth: 50,
    textAlign: 'right',
    opacity: 0.7,
  },
})
