import { StyleSheet, View } from 'react-native'
import { Surface, Text, Button, useTheme } from 'react-native-paper'

interface GameOverBannerProps {
  winnerName: string
  onNewGame?: () => void
}

export function GameOverBanner({ winnerName, onNewGame }: GameOverBannerProps) {
  const theme = useTheme()

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.primaryContainer }]} elevation={2}>
      <Text variant="headlineSmall" style={styles.title}>
        Game Over!
      </Text>
      <Text variant="titleLarge" style={styles.winner}>
        🏆 {winnerName} wins!
      </Text>
      {onNewGame && (
        <Button mode="contained" onPress={onNewGame} style={styles.button}>
          New Game
        </Button>
      )}
    </Surface>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    marginBottom: 8,
  },
  winner: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
})
