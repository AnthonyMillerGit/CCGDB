import { useState, useCallback } from 'react'
import {
  View,
  Text,
  SectionList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useQtyEditor } from '../hooks/useQtyEditor'
import { setDeckCardQuantity, removeCardFromDeck } from '../api/decks'
import { API_URL } from '../api/config'

function groupByType(cards) {
  const map = {}
  for (const c of cards) {
    const key = c.card_type || 'Other'
    if (!map[key]) map[key] = []
    map[key].push(c)
  }
  return Object.keys(map)
    .sort()
    .map(type => ({
      title: type,
      count: map[type].reduce((s, c) => s + c.quantity, 0),
      data: map[type],
    }))
}

export default function DeckDetailScreen({ route, navigation }) {
  const { deckId, deckName } = route.params
  const { authFetch } = useAuth()
  const [deck, setDeck] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const { pending, run } = useQtyEditor()
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    authFetch(`${API_URL}/api/decks/${deckId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setDeck(data)
          setSections(groupByType(data.cards || []))
          navigation.setOptions({ title: data.name || deckName || 'Deck' })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authFetch, deckId, navigation, deckName])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const changeQty = useCallback((card, delta) => {
    const cid = card.card_id
    const target = card.quantity + delta
    if (target < 0) return
    return run(cid, async () => {
      let newCards
      if (target === 0) {
        const res = await removeCardFromDeck(authFetch, deckId, cid)
        if (!res.ok) return
        newCards = (deck.cards || []).filter(c => c.card_id !== cid)
      } else {
        const res = await setDeckCardQuantity(authFetch, deckId, cid, target)
        if (!res.ok) return
        newCards = (deck.cards || []).map(c =>
          c.card_id === cid ? { ...c, quantity: target } : c
        )
      }
      setDeck(d => ({ ...d, cards: newCards }))
      setSections(groupByType(newCards))
    })
  }, [authFetch, deckId, deck, run])

  const saveDeck = useCallback(async ({ name, format, description }) => {
    const res = await authFetch(`${API_URL}/api/decks/${deckId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, format, description }),
    })
    if (!res.ok) throw new Error('Save failed')
    setDeck(d => ({ ...d, name, format, description }))
    navigation.setOptions({ title: name })
  }, [authFetch, deckId, navigation])

  const deleteDeck = useCallback(() => {
    Alert.alert(
      'Delete deck',
      `Delete "${deck?.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authFetch(`${API_URL}/api/decks/${deckId}`, { method: 'DELETE' })
              if (res.ok) { setEditing(false); navigation.goBack() }
            } catch { /* ignore */ }
          },
        },
      ]
    )
  }, [authFetch, deckId, deck, navigation])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#08D9D6" />
      </View>
    )
  }

  if (!deck) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Deck not found.</Text>
      </View>
    )
  }

  const total = (deck.cards || []).reduce((s, c) => s + c.quantity, 0)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
          <Text style={styles.deckMeta}>
            {deck.game_name} · {total} card{total !== 1 ? 's' : ''}
            {deck.format ? ` · ${deck.format}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.75}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('DeckAddCards', {
            deckId,
            gameSlug: deck.game_slug,
            gameName: deck.game_name,
          })}
        >
          <Text style={styles.addBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Empty deck</Text>
          <Text style={styles.muted}>Tap “＋ Add” to find cards.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.card_id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title} ({section.count})</Text>
          )}
          renderItem={({ item }) => (
            <DeckCardRow
              card={item}
              busy={!!pending[item.card_id]}
              onInc={() => changeQty(item, 1)}
              onDec={() => changeQty(item, -1)}
            />
          )}
        />
      )}

      <EditDeckModal
        visible={editing}
        deck={deck}
        onClose={() => setEditing(false)}
        onSave={saveDeck}
        onDelete={deleteDeck}
      />
    </View>
  )
}

function EditDeckModal({ visible, deck, onClose, onSave, onDelete }) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset fields each time the modal opens
  const onShow = useCallback(() => {
    setName(deck?.name || '')
    setFormat(deck?.format || '')
    setDescription(deck?.description || '')
    setSaving(false)
  }, [deck])

  const canSave = name.trim().length > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), format: format.trim(), description: description.trim() })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onShow={onShow} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit deck</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Deck name"
            placeholderTextColor="#8892a4"
            maxLength={200}
          />

          <Text style={styles.fieldLabel}>Format (optional)</Text>
          <TextInput
            style={styles.input}
            value={format}
            onChangeText={setFormat}
            placeholder="Standard, Commander, …"
            placeholderTextColor="#8892a4"
            maxLength={100}
          />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Notes about this deck"
            placeholderTextColor="#8892a4"
            multiline
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.disabled]}
              activeOpacity={0.85}
              disabled={!canSave}
              onPress={handleSave}
            >
              {saving
                ? <ActivityIndicator color="#252A34" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.deleteLink} activeOpacity={0.7} onPress={onDelete}>
            <Text style={styles.deleteLinkText}>Delete deck</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function DeckCardRow({ card, busy, onInc, onDec }) {
  return (
    <View style={styles.row}>
      {card.image_url ? (
        <Image source={{ uri: card.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <Text style={styles.cardName} numberOfLines={2}>{card.card_name}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepBtn, busy && styles.disabled]}
          activeOpacity={0.7}
          disabled={busy}
          onPress={onDec}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{card.quantity}</Text>
        <TouchableOpacity
          style={[styles.stepBtn, busy && styles.disabled]}
          activeOpacity={0.7}
          disabled={busy}
          onPress={onInc}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#252A34', padding: 32, gap: 8,
  },
  muted: { color: '#8892a4', fontSize: 14, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#363d52',
  },
  deckName: { color: '#EAEAEA', fontSize: 18, fontWeight: '700' },
  deckMeta: { color: '#8892a4', fontSize: 12, marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: '#363d52',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: { color: '#8892a4', fontSize: 14, fontWeight: '600' },
  addBtn: {
    backgroundColor: '#08D9D6',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: { color: '#252A34', fontSize: 14, fontWeight: '700' },
  listContent: { paddingBottom: 24 },
  sectionHeader: {
    color: '#8892a4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  separator: { height: 1, backgroundColor: '#363d52', marginLeft: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thumb: { width: 36, height: 50, borderRadius: 5, backgroundColor: '#2d3243' },
  thumbPlaceholder: { backgroundColor: '#363d52' },
  cardName: { flex: 1, color: '#EAEAEA', fontSize: 14, fontWeight: '500' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d3243',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363d52',
  },
  stepBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#08D9D6', fontSize: 20, fontWeight: '700', lineHeight: 23 },
  qty: { color: '#EAEAEA', fontSize: 14, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  emptyTitle: { color: '#EAEAEA', fontSize: 18, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  modalFill: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#252A34',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#363d52',
    padding: 18,
    marginHorizontal: 24,
  },
  modalTitle: { color: '#EAEAEA', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { color: '#8892a4', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#2d3243', color: '#EAEAEA', fontSize: 15,
    borderWidth: 1, borderColor: '#363d52', marginBottom: 12,
  },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#363d52', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { color: '#EAEAEA', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#08D9D6', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  saveBtnText: { color: '#252A34', fontSize: 15, fontWeight: '700' },
  deleteLink: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  deleteLinkText: { color: '#e05c5c', fontSize: 14, fontWeight: '600' },
})
