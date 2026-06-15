import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native'
import { API_URL } from '../api/config'

function formatDate(str) {
  if (!str) return null
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function GameDetailScreen({ route, navigation }) {
  const { gameSlug, gameName } = route.params
  const [sets, setSets] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    navigation.setOptions({ title: gameName })
    fetch(`${API_URL}/api/games/${gameSlug}/sets`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setSets(list)
        setFiltered(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [gameSlug])

  const onSearch = useCallback((text) => {
    setSearch(text)
    if (!text.trim()) {
      setFiltered(sets)
    } else {
      const q = text.toLowerCase()
      setFiltered(sets.filter(s => s.name.toLowerCase().includes(q)))
    }
  }, [sets])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#08D9D6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search sets..."
        placeholderTextColor="#8892a4"
        value={search}
        onChangeText={onSearch}
      />
      <Text style={styles.countLabel}>
        {filtered.length} set{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('SetDetail', {
              setId: item.id,
              setName: item.name,
              gameSlug,
              gameName,
            })}
          >
            {item.icon_url ? (
              <Image
                source={{ uri: item.icon_url }}
                style={styles.icon}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.icon} />
            )}
            <View style={styles.rowBody}>
              <Text style={styles.setName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.meta}>
                {item.set_type && (
                  <Text style={styles.chip}>{item.set_type}</Text>
                )}
                {item.release_date && (
                  <Text style={styles.metaText}>{formatDate(item.release_date)}</Text>
                )}
              </View>
            </View>
            <View style={styles.cardCount}>
              {item.total_cards != null && (
                <>
                  <Text style={styles.countNumber}>{item.total_cards}</Text>
                  <Text style={styles.countLabel2}>cards</Text>
                </>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No sets found.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252A34',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252A34',
  },
  searchInput: {
    margin: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2d3243',
    color: '#EAEAEA',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#363d52',
  },
  countLabel: {
    color: '#8892a4',
    fontSize: 12,
    marginLeft: 12,
    marginBottom: 4,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#363d52',
    marginLeft: 56,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  setName: {
    color: '#EAEAEA',
    fontSize: 15,
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    color: '#08D9D6',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  metaText: {
    color: '#8892a4',
    fontSize: 11,
  },
  cardCount: {
    alignItems: 'flex-end',
    gap: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countNumber: {
    color: '#8892a4',
    fontSize: 13,
    fontWeight: '500',
  },
  countLabel2: {
    color: '#8892a4',
    fontSize: 11,
  },
  chevron: {
    color: '#8892a4',
    fontSize: 20,
    lineHeight: 22,
  },
  emptyText: {
    color: '#8892a4',
    marginTop: 60,
    fontSize: 15,
  },
})
