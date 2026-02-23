import { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { Q } from '@nozbe/watermelondb'
import { playersCollection, roundsCollection } from '@/database'
import { ScoreInput } from '@/components/ScoreInput'
import { submitRound, getRoundCount } from '@/services/gameService'

interface PlayerState {
  id: string
  name: string
  currentTotal: number
  gotBonusLastRound: boolean
  scoreInput: string
}

export default function AddRoundScreen() {
  const { id: gameId } = useLocalSearchParams<{ id: string }>()
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [roundNumber, setRoundNumber] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPlayers()
  }, [gameId])

  const loadPlayers = async () => {
    if (!gameId) return

    try {
      // Get players
      const playersData = await playersCollection
        .query(Q.where('game_id', gameId))
        .fetch()

      // Get last round to check for bonuses
      const rounds = await roundsCollection
        .query(Q.where('game_id', gameId), Q.sortBy('round_number', Q.desc), Q.take(1))
        .fetch()

      const lastRound = rounds[0]
      let bonusMap = new Map<string, boolean>()

      if (lastRound) {
        const lastScores = await lastRound.scores.fetch()
        bonusMap = new Map(lastScores.map((s) => [s.playerId, s.bonusApplied !== 0]))
      }

      // Get current round number
      const count = await getRoundCount(gameId)
      setRoundNumber(count + 1)

      // Initialize player states
      const playerStates: PlayerState[] = playersData
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          id: p.id,
          name: p.name,
          currentTotal: p.currentTotal,
          gotBonusLastRound: bonusMap.get(p.id) || false,
          scoreInput: '',
        }))

      setPlayers(playerStates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePlayerScore = (playerId: string, value: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, scoreInput: value } : p))
    )
  }

  const allScoresEntered = players.every((p) => p.scoreInput.trim() !== '')

  const handleSubmit = async () => {
    if (!allScoresEntered || !gameId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const scores = players.map((p) => ({
        playerId: p.id,
        rawScore: parseInt(p.scoreInput, 10) || 0,
      }))

      const result = await submitRound({
        gameId,
        scores,
      })

      // Navigate back to scoreboard
      router.back()

      // If game is over, the scoreboard will show the winner
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit round')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: `Round ${roundNumber}` }} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            Enter Scores
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Enter each player's score for this round
          </Text>

          {players.map((player) => (
            <ScoreInput
              key={player.id}
              playerName={player.name}
              currentTotal={player.currentTotal}
              gotBonusLastRound={player.gotBonusLastRound}
              value={player.scoreInput}
              onChangeText={(value) => updatePlayerScore(player.id, value)}
            />
          ))}

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={!allScoresEntered || isSubmitting}
              loading={isSubmitting}
              style={styles.submitButton}
            >
              Submit Round
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={3000}
        action={{ label: 'OK', onPress: () => setError(null) }}
      >
        {error}
      </Snackbar>
    </>
  )
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
})
