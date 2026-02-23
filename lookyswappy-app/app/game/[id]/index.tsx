import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams } from 'expo-router';

/**
 * Scoreboard Screen
 *
 * Display the current game state and scores.
 * See SDR-9 for full implementation.
 */
export default function ScoreboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Scoreboard' }} />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Game {id}
        </Text>

        <Text variant="bodyMedium" style={styles.placeholder}>
          Scoreboard coming soon (SDR-9)
        </Text>
      </View>
    </>
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
  placeholder: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 24,
  },
});
