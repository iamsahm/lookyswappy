import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Game History
      </Text>

      <Text variant="bodyMedium" style={styles.placeholder}>
        No completed games yet. Finish a game to see it here!
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
  placeholder: {
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 24,
  },
});
