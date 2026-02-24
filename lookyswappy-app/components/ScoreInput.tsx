import { StyleSheet, View } from 'react-native'
import { TextInput, Text, Chip, useTheme } from 'react-native-paper'
import { useScorePreview } from '@/hooks/useScoring'

interface ScoreInputProps {
  playerName: string
  currentTotal: number
  gotBonusLastRound: boolean
  value: string
  onChangeText: (text: string) => void
}

export function ScoreInput({
  playerName,
  currentTotal,
  gotBonusLastRound,
  value,
  onChangeText,
}: ScoreInputProps) {
  const theme = useTheme()
  const rawScore = parseInt(value, 10) || 0

  const preview = useScorePreview(rawScore, currentTotal, gotBonusLastRound)

  const handleChangeText = (text: string) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '')
    onChangeText(numericText)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.playerName}>
          {playerName}
        </Text>
        <Text variant="bodySmall" style={styles.currentTotal}>
          Current: {currentTotal}
        </Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          mode="outlined"
          value={value}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          placeholder="0"
          style={styles.input}
          dense
        />

        <View style={styles.previewContainer}>
          {preview.wouldGetBonus && (
            <Chip
              compact
              mode="flat"
              style={[styles.bonusChip, { backgroundColor: theme.colors.tertiaryContainer }]}
              textStyle={styles.bonusChipText}
            >
              -25 bonus!
            </Chip>
          )}
          <Text variant="bodyMedium" style={styles.projectedTotal}>
            → {preview.projectedTotal}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontWeight: '600',
  },
  currentTotal: {
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    width: 100,
    backgroundColor: 'white',
  },
  previewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bonusChip: {
    height: 28,
  },
  bonusChipText: {
    fontSize: 12,
  },
  projectedTotal: {
    fontWeight: '600',
  },
})
