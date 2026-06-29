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
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useQtyEditor } from '../hooks/useQtyEditor'
import { addToCollection, setCollectionQuantity, removeFromCollection } from '../api/collection'
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
  const { user, authFetch } = useAuth()
  const [cards, setCards] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  // owned quantities for the 'normal' finish, keyed by printing_id
  const [qtys, setQtys] = useState({})
  const { pending, run } = useQtyEditor()

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

  // Refresh owned quantities whenever the screen regains focus (e.g. after
  // editing a card on the detail screen). Hidden entirely when logged out.
  useFocusEffect(useCallback(() => {
    if (!user) { setQtys({}); return }
    let active = true
    authFetch(`${API_URL}/api/users/me/collection/set/${setId}`)
      .then(r => (r.ok ? r.json() : {}))
      .then(map => { if (active) setQtys(map && typeof map === 'object' ? map : {}) })
      .catch(() => {})
    return () => { active = false }
  }, [user, authFetch, setId]))

  const changeQty = useCallback((item, delta) => {
    const pid = item.printing_id
    const cur = qtys[pid] || 0
    const target = cur + delta
    if (target < 0) return
    return run(pid, async () => {
      if (target === 0) {
        const res = await removeFromCollection(authFetch, pid)
        if (res.ok) setQtys(q => { const n = { ...q }; delete n[pid]; return n })
      } else if (cur === 0) {
        const res = await addToCollection(authFetch, { printingId: pid, quantity: target })
        if (res.ok) { const it = await res.json(); setQtys(q => ({ ...q, [pid]: it.quantity })) }
      } else {
        const res = await setCollectionQuantity(authFetch, pid, { quantity: target })
        if (res.ok) { const it = await res.json(); setQtys(q => ({ ...q, [pid]: it.quantity })) }
      }
    })
  }, [qtys, run, authFetch])

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
        extraData={{ qtys, pending }}
        renderItem={({ item }) => (
          <CardTile
            card={item}
            showControls={!!user}
            qty={qtys[item.printing_id] || 0}
            busy={!!pending[item.printing_id]}
            onAdd={() => changeQty(item, 1)}
            onDec={() => changeQty(item, -1)}
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

function CardTile({ card, onPress, showControls, qty, busy, onAdd, onDec }) {
  const rarityColor = RARITY_COLOR[card.rarity] || '#8892a4'
  const owned = qty > 0

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        <View>
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
          {owned && (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedBadgeText}>{qty}</Text>
            </View>
          )}
          <View style={[styles.rarityUnderline, { backgroundColor: rarityColor }]} />
        </View>
      </TouchableOpacity>

      {showControls ? (
        owned ? (
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, busy && styles.stepDisabled]}
              activeOpacity={0.7}
              disabled={busy}
              onPress={onDec}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={styles.stepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepQty}>{qty}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, busy && styles.stepDisabled]}
              activeOpacity={0.7}
              disabled={busy}
              onPress={onAdd}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, busy && styles.stepDisabled]}
            activeOpacity={0.7}
            disabled={busy}
            onPress={onAdd}
          >
            <Text style={styles.addText}>＋ Add</Text>
          </TouchableOpacity>
        )
      ) : null}
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
  ownedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#08D9D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedBadgeText: {
    color: '#252A34',
    fontSize: 11,
    fontWeight: '800',
  },
  rarityUnderline: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 4,
    height: 3,
    borderRadius: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    backgroundColor: '#2d3243',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#363d52',
    paddingHorizontal: 4,
    height: 30,
  },
  stepBtn: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#08D9D6',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  stepQty: {
    color: '#EAEAEA',
    fontSize: 13,
    fontWeight: '700',
  },
  stepDisabled: {
    opacity: 0.4,
  },
  addBtn: {
    marginTop: 5,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#363d52',
    backgroundColor: '#2d3243',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#8892a4',
    fontSize: 12,
    fontWeight: '600',
  },
})
