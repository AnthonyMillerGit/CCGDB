import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useQtyEditor } from '../hooks/useQtyEditor'
import { addToCollection, setCollectionQuantity, removeFromCollection } from '../api/collection'
import { API_URL } from '../api/config'
import DeckPickerModal from '../components/DeckPickerModal'

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

// Sort options for the set grid. `short` shows in the trigger; `label` in the sheet.
const SORTS = [
  { key: 'number', short: 'Number', label: 'Collector number' },
  { key: 'name', short: 'Name', label: 'Name (A–Z)' },
  { key: 'rarity', short: 'Rarity', label: 'Rarity' },
  { key: 'type', short: 'Type', label: 'Type' },
]

// Rarity tiers vary wildly per game; rank the standard ones and drop everything
// else into one bucket that then sorts alphabetically among itself.
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus']
function rarityRank(r) {
  const i = RARITY_ORDER.indexOf((r || '').toLowerCase())
  return i === -1 ? RARITY_ORDER.length : i
}

// Numeric-aware compare so "2" precedes "10" and alphanumeric numbers behave.
function naturalCompare(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function sortCards(cards, key) {
  const arr = [...cards]
  const byNum = (a, b) => naturalCompare(a.collector_number, b.collector_number)
  switch (key) {
    case 'name':
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || '') || byNum(a, b))
      break
    case 'rarity':
      arr.sort((a, b) =>
        (rarityRank(a.rarity) - rarityRank(b.rarity)) ||
        (a.rarity || '').localeCompare(b.rarity || '') ||
        byNum(a, b))
      break
    case 'type':
      arr.sort((a, b) => (a.card_type || '').localeCompare(b.card_type || '') || byNum(a, b))
      break
    default:
      arr.sort(byNum)
  }
  return arr
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
  // card whose "add to deck" picker is open (null = closed). One modal for the
  // whole grid rather than one per tile.
  const [deckCard, setDeckCard] = useState(null)
  const [sortKey, setSortKey] = useState('number')
  const [sortOpen, setSortOpen] = useState(false)

  const sorted = useMemo(() => sortCards(filtered, sortKey), [filtered, sortKey])
  const activeSort = SORTS.find(s => s.key === sortKey) || SORTS[0]

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
      <View style={styles.countRow}>
        <Text style={styles.countLabel}>
          {sorted.length} card{sorted.length !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ''}
        </Text>
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setSortOpen(true)}
        >
          <Text style={styles.sortBtnText}>⇅ {activeSort.short}</Text>
          <Text style={styles.sortCaret}>▾</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={sorted}
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
            onDeckAdd={() => setDeckCard(item)}
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

      <DeckPickerModal
        visible={!!deckCard}
        onClose={() => setDeckCard(null)}
        navigation={navigation}
        cardId={deckCard?.id}
        cardName={deckCard?.name}
        gameSlug={gameSlug}
        gameName={gameName}
      />

      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSortOpen(false)}
        >
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <Text style={styles.sheetTitle}>Sort by</Text>
            {SORTS.map(s => {
              const active = s.key === sortKey
              return (
                <TouchableOpacity
                  key={s.key}
                  style={styles.sheetRow}
                  activeOpacity={0.7}
                  onPress={() => { setSortKey(s.key); setSortOpen(false) }}
                >
                  <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>
                    {s.label}
                  </Text>
                  {active && <Text style={styles.sheetCheck}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function CardTile({ card, onPress, showControls, qty, busy, onAdd, onDec, onDeckAdd }) {
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
          {/* Deck quick-add pill — logged-in only. Sits on the image so it adds
              no tile height and stays clear of the collection controls below.
              Nested Touchable captures the tap, so it won't also open detail. */}
          {showControls && (
            <TouchableOpacity
              style={styles.deckPill}
              activeOpacity={0.8}
              onPress={onDeckAdd}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.deckPillText}>＋ Deck</Text>
            </TouchableOpacity>
          )}
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
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: CARD_MARGIN + 4,
    marginRight: CARD_MARGIN,
    marginBottom: 6,
  },
  countLabel: {
    color: '#8892a4',
    fontSize: 12,
    flexShrink: 1,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363d52',
    backgroundColor: '#2d3243',
    marginLeft: 8,
  },
  sortBtnText: {
    color: '#08D9D6',
    fontSize: 12,
    fontWeight: '700',
  },
  sortCaret: {
    color: '#08D9D6',
    fontSize: 10,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#252A34',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#363d52',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  sheetTitle: {
    color: '#8892a4',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  sheetRowText: {
    color: '#EAEAEA',
    fontSize: 16,
  },
  sheetRowTextActive: {
    color: '#08D9D6',
    fontWeight: '700',
  },
  sheetCheck: {
    color: '#08D9D6',
    fontSize: 16,
    fontWeight: '700',
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
  deckPill: {
    position: 'absolute',
    bottom: 8,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#08D9D6',
    backgroundColor: 'rgba(30,34,48,0.9)',
  },
  deckPillText: {
    color: '#08D9D6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
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
