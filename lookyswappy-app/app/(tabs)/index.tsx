import { StyleSheet, View } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { Link, Href } from 'expo-router';

export default function GamesScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Lookyswappy Scorer
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodyLarge">
            Track scores for your Lookyswappy games with automatic bonus
            calculations.
          </Text>
        </Card.Content>
      </Card>

      <Link href={'/game/new' as Href} asChild>
        <Button mode="contained" style={styles.button}>
          New Game
        </Button>
      </Link>

      <Text variant="titleMedium" style={styles.subtitle}>
        Active Games
      </Text>

      <Text variant="bodyMedium" style={styles.placeholder}>
        No active games. Start a new game to begin!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 24,
  },
  subtitle: {
    marginBottom: 8,
  },
  placeholder: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 24,
  },
});
