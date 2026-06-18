import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import { TableKit } from '@tiptap/extension-table'
import { marked } from 'marked'
import { API_URL } from '../config'
import { useAuth } from '../context/AuthContext'
import { createMentionSuggestion } from '../components/mentionSuggestion'
import { CardImageBlock } from '../extensions/CardImageBlock.jsx'
import { DeckBoxBlock } from '../extensions/DeckBoxBlock.jsx'
import { cleanBody } from '../utils/editorHelpers'
import EditorPreviewModal from '../components/editor/EditorPreviewModal'
import EditorMenuBar from '../components/editor/EditorMenuBar'
import EditorCardPickerModal from '../components/editor/EditorCardPickerModal'
import EditorDeckBuilderModal from '../components/editor/EditorDeckBuilderModal'
import EditorTagSearch from '../components/editor/EditorTagSearch'
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

function toLocalInput(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  const [publishedAt, setPublishedAt] = useState(() => toLocalInput(new Date().toISOString()))
  const [gameTags, setGameTags] = useState([])
  const [cardTags, setCardTags] = useState([])
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [showDeckBuilder, setShowDeckBuilder] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showMdImport, setShowMdImport] = useState(false)
  const [mdText, setMdText] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)
  const dirtyRef = useRef(false)

  const gameTagIdsRef = useRef([])
  useEffect(() => {
    gameTagIdsRef.current = gameTags.map(g => g.game_id)
  }, [gameTags])

  const editor = useEditor({
    extensions: [
      StarterKit,
      CardImageBlock,
      DeckBoxBlock,
      Placeholder.configure({ placeholder: 'Write something amazing… Use @ to link cards, games, or sets.' }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Mention.configure({ suggestion: createMentionSuggestion(() => gameTagIdsRef.current) }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    onUpdate: () => {
      dirtyRef.current = true
      setSaveStatus('unsaved')
    },
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
      setPublishedAt(post.published_at ? toLocalInput(post.published_at) : '')
      setGameTags(post.game_tags || [])
      setCardTags(post.card_tags || [])
      setCoverImageUrl(post.cover_image_url || '')
      if (post.body && Object.keys(post.body).length > 0) {
        editor.commands.setContent(post.body)
      }
    }
    loadPost()
  }, [isEdit, slug, editor, authFetch, navigate])

  function autoSlug(t) {
    return t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
  }

  const handleCardInsert = useCallback((attrs) => {
    setShowCardPicker(false)
    editor?.chain().focus().insertCardImage(attrs).run()
  }, [editor])

  const handleDeckInsert = useCallback((attrs) => {
    setShowDeckBuilder(false)
    editor?.chain().focus().insertDeckBox(attrs).run()
  }, [editor])

  function handleImportMarkdown() {
    if (!editor || !mdText.trim()) return
    // Markdown → HTML → TipTap nodes (parsed via the registered extensions,
    // so headings/lists/tables/images all become real editor blocks).
    const html = marked.parse(mdText, { breaks: false, gfm: true })
    editor.chain().focus().insertContent(html).run()
    setMdText('')
    setShowMdImport(false)
  }

  async function handleSave(publish) {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      slug: postSlug || autoSlug(title),
      excerpt: excerpt.trim() || null,
      body: cleanBody(editor.getJSON()),
      post_type: postType,
      cover_image_url: coverImageUrl.trim() || null,
      game_ids: gameTags.map(t => t.game_id),
      card_ids: cardTags.map(t => t.card_id),
      set_ids: [],
    }

    if (publish) {
      payload.published_at = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString()
    }

    const url = isEdit ? `${API_URL}/api/admin/posts/${slug}` : `${API_URL}/api/admin/posts`
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res = await authFetch(url, { method, body: JSON.stringify(payload) })
      if (res.ok) {
        const data = await res.json()
        const finalSlug = isEdit ? (payload.slug || slug) : data.slug
        const willBePublic = publish && payload.published_at && new Date(payload.published_at) <= new Date()
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

  const autoSave = useCallback(async () => {
    if (!isEdit || !editor || !title.trim()) return
    setSaveStatus('saving')
    const payload = {
      title: title.trim(),
      slug: postSlug || autoSlug(title),
      excerpt: excerpt.trim() || null,
      body: cleanBody(editor.getJSON()),
      post_type: postType,
      cover_image_url: coverImageUrl.trim() || null,
      game_ids: gameTags.map(t => t.game_id),
      card_ids: cardTags.map(t => t.card_id),
      set_ids: [],
    }
    try {
      const res = await authFetch(`${API_URL}/api/admin/posts/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        dirtyRef.current = false
        setSaveStatus('saved')
      } else {
        setSaveStatus('unsaved')
      }
    } catch {
      setSaveStatus('unsaved')
    }
  }, [isEdit, editor, title, postSlug, excerpt, postType, publishedAt, gameTags, cardTags, authFetch, slug])

  useEffect(() => {
    if (!isEdit) return
    const id = setInterval(() => { if (dirtyRef.current) autoSave() }, 30_000)
    return () => clearInterval(id)
  }, [isEdit, autoSave])

  const inputStyle = { backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const typeColor = POST_TYPE_COLORS[postType]

  if (showPreview) {
    return (
      <EditorPreviewModal
        body={editor?.getJSON()}
        postTitle={title}
        onClose={() => setShowPreview(false)}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {showCardPicker && (
        <EditorCardPickerModal
          onInsert={handleCardInsert}
          onClose={() => setShowCardPicker(false)}
        />
      )}
      {showDeckBuilder && (
        <EditorDeckBuilderModal
          onInsert={handleDeckInsert}
          onClose={() => setShowDeckBuilder(false)}
        />
      )}
      {showMdImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowMdImport(false)}>
          <div className="w-full max-w-2xl rounded-xl p-5" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Import Markdown</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Paste Markdown — headings, lists, tables, links, and images convert to editor blocks and insert at your cursor.
            </p>
            <textarea
              value={mdText} onChange={e => setMdText(e.target.value)} rows={12} autoFocus
              placeholder={'# Heading\n\nSome **bold** text and a [link](https://…).\n\n| Col | Col |\n|-----|-----|\n| a   | b   |'}
              className="w-full px-3 py-2 rounded text-sm font-mono resize-y outline-none"
              style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setShowMdImport(false)}
                className="px-4 py-2 rounded text-sm font-semibold"
                style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button type="button" onClick={handleImportMarkdown} disabled={!mdText.trim()}
                className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <RouterLink to="/admin/posts" className="text-sm" style={{ color: 'var(--text-muted)' }}>← Posts</RouterLink>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Post' : 'New Post'}</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-4 py-1.5 rounded text-sm font-semibold"
          style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          Preview →
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded text-sm"
          style={{ backgroundColor: '#3a1a1a', border: '1px solid #6a2d2d', color: 'var(--accent-maroon)' }}>
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input
          type="text" placeholder="Post title" value={title}
          onChange={e => { setTitle(e.target.value); if (!isEdit) setPostSlug(autoSlug(e.target.value)) }}
          className="flex-1 px-4 py-3 rounded-lg text-xl font-bold outline-none"
          style={inputStyle}
        />
        <select value={postType} onChange={e => setPostType(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-semibold outline-none"
          style={{ ...inputStyle, color: typeColor || 'var(--text-muted)', border: `1px solid ${typeColor ? typeColor + '66' : 'var(--border)'}`, minWidth: 160 }}>
          {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <input
          type="text" placeholder="Slug (auto-generated from title)" value={postSlug}
          onChange={e => setPostSlug(e.target.value)}
          className="w-full px-3 py-2 rounded text-sm font-mono outline-none"
          style={inputStyle}
        />
        <textarea
          placeholder="Short excerpt (shows in post previews)" value={excerpt}
          onChange={e => setExcerpt(e.target.value)} rows={2}
          className="w-full px-3 py-2 rounded text-sm resize-none outline-none"
          style={inputStyle}
        />
        <div className="flex items-center gap-3">
          <input
            type="url"
            placeholder="Cover image URL (optional — shown as banner on blog listing)"
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={inputStyle}
          />
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt="Cover preview"
              style={{ height: 38, width: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid var(--border)' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden mb-5" style={{ border: '1px solid var(--border)' }}>
        <EditorMenuBar
          editor={editor}
          onOpenCardPicker={() => setShowCardPicker(true)}
          onOpenDeckBuilder={() => setShowDeckBuilder(true)}
          onImportMarkdown={() => setShowMdImport(true)}
        />
        <div style={{ backgroundColor: 'var(--bg-chip)' }}>
          <EditorContent editor={editor} />
        </div>
        <div className="px-5 py-2 text-xs border-t" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span>@ to link a card/game/set</span>
          <span className="mx-2" style={{ opacity: 0.4 }}>·</span>
          <span>🎴 Card Image inserts a floating card photo</span>
          <span className="mx-2" style={{ opacity: 0.4 }}>·</span>
          <span>🃏 Deck builds a deck list with hover previews</span>
        </div>
      </div>

      <div className="p-4 rounded-lg mb-5 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <EditorTagSearch
          label="Games" searchUrl={`${API_URL}/api/games?q=`}
          selected={gameTags}
          onAdd={g => setGameTags(prev => prev.find(t => t.game_id === g.id) ? prev : [...prev, { game_id: g.id, game_name: g.name, game_slug: g.slug }])}
          onRemove={id => setGameTags(prev => prev.filter(t => t.game_id !== id))}
          displayKey="game_name" idKey="game_id"
        />
        <EditorTagSearch
          label="Cards" searchUrl={`${API_URL}/api/cards/search?name=`}
          selected={cardTags}
          onAdd={c => setCardTags(prev => prev.find(t => t.card_id === c.id) ? prev : [...prev, { card_id: c.id, card_name: c.name }])}
          onRemove={id => setCardTags(prev => prev.filter(t => t.card_id !== id))}
          displayKey="card_name" idKey="card_id"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Publish date</label>
          <input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)}
            className="px-3 py-1.5 rounded text-sm outline-none" style={inputStyle} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saveStatus && (
            <span className="text-xs" style={{
              color: saveStatus === 'unsaved' ? '#fb923c'
                : saveStatus === 'saving' ? 'var(--text-muted)'
                : '#4ade80',
            }}>
              {saveStatus === 'unsaved' ? 'Unsaved changes'
                : saveStatus === 'saving' ? 'Saving…'
                : 'Saved'}
            </span>
          )}
          {isEdit && publishedAt && new Date(publishedAt) <= new Date() && (
            <button type="button" onClick={handleUnpublish} disabled={saving}
              className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-chip)', color: 'var(--accent-maroon)', border: '1px solid var(--border)' }}>
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
