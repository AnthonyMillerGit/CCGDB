import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SectionList,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../api/config'

export default function CollectionScreen({ navigation }) {
  const { user, authFetch, logout } = useAuth()

  if (!user) {
    return <AuthGate navigation={navigation} />
  }

  return <CollectionView user={user} authFetch={authFetch} logout={logout} navigation={navigation} />
}

function AuthGate({ navigation }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.gateTitle}>Your Collection</Text>
      <Text style={styles.gateSubtitle}>Sign in to track your cards across every game.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Register')}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  )
}

function CollectionView({ user, authFetch, logout, navigation }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      authFetch(`${API_URL}/api/users/me/collection`).then(r => r.json()),
      authFetch(`${API_URL}/api/users/me/collection/stats`).then(r => r.json()),
    ])
      .then(([collection, statsData]) => {
        const grouped = Array.isArray(collection) ? collection : []
        setSections(grouped.map(group => ({
          title: group.game_name,
          slug: group.game_slug,
          cardBack: group.card_back_image,
          data: group.cards || [],
        })))
        setStats(statsData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authFetch])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#08D9D6" />
      </View>
    )
  }

  const totalCards = stats?.total_cards ?? sections.reduce((sum, s) => sum + s.data.length, 0)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.userHeader}>
        <View>
          <Text style={styles.userName}>{user.display_name || user.username}</Text>
          <Text style={styles.userMeta}>{totalCards} card{totalCards !== 1 ? 's' : ''} · {sections.length} game{sections.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptySubtitle}>Browse a set and start adding cards to your collection.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.printing_id)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <GameSectionHeader section={section} />
          )}
          renderItem={({ item }) => (
            <CollectionRow
              item={item}
              onPress={() => navigation.navigate('Browse', {
                screen: 'CardDetail',
                params: {
                  cardId: item.card_id,
                  printingId: item.printing_id,
                  cardName: item.card_name,
                },
              })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  )
}

function GameSectionHeader({ section }) {
  return (
    <View style={styles.sectionHeader}>
      {section.cardBack ? (
        <Image source={{ uri: section.cardBack }} style={styles.sectionThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.sectionThumb, styles.sectionThumbPlaceholder]} />
      )}
      <View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.data.length} card{section.data.length !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  )
}

function CollectionRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.card_name}</Text>
        <Text style={styles.setName} numberOfLines={1}>{item.set_name}</Text>
        {item.rarity && (
          <Text style={styles.rarity}>{item.rarity}</Text>
        )}
      </View>
      <View style={styles.qtyBadge}>
        <Text style={styles.qtyText}>×{item.quantity}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252A34',
    padding: 32,
    gap: 12,
  },
  gateTitle: {
    color: '#EAEAEA',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  gateSubtitle: {
    color: '#8892a4',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#252A34',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#363d52',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#EAEAEA',
    fontSize: 16,
    fontWeight: '600',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#363d52',
  },
  userName: {
    color: '#EAEAEA',
    fontSize: 17,
    fontWeight: '700',
  },
  userMeta: {
    color: '#8892a4',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363d52',
  },
  logoutText: {
    color: '#8892a4',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionThumb: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#2d3243',
  },
  sectionThumbPlaceholder: {
    backgroundColor: '#363d52',
  },
  sectionTitle: {
    color: '#EAEAEA',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: {
    color: '#8892a4',
    fontSize: 11,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#363d52',
    marginLeft: 76,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  thumb: {
    width: 44,
    height: 62,
    borderRadius: 5,
    backgroundColor: '#2d3243',
  },
  thumbPlaceholder: { backgroundColor: '#363d52' },
  rowBody: { flex: 1, gap: 3 },
  cardName: { color: '#EAEAEA', fontSize: 14, fontWeight: '600' },
  setName: { color: '#8892a4', fontSize: 12 },
  rarity: { color: '#08D9D6', fontSize: 11, textTransform: 'capitalize' },
  qtyBadge: {
    backgroundColor: '#2d3243',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#363d52',
  },
  qtyText: { color: '#EAEAEA', fontSize: 13, fontWeight: '600' },
  emptyTitle: { color: '#EAEAEA', fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: '#8892a4', fontSize: 13, textAlign: 'center', lineHeight: 20 },
})
