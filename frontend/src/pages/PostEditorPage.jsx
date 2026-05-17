import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { mentionSuggestion } from '../components/mentionSuggestion'
import { DeckBlock } from '../extensions/DeckBlock'
import '../styles/editor.css'

const POST_TYPES = [
  { value: 'article',    label: 'Article' },
  { value: 'deck-tech',  label: 'Deck Tech' },
  { value: 'set-review', label: 'Set Review' },
  { value: 'tournament', label: 'Tournament Report' },
  { value: 'news',       label: 'News' },
]

const POST_TYPE_COLORS = {
  'article':    null,
  'deck-tech':  '#a78bfa',
  'set-review': '#4ade80',
  'tournament': '#fb923c',
  'news':       '#60a5fa',
}

function Divider() {
  return <span style={{ borderLeft: '1px solid var(--border)', margin: '0 2px', alignSelf: 'stretch' }} />
}

function ToolBtn({ onClick, label, active, title }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title || label}
      className="px-2 py-1 rounded text-xs font-medium transition-all duration-100 flex-shrink-0"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--bg-page)' : 'var(--text-primary)',
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  )
}

function MenuBar({ editor }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!editor) return
    const bump = () => setTick(t => t + 1)
    editor.on('selectionUpdate', bump)
    editor.on('transaction', bump)
    return () => {
      editor.off('selectionUpdate', bump)
      editor.off('transaction', bump)
    }
  }, [editor])

  function insertLink() {
    const existing = editor.getAttributes('link').href || ''
    const url = window.prompt('Link URL:', existing)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  function insertImage() {
    const url = window.prompt('Image URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      {/* Inline formatting */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} label="B" title="Bold" active={editor.isActive('bold')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} label="I" title="Italic" active={editor.isActive('italic')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} label="S̶" title="Strikethrough" active={editor.isActive('strike')} />
      <Divider />
      {/* Headings */}
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" active={editor.isActive('heading', { level: 2 })} />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" active={editor.isActive('heading', { level: 3 })} />
      <Divider />
      {/* Lists */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} label="• List" active={editor.isActive('bulletList')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1. List" active={editor.isActive('orderedList')} />
      <Divider />
      {/* Blocks */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝ Quote" active={editor.isActive('blockquote')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="</> Code" active={editor.isActive('codeBlock')} />
      <ToolBtn onClick={() => editor.chain().focus().insertDeckBlock().run()} label="🃏 Deck" title="Insert deck list block — paste your deck inside" active={editor.isActive('deckBlock')} />
      <Divider />
      {/* Media */}
      <ToolBtn onClick={insertLink} label="🔗 Link" active={editor.isActive('link')} />
      <ToolBtn onClick={insertImage} label="🖼 Image" active={false} />
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="— Rule" active={false} />
      <Divider />
      {/* History */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="↩" title="Undo" active={false} />
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="↪" title="Redo" active={false} />
    </div>
  )
}

function TagSearch({ label, searchUrl, selected, onAdd, onRemove, displayKey, idKey }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${searchUrl}${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data.slice(0, 10) : [])
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, searchUrl])

  return (
    <div>
      <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(item => (
          <span key={item[idKey]}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
            {item[displayKey]}
            <button type="button" onClick={() => onRemove(item[idKey])}
              className="ml-1 opacity-60 hover:opacity-100" style={{ color: 'var(--accent-maroon)' }}>×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="w-full px-3 py-1.5 rounded text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-10 py-1 max-h-48 overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {results.map(item => (
              <button key={item[idKey] ?? item.id} type="button"
                onMouseDown={() => { onAdd(item); setQuery(''); setResults([]); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-primary)' }}>
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PostEditorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()
  const isEdit = Boolean(slug)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [postSlug, setPostSlug] = useState('')
  const [postType, setPostType] = useState('article')
  const [publishedAt, setPublishedAt] = useState('')
  const [gameTags, setGameTags] = useState([])
  const [cardTags, setCardTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      DeckBlock,
      Placeholder.configure({ placeholder: 'Write something amazing… Use @ to mention a card, game, or set.' }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Mention.configure({ suggestion: mentionSuggestion }),
    ],
    editorProps: {
      attributes: {
        class: 'editor-content outline-none min-h-[280px] sm:min-h-[420px] px-5 py-5',
        style: 'color: var(--text-primary); font-size: 1rem; line-height: 1.75;',
      },
    },
  })

  useEffect(() => {
    if (!user?.is_admin) navigate('/blog')
  }, [user, navigate])

  useEffect(() => {
    if (!isEdit || !editor) return
    async function loadPost() {
      const res = await authFetch(`${API_URL}/api/admin/posts/${slug}`)
      if (!res.ok) { navigate('/blog'); return }
      const post = await res.json()
      setTitle(post.title)
      setExcerpt(post.excerpt || '')
      setPostSlug(post.slug)
      setPostType(post.post_type || 'article')
      setPublishedAt(post.published_at ? post.published_at.slice(0, 16) : '')
      setGameTags(post.game_tags || [])
      setCardTags(post.card_tags || [])
      if (post.body && Object.keys(post.body).length > 0) {
        editor.commands.setContent(post.body)
      }
    }
    loadPost()
  }, [isEdit, slug, editor, authFetch, navigate])

  function autoSlug(t) {
    return t.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  async function handleSave(publish) {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const resolvedPublishedAt = publish
      ? (publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString())
      : (publishedAt ? new Date(publishedAt).toISOString() : null)

    const payload = {
      title: title.trim(),
      slug: postSlug || autoSlug(title),
      excerpt: excerpt.trim() || null,
      body: editor.getJSON(),
      post_type: postType,
      published_at: resolvedPublishedAt,
      game_ids: gameTags.map(t => t.game_id),
      card_ids: cardTags.map(t => t.card_id),
      set_ids: [],
    }

    const url = isEdit ? `${API_URL}/api/admin/posts/${slug}` : `${API_URL}/api/admin/posts`
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res = await authFetch(url, { method, body: JSON.stringify(payload) })
      if (res.ok) {
        const data = await res.json()
        const finalSlug = isEdit ? (payload.slug || slug) : data.slug
        const willBePublic = resolvedPublishedAt && new Date(resolvedPublishedAt) <= new Date()
        navigate(willBePublic ? `/blog/${finalSlug}` : '/admin/posts')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || `Failed to save post (${res.status})`)
      }
    } catch {
      setError('Network error — check your connection')
    }
    setSaving(false)
  }

  async function handleUnpublish() {
    setSaving(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/admin/posts/${slug}/unpublish`, { method: 'POST' })
      if (res.ok) {
        setPublishedAt('')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Failed to unpublish')
      }
    } catch {
      setError('Network error — check your connection')
    }
    setSaving(false)
  }

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const typeColor = POST_TYPE_COLORS[postType]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <RouterLink to="/admin/posts" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Posts</RouterLink>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Post' : 'New Post'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm"
          style={{ backgroundColor: '#3a1a1a', border: '1px solid #6a2d2d', color: 'var(--accent-maroon)' }}>
          {error}
        </div>
      )}

      {/* Title + type row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={e => {
            setTitle(e.target.value)
            if (!isEdit) setPostSlug(autoSlug(e.target.value))
          }}
          className="flex-1 px-4 py-3 rounded-lg text-xl font-bold outline-none"
          style={inputStyle}
        />
        <select
          value={postType}
          onChange={e => setPostType(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-semibold outline-none"
          style={{
            ...inputStyle,
            color: typeColor || 'var(--text-muted)',
            border: `1px solid ${typeColor ? typeColor + '66' : 'var(--border)'}`,
            minWidth: 160,
          }}
        >
          {POST_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Slug + excerpt */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text"
          placeholder="Slug (auto-generated from title)"
          value={postSlug}
          onChange={e => setPostSlug(e.target.value)}
          className="w-full px-3 py-2 rounded text-sm font-mono outline-none"
          style={inputStyle}
        />
        <textarea
          placeholder="Short excerpt (shows in post previews)"
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded text-sm resize-none outline-none"
          style={inputStyle}
        />
      </div>

      {/* Editor */}
      <div className="rounded-lg overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
        <MenuBar editor={editor} />
        <div style={{ backgroundColor: 'var(--bg-chip)' }}>
          <EditorContent editor={editor} />
        </div>
        <div className="px-5 py-2 text-xs border-t" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Tip: Type <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>@</kbd> to link a card, game, or set &nbsp;·&nbsp;
          Click <strong>🃏 Deck</strong> to insert a deck list block, then paste your deck inside it &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)' }}>⌘ Enter</kbd> exits a deck or code block
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 rounded-lg mb-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <TagSearch
          label="Games"
          searchUrl={`${API_URL}/api/games?q=`}
          selected={gameTags}
          onAdd={g => setGameTags(prev => prev.find(t => t.game_id === g.id) ? prev : [...prev, { game_id: g.id, game_name: g.name, game_slug: g.slug }])}
          onRemove={id => setGameTags(prev => prev.filter(t => t.game_id !== id))}
          displayKey="game_name"
          idKey="game_id"
        />
        <TagSearch
          label="Cards"
          searchUrl={`${API_URL}/api/cards/search?name=`}
          selected={cardTags}
          onAdd={c => setCardTags(prev => prev.find(t => t.card_id === c.id) ? prev : [...prev, { card_id: c.id, card_name: c.name }])}
          onRemove={id => setCardTags(prev => prev.filter(t => t.card_id !== id))}
          displayKey="card_name"
          idKey="card_id"
        />
      </div>

      {/* Publish date + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Publish date</label>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={e => setPublishedAt(e.target.value)}
            className="px-3 py-1.5 rounded text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          {isEdit && publishedAt && new Date(publishedAt) <= new Date() && (
            <button type="button" onClick={handleUnpublish} disabled={saving}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent-maroon)', border: '1px solid #9e836a' }}>
              Unpublish
            </button>
          )}
          <button type="button" onClick={() => handleSave(false)} disabled={saving}
            className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={() => handleSave(true)} disabled={saving}
            className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
