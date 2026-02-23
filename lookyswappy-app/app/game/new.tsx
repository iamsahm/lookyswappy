import { useState } from 'react'
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { TextInput, Button, Text, Snackbar } from 'react-native-paper'
import { Stack, router } from 'expo-router'
import { PlayerList } from '@/components/PlayerList'
import { TargetScoreSelector } from '@/components/TargetScoreSelector'
import { createGame } from '@/services/gameService'

export default function NewGameScreen() {
  const [gameName, setGameName] = useState('')
  const [players, setPlayers] = useState<string[]>(['', ''])
  const [targetScore, setTargetScore] = useState(100)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validPlayers = players.filter((p) => p.trim().length > 0)
  const canStartGame = validPlayers.length >= 2 && !isLoading

  const handleStartGame = async () => {
    if (!canStartGame) return

    setIsLoading(true)
    setError(null)

    try {
      const { game } = await createGame({
        name: gameName.trim() || undefined,
        targetScore,
        playerNames: validPlayers,
      })

      // Navigate to the game scoreboard
      router.replace(`/game/${game.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
      setIsLoading(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New Game' }} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            New Game
          </Text>

          <TextInput
            mode="outlined"
            label="Game Name (optional)"
            value={gameName}
            onChangeText={setGameName}
            placeholder="e.g., Friday Night Game"
            style={styles.gameNameInput}
          />

          <PlayerList
            players={players}
            onPlayersChange={setPlayers}
            minPlayers={2}
            maxPlayers={8}
          />

          <TargetScoreSelector value={targetScore} onChange={setTargetScore} />

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleStartGame}
              disabled={!canStartGame}
              loading={isLoading}
              style={styles.startButton}
              contentStyle={styles.startButtonContent}
            >
              Start Game
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
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  gameNameInput: {
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 24,
  },
  startButton: {
    borderRadius: 8,
  },
  startButtonContent: {
    paddingVertical: 8,
  },
})
