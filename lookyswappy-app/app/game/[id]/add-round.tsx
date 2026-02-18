import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Stack, useLocalSearchParams } from 'expo-router';

/**
 * Add Round Screen
 *
 * Enter scores for each player in a round.
 * See SDR-10 for full implementation.
 */
export default function AddRoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Add Round' }} />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Add Round
        </Text>

        <Text variant="bodyMedium" style={styles.placeholder}>
          Score entry coming soon (SDR-10)
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
