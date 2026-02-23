import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  TextInput,
  IconButton,
  List,
  Text,
  useTheme,
} from 'react-native-paper'

interface PlayerListProps {
  players: string[]
  onPlayersChange: (players: string[]) => void
  minPlayers?: number
  maxPlayers?: number
}

export function PlayerList({
  players,
  onPlayersChange,
  minPlayers = 2,
  maxPlayers = 8,
}: PlayerListProps) {
  const [newPlayerName, setNewPlayerName] = useState('')
  const theme = useTheme()

  const addPlayer = () => {
    const trimmedName = newPlayerName.trim()
    if (trimmedName && players.length < maxPlayers) {
      onPlayersChange([...players, trimmedName])
      setNewPlayerName('')
    }
  }

  const removePlayer = (index: number) => {
    if (players.length > minPlayers) {
      onPlayersChange(players.filter((_, i) => i !== index))
    }
  }

  const updatePlayer = (index: number, name: string) => {
    const updated = [...players]
    updated[index] = name
    onPlayersChange(updated)
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Players ({players.length}/{maxPlayers})
      </Text>

      {players.map((player, index) => (
        <View key={index} style={styles.playerRow}>
          <TextInput
            mode="outlined"
            value={player}
            onChangeText={(text) => updatePlayer(index, text)}
            placeholder={`Player ${index + 1}`}
            style={styles.playerInput}
            dense
          />
          <IconButton
            icon="close"
            size={20}
            onPress={() => removePlayer(index)}
            disabled={players.length <= minPlayers}
          />
        </View>
      ))}

      {players.length < maxPlayers && (
        <View style={styles.addPlayerRow}>
          <TextInput
            mode="outlined"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            placeholder="Add player..."
            style={styles.addPlayerInput}
            dense
            onSubmitEditing={addPlayer}
            returnKeyType="done"
          />
          <IconButton
            icon="plus"
            size={20}
            onPress={addPlayer}
            disabled={!newPlayerName.trim()}
            iconColor={theme.colors.primary}
          />
        </View>
      )}

      {players.length < minPlayers && (
        <Text variant="bodySmall" style={styles.warningText}>
          Add at least {minPlayers} players to start
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerInput: {
    flex: 1,
  },
  addPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addPlayerInput: {
    flex: 1,
  },
  warningText: {
    color: '#d32f2f',
    marginTop: 8,
  },
})
