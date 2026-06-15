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

const NUM_COLUMNS = 3
const CARD_MARGIN = 8
const screenWidth = Dimensions.get('window').width
const cardWidth = (screenWidth - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS
const cardHeight = cardWidth * 1.4

const RARITY_COLOR = {
  common: '#8892a4',
  uncommon: '#a8c4d4',
  rare: '#d4af37',
  mythic: '#e05c10',
  special: '#9b59b6',
  bonus: '#9b59b6',
}

export default function SetDetailScreen({ route, navigation }) {
  const { setId, setName, gameSlug, gameName } = route.params
  const [cards, setCards] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    navigation.setOptions({ title: setName })
    fetch(`${API_URL}/api/sets/${setId}/cards`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setCards(list)
        setFiltered(list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [setId])

  const onSearch = useCallback((text) => {
    setSearch(text)
    if (!text.trim()) {
      setFiltered(cards)
    } else {
      const q = text.toLowerCase()
      setFiltered(cards.filter(c => c.name.toLowerCase().includes(q)))
    }
  }, [cards])

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
        placeholder="Search cards..."
        placeholderTextColor="#8892a4"
        value={search}
        onChangeText={onSearch}
      />
      <Text style={styles.countLabel}>
        {filtered.length} card{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.printing_id)}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <CardTile
            card={item}
            onPress={() => navigation.navigate('CardDetail', {
              cardId: item.id,
              printingId: item.printing_id,
              cardName: item.name,
            })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No cards found.</Text>
          </View>
        }
      />
    </View>
  )
}

function CardTile({ card, onPress }) {
  const rarityColor = RARITY_COLOR[card.rarity] || '#8892a4'

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {card.image_url ? (
        <Image
          source={{ uri: card.image_url }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder]}>
          <Text style={styles.placeholderText} numberOfLines={3}>{card.name}</Text>
        </View>
      )}
      {card.collector_number && (
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{card.collector_number}</Text>
        </View>
      )}
      <View style={styles.rarityBar}>
        <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
      </View>
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
    position: 'relative',
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
    padding: 6,
  },
  placeholderText: {
    color: '#8892a4',
    fontSize: 10,
    textAlign: 'center',
  },
  numberBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  numberText: {
    color: '#EAEAEA',
    fontSize: 9,
    fontWeight: '600',
  },
  rarityBar: {
    alignItems: 'center',
    marginTop: 4,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})
