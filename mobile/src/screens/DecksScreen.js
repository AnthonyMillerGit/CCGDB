import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../api/config'

export default function DecksScreen({ navigation }) {
  const { user } = useAuth()

  if (!user) return <AuthGate navigation={navigation} />

  return <DecksList navigation={navigation} />
}

function AuthGate({ navigation }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.gateTitle}>Your Decks</Text>
      <Text style={styles.gateSubtitle}>Sign in to build and manage decks for any game.</Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.primaryBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.secondaryBtnText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  )
}

function DecksList({ navigation }) {
  const { authFetch } = useAuth()
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    authFetch(`${API_URL}/api/users/me/decks`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setDecks(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authFetch])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const confirmDelete = useCallback((deck) => {
    Alert.alert(
      'Delete deck',
      `Delete "${deck.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authFetch(`${API_URL}/api/decks/${deck.id}`, { method: 'DELETE' })
              if (res.ok) setDecks(prev => prev.filter(d => d.id !== deck.id))
            } catch { /* ignore */ }
          },
        },
      ]
    )
  }, [authFetch])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#08D9D6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.newBtn}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateDeck')}
      >
        <Text style={styles.newBtnText}>＋ New Deck</Text>
      </TouchableOpacity>

      {decks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No decks yet</Text>
          <Text style={styles.emptySubtitle}>Tap “New Deck” to start building.</Text>
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <DeckRow
              deck={item}
              onPress={() => navigation.navigate('DeckDetail', { deckId: item.id, deckName: item.name })}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}
    </View>
  )
}

function DeckRow({ deck, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      {deck.thumbnail_url ? (
        <Image source={{ uri: deck.thumbnail_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
        <Text style={styles.gameName} numberOfLines={1}>{deck.game_name}</Text>
        <Text style={styles.cardCount}>
          {deck.total_cards} card{deck.total_cards !== 1 ? 's' : ''}
          {deck.format ? ` · ${deck.format}` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252A34',
    padding: 32,
    gap: 12,
  },
  gateTitle: { color: '#EAEAEA', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  gateSubtitle: {
    color: '#8892a4', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: '#08D9D6', borderRadius: 10, paddingVertical: 13,
    paddingHorizontal: 40, alignItems: 'center', width: '100%',
  },
  primaryBtnText: { color: '#252A34', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1, borderColor: '#363d52', borderRadius: 10, paddingVertical: 13,
    paddingHorizontal: 40, alignItems: 'center', width: '100%',
  },
  secondaryBtnText: { color: '#EAEAEA', fontSize: 16, fontWeight: '600' },
  newBtn: {
    margin: 12,
    backgroundColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  newBtnText: { color: '#252A34', fontSize: 15, fontWeight: '700' },
  listContent: { paddingBottom: 20 },
  separator: { height: 1, backgroundColor: '#363d52', marginLeft: 76 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  thumb: { width: 44, height: 62, borderRadius: 5, backgroundColor: '#2d3243' },
  thumbPlaceholder: { backgroundColor: '#363d52' },
  rowBody: { flex: 1, gap: 3 },
  deckName: { color: '#EAEAEA', fontSize: 15, fontWeight: '700' },
  gameName: { color: '#08D9D6', fontSize: 12 },
  cardCount: { color: '#8892a4', fontSize: 12, textTransform: 'capitalize' },
  chevron: { color: '#8892a4', fontSize: 20 },
  emptyTitle: { color: '#EAEAEA', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#8892a4', fontSize: 13, textAlign: 'center' },
})
