import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { API_URL } from '../api/config'

const MIN_CHARS = 2
const DEBOUNCE_MS = 350

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

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

    const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(text.trim())}`
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setResults(Array.isArray(data) ? data : [])
        setStatus('done')
      })
      .catch(err => {
        if (err.name !== 'AbortError') setStatus('error')
      })
  }, [])

  const onChangeText = (text) => {
    setQuery(text)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS)
  }

  const onClear = () => {
    setQuery('')
    setResults([])
    setStatus('idle')
  }

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search all cards..."
            placeholderTextColor="#8892a4"
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* States */}
      {status === 'idle' && query.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.hintText}>Search across all games and cards</Text>
        </View>
      )}

      {status === 'idle' && query.length > 0 && query.trim().length < MIN_CHARS && (
        <View style={styles.centered}>
          <Text style={styles.hintText}>Keep typing…</Text>
        </View>
      )}

      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#08D9D6" />
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <Text style={styles.hintText}>Something went wrong. Try again.</Text>
        </View>
      )}

      {status === 'done' && results.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.hintText}>No results for "{query}"</Text>
        </View>
      )}

      {status === 'done' && results.length > 0 && (
        <>
          <Text style={styles.countLabel}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>
          <FlatList
            data={results}
            keyExtractor={item => String(item.printing_id)}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <ResultRow
                item={item}
                onPress={() => {
                  Keyboard.dismiss()
                  navigation.navigate('Browse', {
                    screen: 'CardDetail',
                    params: {
                      cardId: item.id,
                      printingId: item.printing_id,
                      cardName: item.name,
                    },
                  })
                }}
              />
            )}
          />
        </>
      )}
    </SafeAreaView>
  )
}

function ResultRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.card_type ? (
          <Text style={styles.cardType} numberOfLines={1}>{item.card_type}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.gameName} numberOfLines={1}>{item.game_name}</Text>
          {item.set_name ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.setName} numberOfLines={1}>{item.set_name}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252A34',
  },
  searchRow: {
    padding: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d3243',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#363d52',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    color: '#EAEAEA',
    fontSize: 15,
  },
  clearBtn: {
    color: '#8892a4',
    fontSize: 13,
    paddingLeft: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  hintText: {
    color: '#8892a4',
    fontSize: 15,
  },
  countLabel: {
    color: '#8892a4',
    fontSize: 12,
    marginLeft: 16,
    marginBottom: 4,
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#363d52',
    marginLeft: 70,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 72,
    borderRadius: 6,
    backgroundColor: '#2d3243',
  },
  thumbPlaceholder: {
    backgroundColor: '#363d52',
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    color: '#EAEAEA',
    fontSize: 15,
    fontWeight: '600',
  },
  cardType: {
    color: '#08D9D6',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  gameName: {
    color: '#8892a4',
    fontSize: 11,
  },
  metaDot: {
    color: '#8892a4',
    fontSize: 11,
  },
  setName: {
    color: '#8892a4',
    fontSize: 11,
    flexShrink: 1,
  },
  chevron: {
    color: '#8892a4',
    fontSize: 20,
  },
})
