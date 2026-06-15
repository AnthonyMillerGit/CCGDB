import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { API_URL } from '../api/config'

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
})
