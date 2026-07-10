import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { addCardToDeck } from '../api/decks'
import { API_URL } from '../api/config'

// Shared "add this card to one of my decks" picker. Loads the user's decks,
// keeps only those for the card's game (matched by slug — the one identifier
// both CardDetail and the SetDetail grid have), and adds 1 copy on tap.
// Controlled: parent owns `visible` and provides the target card + game.
export default function DeckPickerModal({
  visible,
  onClose,
  navigation,
  cardId,
  cardName,
  gameSlug,
  gameName,
}) {
  const { authFetch } = useAuth()
  const [decks, setDecks] = useState(null) // null = not loaded yet
  const [busyId, setBusyId] = useState(null)
  const [doneId, setDoneId] = useState(null)

  // (Re)load the deck list each time the modal opens.
  useEffect(() => {
    if (!visible) return
    setDecks(null)
    setBusyId(null)
    setDoneId(null)
    let active = true
    authFetch(`${API_URL}/api/users/me/decks`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!active) return
        const list = Array.isArray(data) ? data : []
        setDecks(list.filter(d => d.game_slug === gameSlug))
      })
      .catch(() => { if (active) setDecks([]) })
    return () => { active = false }
  }, [visible, gameSlug, authFetch])

  const addToDeck = useCallback(async (deck) => {
    if (busyId) return
    setBusyId(deck.id)
    try {
      const res = await addCardToDeck(authFetch, deck.id, { cardId, quantity: 1 })
      if (res.ok) {
        setDoneId(deck.id)
        setTimeout(onClose, 700)
      }
    } catch {
      // ignore — button re-enables in finally
    } finally {
      setBusyId(null)
    }
  }, [busyId, authFetch, cardId, onClose])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1}>
          <Text style={styles.title} numberOfLines={1}>Add “{cardName}”</Text>
          <Text style={styles.sub}>{gameName} decks</Text>

          {decks === null ? (
            <View style={styles.loading}><ActivityIndicator color="#08D9D6" /></View>
          ) : decks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No {gameName} decks yet.</Text>
              <TouchableOpacity
                style={styles.newBtn}
                activeOpacity={0.85}
                onPress={() => {
                  onClose()
                  navigation.navigate('DecksTab', { screen: 'CreateDeck' })
                }}
              >
                <Text style={styles.newBtnText}>＋ New Deck</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.list}>
              {decks.map(deck => (
                <TouchableOpacity
                  key={deck.id}
                  style={styles.deckRow}
                  activeOpacity={0.7}
                  disabled={!!busyId}
                  onPress={() => addToDeck(deck)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                    <Text style={styles.deckMeta}>
                      {deck.total_cards} card{deck.total_cards !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {busyId === deck.id ? (
                    <ActivityIndicator color="#08D9D6" />
                  ) : doneId === deck.id ? (
                    <Text style={styles.added}>✓ Added</Text>
                  ) : (
                    <Text style={styles.plus}>＋</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#252A34',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#363d52',
    padding: 18,
    maxHeight: '70%',
  },
  title: {
    color: '#EAEAEA',
    fontSize: 17,
    fontWeight: '700',
  },
  sub: {
    color: '#8892a4',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  loading: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 14,
  },
  emptyText: {
    color: '#8892a4',
    fontSize: 14,
  },
  newBtn: {
    backgroundColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  newBtnText: {
    color: '#252A34',
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    flexGrow: 0,
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#2d3243',
    borderWidth: 1,
    borderColor: '#363d52',
    marginBottom: 8,
  },
  deckName: {
    color: '#EAEAEA',
    fontSize: 15,
    fontWeight: '600',
  },
  deckMeta: {
    color: '#8892a4',
    fontSize: 12,
    marginTop: 2,
  },
  plus: {
    color: '#08D9D6',
    fontSize: 22,
    fontWeight: '700',
  },
  added: {
    color: '#08D9D6',
    fontSize: 13,
    fontWeight: '700',
  },
})
