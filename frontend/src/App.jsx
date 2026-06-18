import { useState, useRef, useEffect } from 'react'
import { useClickOutside } from './hooks/useClickOutside'
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
import { ThemeProvider, useTheme } from './context/ThemeContext'

function NavLink({ to, children }) {
  const location = useLocation()
  const active = location.pathname === to || location.pathname.startsWith(to + '/')
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className="text-sm transition-colors"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontWeight: active ? 700 : 500,
        textDecoration: active ? 'underline' : 'none',
        textUnderlineOffset: '4px',
      }}
    >
      {children}
    </Link>
  )
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useClickOutside(ref, () => setOpen(false))

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
        style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        {user.avatar_image_url ? (
          <img
            src={user.avatar_image_url}
            alt=""
            className="rounded flex-shrink-0 object-cover"
            style={{ width: '26px', height: '36px' }}
          />
        ) : (
          <span
            className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: user.avatar_color || 'var(--accent)', color: 'var(--bg-page)' }}
          >
            {user.username.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden sm:inline">{user.username}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 rounded-lg overflow-hidden z-50"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px var(--shadow)' }}
        >
          {items.map(([label, to]) =>
            to === null ? (
              <div key={label} className="px-4 py-1.5 text-xs font-semibold uppercase"
                style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '8px' }}>
                Admin
              </div>
            ) : (
              <Link
                key={label}
                to={to}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm transition-colors hover:bg-opacity-50"
                style={{ color: 'var(--text-primary)', textDecoration: 'none', backgroundColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-chip)'}
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

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="text-sm rounded transition-colors flex items-center justify-center flex-shrink-0 min-w-[40px] min-h-[40px]"
      style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀' : '☾'}
    </button>
  )
}

function MobileNav({ open, onClose, returnFocusRef }) {
  const navigate = useNavigate()
  const panelRef = useRef(null)

  // Close on Escape, trap Tab focus inside the drawer, and restore focus to the
  // trigger on close.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const trigger = returnFocusRef?.current
    const focusables = panel?.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])')
    focusables?.[0]?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && focusables?.length) {
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      trigger?.focus()
    }
  }, [open, onClose, returnFocusRef])

  if (!open) return null
  function go(path) { onClose(); navigate(path) }
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col pt-16 pb-8 px-6 gap-6 w-64 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-header)', borderRight: '1px solid var(--border)' }}
      >
        <button onClick={() => go('/games')} className="text-left text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Games</button>
        <button onClick={() => go('/blog')} className="text-left text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Blog</button>
        <button
          onClick={() => { onClose(); goToRandomCard(navigate) }}
          className="text-left text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          🎲 Random Card
        </button>
      </div>
    </>
  )
}

function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const hamburgerRef = useRef(null)
  return (
    <>
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} returnFocusRef={hamburgerRef} />
      <header
        className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-6"
        style={{ backgroundColor: 'var(--bg-header)', borderBottom: '3px solid var(--accent)' }}
      >
        <button
          ref={hamburgerRef}
          className="md:hidden flex flex-col gap-1.5 p-1 flex-shrink-0"
          onClick={() => setMobileNavOpen(o => !o)}
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
        >
          <span className="block w-5 h-0.5" style={{ backgroundColor: 'var(--text-muted)' }} />
          <span className="block w-5 h-0.5" style={{ backgroundColor: 'var(--text-muted)' }} />
          <span className="block w-5 h-0.5" style={{ backgroundColor: 'var(--text-muted)' }} />
        </button>
        <h1
          className="text-xl sm:text-2xl font-bold cursor-pointer flex-shrink-0 tracking-tight"
          style={{ color: 'var(--accent-maroon)' }}
          onClick={() => navigate('/')}
        >
          CCGVault
        </h1>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
          <NavLink to="/games">Games</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <button
            onClick={() => goToRandomCard(navigate)}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            🎲 Random
          </button>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <SearchBar />
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium px-3 py-1.5 rounded flex-shrink-0"
              style={{ backgroundColor: 'var(--accent-maroon)', color: '#ffffff' }}
            >
              Login
            </Link>
          )}
        </div>
      </header>
    </>
  )
}

function Footer() {
  return (
    <footer
      className="border-t mt-12 px-6 py-8 flex flex-col items-center gap-3"
      style={{ backgroundColor: 'var(--bg-footer)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
    >
      <p className="text-sm">© {new Date().getFullYear()} CCGVault — built by a collector, for collectors</p>
      <a
        href="https://ko-fi.com/ccgvault"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm px-4 py-2 rounded transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)' }}
      >
        ☕ Buy me a coffee
      </a>
      <p className="text-xs text-center max-w-2xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        CCGVault is an independent fan site and is not affiliated with, endorsed by, or sponsored by
        any card game publisher. All card names, images, and game content are the property of their
        respective owners. CCGVault is a non-commercial reference tool for collectors and players.
        For DMCA inquiries or takedown requests, contact{' '}
        <a href="mailto:admin@ccgvault.io" style={{ color: 'var(--text-muted)' }}>admin@ccgvault.io</a>.
      </p>
    </footer>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
          <a href="#main-content" className="skip-link">Skip to content</a>
          <Header />
          <main id="main-content" className="flex-1 max-w-7xl 2xl:max-w-[1440px] 3xl:max-w-[1800px] ultra:max-w-[2400px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
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
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App