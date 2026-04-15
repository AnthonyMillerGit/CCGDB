import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom'
import { API_URL } from './config'
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
import LandingPage from './pages/LandingPage'
import BlogPage from './pages/BlogPage'
import PostPage from './pages/PostPage'
import PostEditorPage from './pages/PostEditorPage'
import SearchBar from './components/SearchBar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'

function NavLink({ to, children }) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      className="text-sm font-medium transition-colors"
      style={{ color: active ? '#08D9D6' : '#8892a4' }}
    >
      {children}
    </Link>
  )
}

async function goToRandomCard(navigate) {
  try {
    const res = await fetch(`${API_URL}/api/cards/random-one`)
    const data = await res.json()
    if (data.id) navigate(`/cards/${data.id}`)
  } catch {}
}

function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()
  return (
    <header
      className="border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-6"
      style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}
    >
      <h1
        className="text-xl sm:text-2xl font-bold cursor-pointer flex-shrink-0"
        style={{ color: '#08D9D6' }}
        onClick={() => navigate('/')}
      >
        CCGVault
      </h1>
      <nav className="hidden md:flex items-center gap-6">
        <NavLink to="/games">Games</NavLink>
        <NavLink to="/blog">Blog</NavLink>
        <button
          onClick={() => goToRandomCard(navigate)}
          className="text-sm font-medium transition-colors"
          style={{ color: '#8892a4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          🎲 Random
        </button>
      </nav>
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
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
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/:slug" element={<SetsPage />} />
              <Route path="/sets/:setId" element={<CardsPage />} />
              <Route path="/cards/:cardId" element={<CardDetailPage />} />
              <Route path="/decks/:deckId" element={<ProtectedRoute><DeckBuilderPage /></ProtectedRoute>} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<PostPage />} />
              <Route path="/admin/posts/new" element={<ProtectedRoute><PostEditorPage /></ProtectedRoute>} />
              <Route path="/admin/posts/:slug/edit" element={<ProtectedRoute><PostEditorPage /></ProtectedRoute>} />
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