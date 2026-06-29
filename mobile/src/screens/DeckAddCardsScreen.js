import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useQtyEditor } from '../hooks/useQtyEditor'
import { addCardToDeck, setDeckCardQuantity, removeCardFromDeck } from '../api/decks'
import { API_URL } from '../api/config'

const MIN_CHARS = 2
const DEBOUNCE_MS = 350

export default function DeckAddCardsScreen({ route, navigation }) {
  const { deckId, gameSlug, gameName } = route.params
  const { authFetch } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [inDeck, setInDeck] = useState({}) // card_id -> quantity
  const { pending, run } = useQtyEditor()
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    navigation.setOptions({ title: `Add to Deck` })
    authFetch(`${API_URL}/api/decks/${deckId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.cards) {
          const map = {}
          for (const c of data.cards) map[c.card_id] = c.quantity
          setInDeck(map)
        }
      })
      .catch(() => {})
  }, [deckId, authFetch, navigation])

  const runSearch = useCallback((text) => {
    if (abortRef.current) abortRef.current.abort()
    if (text.trim().length < MIN_CHARS) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(text.trim())}&game=${encodeURIComponent(gameSlug)}`
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setResults(Array.isArray(data) ? data : [])
        setStatus('done')
      })
      .catch(err => { if (err.name !== 'AbortError') setStatus('error') })
  }, [gameSlug])

  const onChangeText = (text) => {
    setQuery(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS)
  }

  useEffect(() => () => {
    clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const changeQty = useCallback((card, delta) => {
    const cid = card.id
    const cur = inDeck[cid] || 0
    const target = cur + delta
    if (target < 0) return
    return run(cid, async () => {
      if (delta > 0) {
        // POST increments by quantity — works for both first add and bumps
        const res = await addCardToDeck(authFetch, deckId, { cardId: cid, quantity: delta })
        if (res.ok) { const r = await res.json(); setInDeck(m => ({ ...m, [cid]: r.quantity })) }
      } else if (target === 0) {
        const res = await removeCardFromDeck(authFetch, deckId, cid)
        if (res.ok) setInDeck(m => { const n = { ...m }; delete n[cid]; return n })
      } else {
        const res = await setDeckCardQuantity(authFetch, deckId, cid, target)
        if (res.ok) { const r = await res.json(); setInDeck(m => ({ ...m, [cid]: r.quantity })) }
      }
    })
  }, [authFetch, deckId, inDeck, run])

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Text style={styles.scopeNote}>Searching {gameName}</Text>
        <TextInput
          style={styles.input}
          placeholder="Search cards..."
          placeholderTextColor="#8892a4"
          value={query}
          onChangeText={onChangeText}
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus
        />
      </View>

      {status === 'idle' && query.trim().length < MIN_CHARS && (
        <View style={styles.centered}><Text style={styles.muted}>Type at least 2 characters.</Text></View>
      )}
      {status === 'loading' && (
        <View style={styles.centered}><ActivityIndicator size="large" color="#08D9D6" /></View>
      )}
      {status === 'error' && (
        <View style={styles.centered}><Text style={styles.muted}>Something went wrong.</Text></View>
      )}
      {status === 'done' && results.length === 0 && (
        <View style={styles.centered}><Text style={styles.muted}>No results for “{query}”.</Text></View>
      )}
      {status === 'done' && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={item => String(item.printing_id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          extraData={{ inDeck, pending }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ResultRow
              item={item}
              qty={inDeck[item.id] || 0}
              busy={!!pending[item.id]}
              onAdd={() => changeQty(item, 1)}
              onDec={() => changeQty(item, -1)}
            />
          )}
        />
      )}
    </View>
  )
}

function ResultRow({ item, qty, busy, onAdd, onDec }) {
  return (
    <View style={styles.row}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.card_type ? <Text style={styles.cardType} numberOfLines={1}>{item.card_type}</Text> : null}
        {item.set_name ? <Text style={styles.setName} numberOfLines={1}>{item.set_name}</Text> : null}
      </View>
      {qty > 0 ? (
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, busy && styles.disabled]}
            activeOpacity={0.7} disabled={busy} onPress={onDec}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.stepText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{qty}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, busy && styles.disabled]}
            activeOpacity={0.7} disabled={busy} onPress={onAdd}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.stepText}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addBtn, busy && styles.disabled]}
          activeOpacity={0.75} disabled={busy} onPress={onAdd}
        >
          <Text style={styles.addText}>＋ Add</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34' },
  searchRow: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  scopeNote: { color: '#08D9D6', fontSize: 11, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
  input: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#2d3243', color: '#EAEAEA', fontSize: 15,
    borderWidth: 1, borderColor: '#363d52',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  muted: { color: '#8892a4', fontSize: 14 },
  list: { paddingHorizontal: 10, paddingBottom: 20 },
  separator: { height: 1, backgroundColor: '#363d52', marginLeft: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingRight: 4 },
  thumb: { width: 40, height: 56, borderRadius: 5, backgroundColor: '#2d3243' },
  thumbPlaceholder: { backgroundColor: '#363d52' },
  rowBody: { flex: 1, gap: 2 },
  cardName: { color: '#EAEAEA', fontSize: 14, fontWeight: '600' },
  cardType: { color: '#08D9D6', fontSize: 11 },
  setName: { color: '#8892a4', fontSize: 11 },
  addBtn: {
    backgroundColor: '#2d3243', borderRadius: 8, borderWidth: 1, borderColor: '#363d52',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addText: { color: '#08D9D6', fontSize: 13, fontWeight: '700' },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2d3243', borderRadius: 8, borderWidth: 1, borderColor: '#363d52',
  },
  stepBtn: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#08D9D6', fontSize: 19, fontWeight: '700', lineHeight: 22 },
  qty: { color: '#EAEAEA', fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  disabled: { opacity: 0.4 },
})
