import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen({ navigation }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin() {
    if (!email.trim() || !password) return
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>CCGVault</Text>
          <Text style={styles.tagline}>Your collection, everywhere.</Text>
        </View>

        <View style={styles.form}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#8892a4"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#8892a4"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, (!email.trim() || !password || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!email.trim() || !password || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#252A34" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchLink}>
            <Text style={styles.switchText}>
              Don't have an account? <Text style={styles.switchAccent}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#252A34' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    color: '#08D9D6',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: '#8892a4',
    fontSize: 14,
    marginTop: 6,
  },
  form: {
    gap: 10,
  },
  errorText: {
    color: '#e05c10',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  label: {
    color: '#8892a4',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#2d3243',
    borderWidth: 1,
    borderColor: '#363d52',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#EAEAEA',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#08D9D6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#252A34',
    fontSize: 16,
    fontWeight: '700',
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  switchText: {
    color: '#8892a4',
    fontSize: 14,
  },
  switchAccent: {
    color: '#08D9D6',
    fontWeight: '600',
  },
})
