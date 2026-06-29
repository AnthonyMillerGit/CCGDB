import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../api/config'

export default function CreateDeckScreen({ navigation }) {
  const { authFetch } = useAuth()
  const [games, setGames] = useState([])
  const [filtered, setFiltered] = useState([])
  const [gameSearch, setGameSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [name, setName] = useState('')
  const [format, setFormat] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/games`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setGames(list)
        setFiltered(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const onGameSearch = useCallback((text) => {
    setGameSearch(text)
    const q = text.trim().toLowerCase()
    setFiltered(q ? games.filter(g => g.name.toLowerCase().includes(q)) : games)
  }, [games])

  const canCreate = selected && name.trim().length > 0 && !saving

  const create = useCallback(async () => {
    if (!canCreate) return
    setSaving(true)
    try {
      const res = await authFetch(`${API_URL}/api/users/me/decks`, {
        method: 'POST',
        body: JSON.stringify({
          game_id: selected.id,
          name: name.trim(),
          description: '',
          format: format.trim(),
        }),
      })
      if (res.ok) {
        const deck = await res.json()
        navigation.replace('DeckDetail', {
          deckId: deck.id,
          deckName: deck.name,
          gameId: selected.id,
          gameSlug: selected.slug,
        })
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [canCreate, authFetch, selected, name, format, navigation])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#08D9D6" />
      </View>
    )
  }

  // Step 1: pick a game
  if (!selected) {
    return (
      <View style={styles.container}>
        <Text style={styles.stepLabel}>1. Choose a game</Text>
        <TextInput
          style={styles.search}
          placeholder="Search games..."
          placeholderTextColor="#8892a4"
          value={gameSearch}
          onChangeText={onGameSearch}
        />
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.gameList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gameRow} activeOpacity={0.7} onPress={() => setSelected(item)}>
              {item.card_back_image ? (
                <Image source={{ uri: item.card_back_image }} style={styles.gameThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.gameThumb, styles.thumbPlaceholder]} />
              )}
              <Text style={styles.gameName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  // Step 2: name the deck
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.stepLabel}>2. Deck details</Text>

        <TouchableOpacity style={styles.selectedGame} activeOpacity={0.7} onPress={() => setSelected(null)}>
          {selected.card_back_image ? (
            <Image source={{ uri: selected.card_back_image }} style={styles.gameThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.gameThumb, styles.thumbPlaceholder]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.gameName} numberOfLines={1}>{selected.name}</Text>
            <Text style={styles.changeGame}>Change game</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="My deck"
          placeholderTextColor="#8892a4"
          value={name}
          onChangeText={setName}
          maxLength={200}
          autoFocus
        />

        <Text style={styles.fieldLabel}>Format (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Standard, Commander, …"
          placeholderTextColor="#8892a4"
          value={format}
          onChangeText={setFormat}
          maxLength={100}
        />

        <TouchableOpacity
          style={[styles.createBtn, !canCreate && styles.disabled]}
          activeOpacity={0.85}
          disabled={!canCreate}
          onPress={create}
        >
          {saving
            ? <ActivityIndicator color="#252A34" />
            : <Text style={styles.createBtnText}>Create Deck</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#252A34' },
  stepLabel: {
    color: '#8892a4', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginTop: 16, marginHorizontal: 16, marginBottom: 8,
  },
  search: {
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2d3243',
    color: '#EAEAEA',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#363d52',
  },
  gameList: { paddingBottom: 20 },
  separator: { height: 1, backgroundColor: '#363d52', marginLeft: 64 },
  gameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  gameThumb: { width: 36, height: 50, borderRadius: 5, backgroundColor: '#2d3243' },
  thumbPlaceholder: { backgroundColor: '#363d52' },
  gameName: { flex: 1, color: '#EAEAEA', fontSize: 15, fontWeight: '600' },
  chevron: { color: '#8892a4', fontSize: 20 },
  form: { padding: 16 },
  selectedGame: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#2d3243', borderRadius: 10, borderWidth: 1, borderColor: '#363d52',
    padding: 10, marginBottom: 16,
  },
  changeGame: { color: '#08D9D6', fontSize: 12, marginTop: 2 },
  fieldLabel: { color: '#8892a4', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#2d3243', color: '#EAEAEA', fontSize: 15,
    borderWidth: 1, borderColor: '#363d52', marginBottom: 16,
  },
  createBtn: {
    backgroundColor: '#08D9D6', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4, minHeight: 50, justifyContent: 'center',
  },
  createBtnText: { color: '#252A34', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.5 },
})
