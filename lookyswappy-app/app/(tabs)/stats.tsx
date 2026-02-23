import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function StatsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Statistics
      </Text>

      <Text variant="bodyMedium" style={styles.placeholder}>
        Play some games to see your statistics!
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
