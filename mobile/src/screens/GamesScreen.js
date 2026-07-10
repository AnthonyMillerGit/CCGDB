import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { API_URL } from '../api/config'
import { monogramColor, monogramLabel } from '../theme/monogram'

const NUM_COLUMNS = 3
const CARD_MARGIN = 8
const screenWidth = Dimensions.get('window').width
const cardWidth = (screenWidth - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS
const cardHeight = cardWidth * 1.4 // standard card aspect ratio

export default function GamesScreen({ navigation }) {
  const [games, setGames] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

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

  const onSearch = useCallback((text) => {
    setSearch(text)
    if (!text.trim()) {
      setFiltered(games)
    } else {
      const q = text.toLowerCase()
      setFiltered(games.filter(g => g.name.toLowerCase().includes(q)))
    }
  }, [games])

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
        placeholder="Search games..."
        placeholderTextColor="#8892a4"
        value={search}
        onChangeText={onSearch}
      />
      <Text style={styles.countLabel}>
        {filtered.length} game{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <GameCard
            game={item}
            onPress={() => navigation.navigate('GameDetail', { gameSlug: item.slug, gameName: item.name })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No games found.</Text>
          </View>
        }
      />
    </View>
  )
}

function GameCard({ game, onPress }) {
  const imageUri = game.card_back_image || null
  const { bg, fg } = monogramColor(game.slug || game.name)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder, { backgroundColor: bg }]}>
          <Text style={[styles.placeholderText, { color: fg }]}>
            {monogramLabel(null, game.name)}
          </Text>
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={2}>{game.name}</Text>
    </TouchableOpacity>
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
    margin: CARD_MARGIN,
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
    marginLeft: CARD_MARGIN + 4,
    marginBottom: 4,
  },
  grid: {
    paddingHorizontal: CARD_MARGIN,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'flex-start',
    gap: CARD_MARGIN,
    marginBottom: CARD_MARGIN,
  },
  card: {
    width: cardWidth,
  },
  cardImage: {
    width: cardWidth,
    height: cardHeight,
    borderRadius: 8,
    backgroundColor: '#2d3243',
  },
  cardPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8892a4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardName: {
    color: '#EAEAEA',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 13,
  },
  emptyText: {
    color: '#8892a4',
    marginTop: 60,
    fontSize: 15,
  },
})
