import { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom'
import { API_URL, goToRandomCard } from './config'
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
import CollectionGamePage from './pages/CollectionGamePage'
import CollectionCardPage from './pages/CollectionCardPage'
import LandingPage from './pages/LandingPage'
import BlogPage from './pages/BlogPage'
import PostPage from './pages/PostPage'
import PostEditorPage from './pages/PostEditorPage'
import AdminPostsPage from './pages/AdminPostsPage'
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
      style={{ color: active ? '#0097a7' : '#7a6248' }}
    >
      {children}
    </Link>
  )
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const baseItems = [
    ['My Collection', '/profile'],
    ['Decks', '/profile?tab=decks'],
    ['Wishlist', '/profile?tab=wishlist'],
    ['Stats', '/profile?tab=stats'],
  ]
  const items = user?.is_admin
    ? [...baseItems, ['— Admin —', null], ['Manage Posts', '/admin/posts']]
    : baseItems

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm font-medium px-3 py-1.5 rounded flex items-center gap-2"
        style={{ backgroundColor: '#f5f0e8', border: '1px solid #d4c4a8', color: '#1c1008' }}
      >
        <span
          className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#0097a7', color: '#f5f0e8' }}
        >
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{user.username}</span>
        <span className="text-xs" style={{ color: '#7a6248' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 rounded-lg overflow-hidden z-50"
          style={{ backgroundColor: '#ffffff', border: '1px solid #d4c4a8', boxShadow: '0 8px 24px rgba(28,16,8,0.12)' }}
        >
          {items.map(([label, to]) =>
            to === null ? (
              <div key={label} className="px-4 py-1.5 text-xs font-semibold uppercase"
                style={{ color: '#9e836a', borderTop: '1px solid #d4c4a8', marginTop: '4px', paddingTop: '8px' }}>
                Admin
              </div>
            ) : (
              <Link
                key={label}
                to={to}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm transition-colors hover:bg-opacity-50"
                style={{ color: '#1c1008', textDecoration: 'none', backgroundColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#d4c4a8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {label}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}

function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()
  return (
    <header
      className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-6"
      style={{ backgroundColor: '#ffffff', borderBottom: '3px solid #0097a7' }}
    >
      <h1
        className="text-xl sm:text-2xl font-bold cursor-pointer flex-shrink-0 tracking-tight"
        style={{ color: '#8b1a3a' }}
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
          style={{ color: '#7a6248', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          🎲 Random
        </button>
      </nav>
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <SearchBar />
        {user ? (
          <UserMenu user={user} />
        ) : (
          <Link
            to="/login"
            className="text-sm font-medium px-3 py-1.5 rounded"
            style={{ backgroundColor: '#8b1a3a', color: '#ffffff' }}
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
      style={{ backgroundColor: '#eee4d4', borderColor: '#d4c4a8', color: '#7a6248' }}
    >
      <p className="text-sm">© {new Date().getFullYear()} CCGVault — built by a collector, for collectors</p>
      <a
        href="https://ko-fi.com/ccgvault"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm px-4 py-2 rounded transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#faf6ee', border: '1px solid #d4c4a8', color: '#0097a7' }}
      >
        ☕ Buy me a coffee
      </a>
      <p className="text-xs text-center max-w-2xl leading-relaxed" style={{ color: '#9e836a' }}>
        CCGVault is an independent fan site and is not affiliated with, endorsed by, or sponsored by
        any card game publisher. All card names, images, and game content are the property of their
        respective owners. CCGVault is a non-commercial reference tool for collectors and players.
        For DMCA inquiries or takedown requests, contact{' '}
        <a href="mailto:admin@ccgvault.io" style={{ color: '#7a6248' }}>admin@ccgvault.io</a>.
      </p>
    </footer>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f0e8', color: '#1c1008' }}>
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
              <Route path="/admin/posts" element={<ProtectedRoute><AdminPostsPage /></ProtectedRoute>} />
              <Route path="/admin/posts/new" element={<ProtectedRoute><PostEditorPage /></ProtectedRoute>} />
              <Route path="/admin/posts/:slug/edit" element={<ProtectedRoute><PostEditorPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/collection/:gameSlug" element={<ProtectedRoute><CollectionGamePage /></ProtectedRoute>} />
              <Route path="/collection/:gameSlug/cards/:cardId" element={<ProtectedRoute><CollectionCardPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App