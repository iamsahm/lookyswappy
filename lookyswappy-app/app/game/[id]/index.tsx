import { StyleSheet, View, ScrollView } from 'react-native'
import { Text, Button, ActivityIndicator, FAB } from 'react-native-paper'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useGame } from '@/hooks/useGame'
import { ScoreTable } from '@/components/ScoreTable'
import { RoundHistory } from '@/components/RoundHistory'
import { GameOverBanner } from '@/components/GameOverBanner'

export default function ScoreboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { game, players, rounds, isLoading, error } = useGame(id)

  const handleAddRound = () => {
    router.push(`/game/${id}/add-round`)
  }

  const handleNewGame = () => {
    router.replace('/game/new')
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

  if (error || !game) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text variant="bodyLarge" style={styles.errorText}>
            {error || 'Game not found'}
          </Text>
          <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
            Go Back
          </Button>
        </View>
      </>
    )
  }

  const isGameOver = game.status === 'completed'
  const winner = isGameOver ? players.find((p) => p.id === game.winnerId) : null
  const gameTitle = game.name || `Game`

  return (
    <>
      <Stack.Screen
        options={{
          title: gameTitle,
          headerBackTitle: 'Games',
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {isGameOver && winner && (
            <GameOverBanner winnerName={winner.name} onNewGame={handleNewGame} />
          )}

          <ScoreTable
            players={players}
            targetScore={game.targetScore}
            winnerId={game.winnerId}
          />

          <RoundHistory rounds={rounds} />
        </ScrollView>

        {!isGameOver && (
          <FAB
            icon="plus"
            label="Add Round"
            onPress={handleAddRound}
            style={styles.fab}
          />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#d32f2f',
  },
  backButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
})
