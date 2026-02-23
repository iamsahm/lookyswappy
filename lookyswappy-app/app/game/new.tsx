import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack } from 'expo-router';

/**
 * New Game Screen
 *
 * Create a new Lookyswappy game.
 * See SDR-8 for full implementation.
 */
export default function NewGameScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'New Game' }} />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          New Game
        </Text>

        <Text variant="bodyMedium" style={styles.placeholder}>
          Game setup coming soon (SDR-8)
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
