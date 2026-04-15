import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom'
import GamesPage from './pages/GamesPage'
import SetsPage from './pages/SetsPage'
import CardsPage from './pages/CardsPage'
import CardDetailPage from './pages/CardDetailPage'
import DeckBuilderPage from './pages/DeckBuilderPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ProfilePage from './pages/ProfilePage'
import SearchBar from './components/SearchBar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'

function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()
  return (
    <header
      className="border-b px-6 py-4 flex items-center justify-between"
      style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
    >
      <h1
        className="text-2xl font-bold cursor-pointer"
        style={{ color: '#08D9D6' }}
        onClick={() => navigate('/')}
      >
        CCGVault
      </h1>
      <div className="flex items-center gap-4">
        <SearchBar />
        {user ? (
          <Link
            to="/profile"
            className="text-sm font-medium px-3 py-1.5 rounded flex items-center gap-2"
            style={{ backgroundColor: '#363d52', border: '1px solid #4a5268', color: '#08D9D6' }}
          >
            <span
              className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
            >
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            {user.username}
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-sm font-medium px-3 py-1.5 rounded"
            style={{ backgroundColor: '#08D9D6', color: '#252A34' }}
          >
            Login
          </Link>
        )}
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer
      className="border-t mt-12 px-6 py-8 flex flex-col items-center gap-3"
      style={{ borderColor: '#363d52', color: '#8892a4' }}
    >
      <p className="text-sm">© {new Date().getFullYear()} CCGVault — built by a collector, for collectors</p>
      <a
        href="https://ko-fi.com/ccgvault"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm px-4 py-2 rounded transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#2d3243', border: '1px solid #363d52', color: '#08D9D6' }}
      >
        ☕ Buy me a coffee
      </a>
      <p className="text-xs text-center max-w-2xl leading-relaxed" style={{ color: '#4a5268' }}>
        CCGVault is an independent fan site and is not affiliated with, endorsed by, or sponsored by
        any card game publisher. All card names, images, and game content are the property of their
        respective owners. CCGVault is a non-commercial reference tool for collectors and players.
        For DMCA inquiries or takedown requests, contact{' '}
        <a href="mailto:admin@ccgvault.io" style={{ color: '#8892a4' }}>admin@ccgvault.io</a>.
      </p>
    </footer>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#252A34', color: '#EAEAEA' }}>
          <Header />
          <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
            <Routes>
              <Route path="/" element={<GamesPage />} />
              <Route path="/games/:slug" element={<SetsPage />} />
              <Route path="/sets/:setId" element={<CardsPage />} />
              <Route path="/cards/:cardId" element={<CardDetailPage />} />
              <Route path="/decks/:deckId" element={<ProtectedRoute><DeckBuilderPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App