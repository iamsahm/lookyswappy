import { StyleSheet, View } from 'react-native'
import { SegmentedButtons, Text } from 'react-native-paper'

interface TargetScoreSelectorProps {
  value: number
  onChange: (value: number) => void
}

const SCORE_OPTIONS = [
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: '150', label: '150' },
  { value: '200', label: '200' },
]

export function TargetScoreSelector({
  value,
  onChange,
}: TargetScoreSelectorProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.label}>
        Target Score
      </Text>
      <Text variant="bodySmall" style={styles.hint}>
        First player to reach this score loses
      </Text>
      <SegmentedButtons
        value={String(value)}
        onValueChange={(v) => onChange(Number(v))}
        buttons={SCORE_OPTIONS}
        style={styles.buttons}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    marginBottom: 4,
  },
  hint: {
    opacity: 0.6,
    marginBottom: 12,
  },
  buttons: {
    alignSelf: 'stretch',
  },
})
