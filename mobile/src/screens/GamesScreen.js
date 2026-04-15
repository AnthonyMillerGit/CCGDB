import { View, Text, StyleSheet } from 'react-native'

export default function GamesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>GamesScreen</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252A34', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#EAEAEA', fontSize: 18 },
})
