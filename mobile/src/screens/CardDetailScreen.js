import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useQtyEditor } from '../hooks/useQtyEditor'
import { addToCollection, setCollectionQuantity, removeFromCollection } from '../api/collection'
import { addCardToDeck } from '../api/decks'
import { API_URL } from '../api/config'

const FINISHES = ['normal', 'foil']

const screenWidth = Dimensions.get('window').width
const IMAGE_WIDTH = screenWidth * 0.65
const IMAGE_HEIGHT = IMAGE_WIDTH * 1.4

const RARITY_COLOR = {
  common: '#8892a4',
  uncommon: '#a8c4d4',
  rare: '#d4af37',
  mythic: '#e05c10',
  special: '#9b59b6',
  bonus: '#9b59b6',
}

// Attributes to skip — too verbose or not useful on mobile
const SKIP_ATTRS = new Set(['legalities', 'keywords', 'card_faces'])

function formatAttrKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatAttrValue(val) {
  if (val === null || val === undefined) return null
  if (Array.isArray(val)) return val.length ? val.join(', ') : null
  if (typeof val === 'object') return null
  return String(val)
}

export default function CardDetailScreen({ route, navigation }) {
  const { cardId, printingId, cardName } = route.params
  const [card, setCard] = useState(null)
  const [selectedPrinting, setSelectedPrinting] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    navigation.setOptions({ title: cardName || 'Card' })
    fetch(`${API_URL}/api/cards/${cardId}`)
      .then(r => r.json())
      .then(data => {
        setCard(data)
        const initial = data.printings?.find(p => p.id === printingId)
          ?? data.printings?.[0]
          ?? null
        setSelectedPrinting(initial)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [cardId])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#08D9D6" />
      </View>
    )
  }

  if (!card) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Card not found.</Text>
      </View>
    )
  }

  const attrs = card.attributes || {}
  const attrEntries = Object.entries(attrs)
    .filter(([k, v]) => !SKIP_ATTRS.has(k) && formatAttrValue(v) !== null)

  const rarityColor = RARITY_COLOR[(selectedPrinting?.rarity || '').toLowerCase()] || '#8892a4'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Card image */}
      <View style={styles.imageWrapper}>
        {selectedPrinting?.image_url ? (
          <Image
            source={{ uri: selectedPrinting.image_url }}
            style={styles.cardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.cardImage, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>{card.name}</Text>
          </View>
        )}
      </View>

      {/* Name + type */}
      <View style={styles.header}>
        <Text style={styles.cardName}>{card.name}</Text>
        {card.card_type ? (
          <Text style={styles.cardType}>{card.card_type}</Text>
        ) : null}
        <Text style={styles.gameName}>{card.game}</Text>
      </View>

      {/* Collection control */}
      {selectedPrinting && (
        <CollectionControl
          cardId={cardId}
          printing={selectedPrinting}
          navigation={navigation}
        />
      )}

      {/* Add to deck */}
      <DeckAddButton card={card} navigation={navigation} />

      {/* Rules text */}
      {card.rules_text ? (
        <View style={styles.section}>
          <Text style={styles.rulesText}>{card.rules_text}</Text>
        </View>
      ) : null}

      {/* Attributes */}
      {attrEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Info</Text>
          <View style={styles.attrGrid}>
            {attrEntries.map(([key, val]) => (
              <View key={key} style={styles.attrRow}>
                <Text style={styles.attrKey}>{formatAttrKey(key)}</Text>
                <Text style={styles.attrVal}>{formatAttrValue(val)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Printing info */}
      {selectedPrinting && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printing</Text>
          <View style={styles.attrGrid}>
            <View style={styles.attrRow}>
              <Text style={styles.attrKey}>Set</Text>
              <Text style={styles.attrVal}>{selectedPrinting.set_name}</Text>
            </View>
            {selectedPrinting.collector_number && (
              <View style={styles.attrRow}>
                <Text style={styles.attrKey}>Number</Text>
                <Text style={styles.attrVal}>{selectedPrinting.collector_number}</Text>
              </View>
            )}
            {selectedPrinting.rarity && (
              <View style={styles.attrRow}>
                <Text style={styles.attrKey}>Rarity</Text>
                <Text style={[styles.attrVal, { color: rarityColor, textTransform: 'capitalize' }]}>
                  {selectedPrinting.rarity}
                </Text>
              </View>
            )}
            {selectedPrinting.artist && (
              <View style={styles.attrRow}>
                <Text style={styles.attrKey}>Artist</Text>
                <Text style={styles.attrVal}>{selectedPrinting.artist}</Text>
              </View>
            )}
            {selectedPrinting.release_date && (
              <View style={styles.attrRow}>
                <Text style={styles.attrKey}>Released</Text>
                <Text style={styles.attrVal}>
                  {new Date(selectedPrinting.release_date + 'T00:00:00').toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>
          {selectedPrinting.flavor_text && (
            <Text style={styles.flavorText}>"{selectedPrinting.flavor_text}"</Text>
          )}
        </View>
      )}

      {/* Other printings */}
      {card.printings?.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Other Printings ({card.printings.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.printingsScroll}>
            {card.printings.map(p => {
              const isSelected = p.id === selectedPrinting?.id
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedPrinting(p)}
                  style={[styles.printingThumb, isSelected && styles.printingThumbSelected]}
                  activeOpacity={0.7}
                >
                  {p.image_url ? (
                    <Image
                      source={{ uri: p.image_url }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.thumbImage, styles.thumbPlaceholder]} />
                  )}
                  <Text style={styles.thumbSetName} numberOfLines={2}>{p.set_name}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

function DeckAddButton({ card, navigation }) {
  const { user, authFetch } = useAuth()
  const [visible, setVisible] = useState(false)
  const [decks, setDecks] = useState(null) // null = not loaded yet
  const [busyId, setBusyId] = useState(null)
  const [doneId, setDoneId] = useState(null)

  if (!user || !card) return null

  function open() {
    setVisible(true)
    setDecks(null)
    setDoneId(null)
    authFetch(`${API_URL}/api/users/me/decks`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setDecks(list.filter(d => d.game_id === card.game_id))
      })
      .catch(() => setDecks([]))
  }

  async function addToDeck(deck) {
    if (busyId) return
    setBusyId(deck.id)
    try {
      const res = await addCardToDeck(authFetch, deck.id, { cardId: card.id, quantity: 1 })
      if (res.ok) {
        setDoneId(deck.id)
        setTimeout(() => setVisible(false), 700)
      }
    } catch {
      // ignore
    } finally {
      setBusyId(null)
    }
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.deckAddBtn} activeOpacity={0.8} onPress={open}>
        <Text style={styles.deckAddText}>＋ Add to a deck</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Add “{card.name}”</Text>
            <Text style={styles.modalSub}>{card.game} decks</Text>

            {decks === null ? (
              <View style={styles.modalLoading}><ActivityIndicator color="#08D9D6" /></View>
            ) : decks.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No {card.game} decks yet.</Text>
                <TouchableOpacity
                  style={styles.modalNewBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setVisible(false)
                    navigation.navigate('DecksTab', { screen: 'CreateDeck' })
                  }}
                >
                  <Text style={styles.modalNewBtnText}>＋ New Deck</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {decks.map(deck => (
                  <TouchableOpacity
                    key={deck.id}
                    style={styles.modalDeckRow}
                    activeOpacity={0.7}
                    disabled={!!busyId}
                    onPress={() => addToDeck(deck)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalDeckName} numberOfLines={1}>{deck.name}</Text>
                      <Text style={styles.modalDeckMeta}>
                        {deck.total_cards} card{deck.total_cards !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {busyId === deck.id ? (
                      <ActivityIndicator color="#08D9D6" />
                    ) : doneId === deck.id ? (
                      <Text style={styles.modalAdded}>✓ Added</Text>
                    ) : (
                      <Text style={styles.modalPlus}>＋</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function CollectionControl({ cardId, printing, navigation }) {
  const { user, authFetch } = useAuth()
  // owned: array of { printing_id, finish, quantity, ... } for this card
  const [owned, setOwned] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [finish, setFinish] = useState('normal')
  const { pending, run } = useQtyEditor()

  const loadOwned = useCallback(() => {
    if (!user) { setLoaded(true); return }
    authFetch(`${API_URL}/api/users/me/collection/card/${cardId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setOwned(Array.isArray(data) ? data : [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [user, authFetch, cardId])

  useEffect(() => { loadOwned() }, [loadOwned])

  if (!user) {
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signInPrompt}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Collection', { screen: 'Login' })}
        >
          <Text style={styles.signInPromptText}>Sign in to track this card</Text>
          <Text style={styles.signInChevron}>›</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const current = owned.find(
    i => i.printing_id === printing.id && i.finish === finish
  )
  const qty = current?.quantity ?? 0
  const key = `${printing.id}:${finish}`
  const busy = !!pending[key]

  function changeQty(delta) {
    const target = qty + delta
    if (target < 0) return
    return run(key, async () => {
      if (target === 0) {
        const res = await removeFromCollection(authFetch, printing.id, finish)
        if (res.ok) {
          setOwned(prev => prev.filter(
            i => !(i.printing_id === printing.id && i.finish === finish)
          ))
        }
      } else if (!current) {
        const res = await addToCollection(authFetch, { printingId: printing.id, quantity: target, finish })
        if (res.ok) {
          const item = await res.json()
          setOwned(prev => [...prev, { ...item }])
        }
      } else {
        const res = await setCollectionQuantity(authFetch, printing.id, { quantity: target, finish })
        if (res.ok) {
          const item = await res.json()
          setOwned(prev => prev.map(
            i => (i.printing_id === printing.id && i.finish === finish)
              ? { ...i, quantity: item.quantity }
              : i
          ))
        }
      }
    })
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>My Collection</Text>

      {/* Finish toggle */}
      <View style={styles.finishToggle}>
        {FINISHES.map(f => {
          const active = f === finish
          const count = owned
            .filter(i => i.printing_id === printing.id && i.finish === f)
            .reduce((s, i) => s + i.quantity, 0)
          return (
            <TouchableOpacity
              key={f}
              style={[styles.finishOption, active && styles.finishOptionActive]}
              activeOpacity={0.8}
              onPress={() => setFinish(f)}
            >
              <Text style={[styles.finishLabel, active && styles.finishLabelActive]}>
                {f === 'normal' ? 'Normal' : 'Foil'}{count > 0 ? ` ·${count}` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Quantity stepper / add button */}
      {!loaded ? (
        <View style={styles.stepperRow}>
          <ActivityIndicator color="#08D9D6" />
        </View>
      ) : qty === 0 ? (
        <TouchableOpacity
          style={[styles.addButton, busy && styles.disabled]}
          activeOpacity={0.85}
          disabled={busy}
          onPress={() => changeQty(1)}
        >
          <Text style={styles.addButtonText}>+ Add to Collection</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepperBtn, busy && styles.disabled]}
            activeOpacity={0.7}
            disabled={busy}
            onPress={() => changeQty(-1)}
          >
            <Text style={styles.stepperBtnText}>−</Text>
          </TouchableOpacity>
          <View style={styles.stepperQtyWrap}>
            <Text style={styles.stepperQty}>{qty}</Text>
            <Text style={styles.stepperQtyLabel}>owned</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepperBtn, busy && styles.disabled]}
            activeOpacity={0.7}
            disabled={busy}
            onPress={() => changeQty(1)}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252A34',
  },
  content: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252A34',
  },
  errorText: {
    color: '#8892a4',
    fontSize: 15,
  },
  imageWrapper: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1e2230',
  },
  cardImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: 12,
  },
  imagePlaceholder: {
    backgroundColor: '#2d3243',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8892a4',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 4,
  },
  cardName: {
    color: '#EAEAEA',
    fontSize: 22,
    fontWeight: '700',
  },
  cardType: {
    color: '#08D9D6',
    fontSize: 14,
  },
  gameName: {
    color: '#8892a4',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#8892a4',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rulesText: {
    color: '#EAEAEA',
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: '#2d3243',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#363d52',
  },
  attrGrid: {
    backgroundColor: '#2d3243',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#363d52',
    overflow: 'hidden',
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#363d52',
  },
  attrKey: {
    color: '#8892a4',
    fontSize: 13,
    flex: 1,
  },
  attrVal: {
    color: '#EAEAEA',
    fontSize: 13,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  flavorText: {
    color: '#8892a4',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 10,
  },
  printingsScroll: {
    marginTop: 4,
  },
  printingThumb: {
    width: 80,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  printingThumbSelected: {
    borderColor: '#08D9D6',
  },
  thumbImage: {
    width: '100%',
    aspectRatio: 0.714,
    borderRadius: 6,
    backgroundColor: '#2d3243',
  },
  thumbPlaceholder: {
    backgroundColor: '#363d52',
  },
  thumbSetName: {
    color: '#8892a4',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d3243',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#363d52',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  signInPromptText: {
    color: '#EAEAEA',
    fontSize: 14,
    fontWeight: '600',
  },
  signInChevron: {
    color: '#08D9D6',
    fontSize: 20,
  },
  finishToggle: {
    flexDirection: 'row',
    backgroundColor: '#1e2230',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#363d52',
    padding: 3,
    gap: 3,
    marginBottom: 10,
  },
  finishOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 7,
  },
  finishOptionActive: {
    backgroundColor: '#2d3243',
  },
  finishLabel: {
    color: '#8892a4',
    fontSize: 13,
    fontWeight: '600',
  },
  finishLabelActive: {
    color: '#08D9D6',
  },
  addButton: {
    backgroundColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#252A34',
    fontSize: 15,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d3243',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#363d52',
    padding: 8,
    minHeight: 60,
  },
  stepperBtn: {
    width: 48,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#363d52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: '#08D9D6',
    fontSize: 26,
    fontWeight: '600',
    lineHeight: 30,
  },
  stepperQtyWrap: {
    alignItems: 'center',
  },
  stepperQty: {
    color: '#EAEAEA',
    fontSize: 24,
    fontWeight: '700',
  },
  stepperQtyLabel: {
    color: '#8892a4',
    fontSize: 11,
    marginTop: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  deckAddBtn: {
    borderWidth: 1,
    borderColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deckAddText: {
    color: '#08D9D6',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#252A34',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#363d52',
    padding: 18,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#EAEAEA',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSub: {
    color: '#8892a4',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  modalLoading: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 14,
  },
  modalEmptyText: {
    color: '#8892a4',
    fontSize: 14,
  },
  modalNewBtn: {
    backgroundColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  modalNewBtnText: {
    color: '#252A34',
    fontSize: 15,
    fontWeight: '700',
  },
  modalList: {
    flexGrow: 0,
  },
  modalDeckRow: {
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
  modalDeckName: {
    color: '#EAEAEA',
    fontSize: 15,
    fontWeight: '600',
  },
  modalDeckMeta: {
    color: '#8892a4',
    fontSize: 12,
    marginTop: 2,
  },
  modalPlus: {
    color: '#08D9D6',
    fontSize: 22,
    fontWeight: '700',
  },
  modalAdded: {
    color: '#08D9D6',
    fontSize: 13,
    fontWeight: '700',
  },
})
