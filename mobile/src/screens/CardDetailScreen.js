import { View, Text, StyleSheet } from 'react-native'

export default function CardDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>CardDetailScreen</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#EAEAEA', fontSize: 18 },
})
