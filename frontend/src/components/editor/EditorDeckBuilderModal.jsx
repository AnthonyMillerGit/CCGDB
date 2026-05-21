import { useState } from 'react'
import { API_URL } from '../../config'

function parseDeckList(text) {
  const cards = []
  let currentSection = ''

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (/^(\/\/|#)/.test(line) || /^(Companion|Sideboard|Commander|Deck):?$/i.test(line)) {
      currentSection = line.replace(/^[/#\s]+/, '').replace(/:$/, '').trim()
      continue
    }
    if (/^(Companion|Sideboard|Commander|Deck|Creatures?|Lands?|Spells?|Instants?|Sorceries|Planeswalkers?|Artifacts?|Enchantments?):$/i.test(line)) {
      currentSection = line.replace(/:$/, '').trim()
      continue
    }

    const sideboardLine = line.match(/^SB:\s*(.+)$/)
    const actualLine = sideboardLine ? sideboardLine[1] : line
    if (sideboardLine && !currentSection) currentSection = 'Sideboard'

    const match = actualLine.match(/^(\d+)[x×]?\s+(.+?)(?:\s+\([A-Z0-9]+\))?(?:\s+\d+)?$/)
    if (match) {
      cards.push({ quantity: parseInt(match[1], 10), name: match[2].trim(), section: currentSection })
    }
  }

  return cards
}

export default function EditorDeckBuilderModal({ onInsert, onClose }) {
  const [deckText, setDeckText] = useState('')
  const [deckTitle, setDeckTitle] = useState('')
  const [building, setBuilding] = useState(false)
  const [preview, setPreview] = useState(null)

  async function handleBuild() {
    const parsed = parseDeckList(deckText)
    if (!parsed.length) return
    setBuilding(true)

    const uniqueNames = [...new Set(parsed.map(c => c.name))]
    const imageMap = {}

    await Promise.all(uniqueNames.map(async name => {
      try {
        const url = `${API_URL}/api/cards/search?name=${encodeURIComponent(name)}`
        const data = await fetch(url).then(r => r.json())
        if (!Array.isArray(data) || !data.length) return
        const exact = data.find(c => c.name.toLowerCase() === name.toLowerCase()) || data[0]
        if (exact) {
          imageMap[name] = { cardId: exact.id, imageUrl: exact.image_url || null }
        }
      } catch { /* skip */ }
    }))

    const enriched = parsed.map(card => ({
      ...card,
      cardId:   imageMap[card.name]?.cardId ?? null,
      imageUrl: imageMap[card.name]?.imageUrl ?? null,
    }))

    setPreview(enriched)
    setBuilding(false)
  }

  function handleInsert() {
    if (!preview) return
    onInsert({
      title: deckTitle.trim() || 'Deck List',
      cards: JSON.stringify(preview),
    })
  }

  const total = preview ? preview.reduce((s, c) => s + c.quantity, 0) : 0
  const found = preview ? preview.filter(c => c.imageUrl).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-xl rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Insert Deck List</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <input
            type="text"
            value={deckTitle}
            onChange={e => setDeckTitle(e.target.value)}
            placeholder="Deck name (optional)"
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          {!preview ? (
            <>
              <textarea
                value={deckText}
                onChange={e => setDeckText(e.target.value)}
                placeholder={`Paste your deck list here:\n\n4 Lightning Bolt\n4 Monastery Swiftspear\n// or with sections:\n// Creatures\n4 Goblin Guide\n// Spells\n4 Lightning Bolt`}
                rows={12}
                className="w-full px-3 py-2 rounded text-sm resize-none outline-none font-mono"
                style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-primary)', lineHeight: 1.6 }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Supports formats: <code style={{ color: 'var(--accent)' }}>4 Card Name</code>, <code style={{ color: 'var(--accent)' }}>4x Card Name</code>, section headers with <code style={{ color: 'var(--accent)' }}>// Creatures</code>
              </p>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {preview.length} unique cards · {total} total
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{found}/{preview.length} images found</span>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    Edit list
                  </button>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', maxHeight: 300, overflowY: 'auto' }}>
                {preview.map((card, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-chip)' }}>
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.name}
                        style={{ width: 28, height: 39, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 39, borderRadius: 3, backgroundColor: '#2e2e38', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#666', fontSize: 8 }}>?</span>
                      </div>
                    )}
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)', minWidth: 28 }}>×{card.quantity}</span>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{card.name}</span>
                    {card.section && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.section}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--bg-chip)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          {!preview ? (
            <button
              type="button"
              onClick={handleBuild}
              disabled={building || !deckText.trim()}
              className="px-5 py-2 rounded text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              {building ? 'Looking up cards…' : 'Build Deck →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 rounded text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent-maroon)', color: 'var(--bg-page)' }}>
              Insert Deck
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
