import { useRef, useMemo, useEffect } from 'react'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import DOMPurify from 'dompurify'
import { CardImageBlock } from '../../extensions/CardImageBlock.jsx'
import { DeckBoxBlock } from '../../extensions/DeckBoxBlock.jsx'
import { cleanBody } from '../../utils/editorHelpers'

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildDeckBoxHTML(cards, title) {
  const total = cards.reduce((s, c) => s + c.quantity, 0)
  const sections = []
  let current = { name: '', cards: [] }
  for (const card of cards) {
    const sec = card.section || ''
    if (sec !== current.name) {
      if (current.cards.length) sections.push(current)
      current = { name: sec, cards: [] }
    }
    current.cards.push(card)
  }
  if (current.cards.length) sections.push(current)

  const rowsHTML = sections.map(section => {
    const header = section.name ? `<div class="deckbox-section-header">${esc(section.name)}</div>` : ''
    const rows = section.cards.map(card => {
      const dataAttrs = card.imageUrl
        ? ` data-image-url="${esc(card.imageUrl)}" data-card-name="${esc(card.name)}"`
        : ''
      const indicator = card.imageUrl ? '<span class="deckbox-hover-indicator">◈</span>' : ''
      return `<div class="deckbox-row"${dataAttrs}><span class="deckbox-qty">×${card.quantity}</span><span class="deckbox-name">${esc(card.name)}</span>${indicator}</div>`
    }).join('')
    return header + rows
  }).join('')

  return `<div class="deckbox-block">
    <div class="deckbox-header">
      <span class="deckbox-title">🃏 ${esc(title)}</span>
      <span class="deckbox-count">${total} cards</span>
    </div>
    <div class="deckbox-body">${rowsHTML}</div>
  </div>`
}

export default function EditorPreviewModal({ body, postTitle, onClose }) {
  const previewRef = useRef(null)

  const html = useMemo(() => {
    if (!body) return ''
    try {
      const raw = generateHTML(cleanBody(body), [StarterKit, Image, Link, CardImageBlock, DeckBoxBlock])
      return DOMPurify.sanitize(raw, {
        ADD_ATTR: ['data-type', 'data-card-id', 'data-card-name', 'data-image-url', 'data-card-url', 'data-title', 'data-cards', 'data-game'],
      })
    } catch {
      return '<p style="color:#ef4444">Preview error: the document has an invalid structure.</p>'
    }
  }, [body])

  useEffect(() => {
    const el = previewRef.current
    if (!el) return

    const figs = [...el.querySelectorAll('figure[data-type="card-image"]')]
    if (figs.length) {
      const groups = [[figs[0]]]
      for (let i = 1; i < figs.length; i++) {
        const prev = groups[groups.length - 1]
        if (figs[i].previousElementSibling === prev[prev.length - 1]) {
          prev.push(figs[i])
        } else {
          groups.push([figs[i]])
        }
      }

      function hydrateFig(fig, inRow) {
        const imageUrl = fig.dataset.imageUrl
        const cardName = fig.dataset.cardName || ''
        const cardUrl = fig.dataset.cardUrl || ''
        const w = inRow ? 150 : 180
        fig.className = 'card-image-block'
        fig.style.cssText = inRow ? `max-width:${w}px;` : `display:block;float:none;margin:1.25rem 0;max-width:${w}px;`
        const a = document.createElement('a')
        a.href = cardUrl
        if (imageUrl) {
          const img = document.createElement('img')
          img.src = imageUrl
          img.alt = cardName
          img.style.cssText = `width:${w}px;border-radius:10px;display:block;box-shadow:0 4px 24px rgba(0,0,0,0.55);`
          a.appendChild(img)
        } else {
          const ph = document.createElement('div')
          ph.textContent = cardName
          ph.style.cssText = `width:${w}px;height:${Math.round(w*1.4)}px;border-radius:10px;background:#2e2e38;display:flex;align-items:center;justify-content:center;padding:1rem;text-align:center;font-size:13px;color:#8e8e9e;`
          a.appendChild(ph)
        }
        const cap = document.createElement('figcaption')
        cap.textContent = cardName
        cap.style.cssText = `text-align:center;font-size:12px;color:#8e8e9e;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${w}px;`
        fig.innerHTML = ''
        fig.appendChild(a)
        fig.appendChild(cap)
      }

      for (const group of groups) {
        const inRow = group.length > 1
        if (inRow) {
          const row = document.createElement('div')
          row.style.cssText = 'display:flex;flex-wrap:wrap;gap:1rem;margin:1.25rem 0;align-items:flex-start;'
          group[0].parentNode.insertBefore(row, group[0])
          group.forEach(f => row.appendChild(f))
        }
        group.forEach(f => hydrateFig(f, inRow))
      }
    }

    const hoverPreview = document.createElement('div')
    hoverPreview.style.cssText = 'position:fixed;z-index:10000;pointer-events:none;display:none;'
    const hoverImg = document.createElement('img')
    hoverImg.style.cssText = 'width:200px;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.8);display:block;'
    hoverPreview.appendChild(hoverImg)
    document.body.appendChild(hoverPreview)

    el.querySelectorAll('div[data-type="deck-box"]').forEach(deckEl => {
      const title = deckEl.dataset.title || 'Deck List'
      try {
        const cards = JSON.parse(deckEl.dataset.cards || '[]')
        const built = document.createElement('div')
        built.innerHTML = buildDeckBoxHTML(cards, title)
        const deckboxDiv = built.firstElementChild
        deckEl.parentNode.replaceChild(deckboxDiv, deckEl)
        deckboxDiv.querySelectorAll('.deckbox-row[data-image-url]').forEach(row => {
          row.addEventListener('mouseenter', () => {
            hoverImg.src = row.dataset.imageUrl
            const rect = row.getBoundingClientRect()
            hoverPreview.style.left = (rect.right + 8) + 'px'
            hoverPreview.style.top = Math.max(8, rect.top - 60) + 'px'
            hoverPreview.style.display = 'block'
          })
          row.addEventListener('mouseleave', () => { hoverPreview.style.display = 'none' })
        })
      } catch { /* malformed JSON — leave as-is */ }
    })

    return () => hoverPreview.remove()
  }, [html])

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Preview</span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded text-sm font-semibold"
          style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          ← Back to Editor
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {postTitle && (
            <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>{postTitle}</h1>
          )}
          <div
            ref={previewRef}
            className="editor-content"
            style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.75' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}
