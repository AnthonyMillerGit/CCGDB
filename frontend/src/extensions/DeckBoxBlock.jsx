import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'

function DeckBoxView({ node, deleteNode }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const cards = JSON.parse(node.attrs.cards || '[]')
  const title = node.attrs.title || 'Deck List'
  const total = cards.reduce((s, c) => s + c.quantity, 0)

  // Group cards by section
  const sections = []
  let current = { name: '', cards: [] }
  for (const card of cards) {
    if (card.section !== (current.name)) {
      if (current.cards.length) sections.push(current)
      current = { name: card.section || '', cards: [] }
    }
    current.cards.push(card)
  }
  if (current.cards.length) sections.push(current)

  function handleMouseEnter(e, globalIdx) {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverPos({ x: rect.right + 8, y: rect.top })
    setHoveredIdx(globalIdx)
  }

  const hoveredCard = hoveredIdx !== null ? cards[hoveredIdx] : null

  return (
    <NodeViewWrapper contentEditable={false}>
      <div className="deckbox-block" style={{ userSelect: 'none', position: 'relative' }}>
        <div className="deckbox-header">
          <span className="deckbox-title">🃏 {title}</span>
          <span className="deckbox-count">{total} cards</span>
          <button className="deckbox-delete" onClick={deleteNode}>×</button>
        </div>
        <div className="deckbox-body">
          {sections.map((section, si) => (
            <div key={si} className="deckbox-section">
              {section.name && (
                <div className="deckbox-section-header">{section.name}</div>
              )}
              {section.cards.map((card, ci) => {
                const globalIdx = cards.indexOf(card)
                return (
                  <div
                    key={ci}
                    className="deckbox-row"
                    onMouseEnter={e => handleMouseEnter(e, globalIdx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <span className="deckbox-qty">×{card.quantity}</span>
                    <span className="deckbox-name">{card.name}</span>
                    {card.imageUrl && <span className="deckbox-hover-indicator">◈</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {hoveredCard?.imageUrl && (
          <div
            className="deckbox-preview"
            style={{ position: 'fixed', left: hoverPos.x, top: Math.max(8, hoverPos.y - 60), zIndex: 9999, pointerEvents: 'none' }}
          >
            <img src={hoveredCard.imageUrl} alt={hoveredCard.cardName} style={{ width: 200, borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', display: 'block' }} />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const DeckBoxBlock = Node.create({
  name: 'deckBoxBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Deck List' },
      cards: { default: '[]' },
      game:  { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="deck-box"]' }]
  },

  renderHTML({ node }) {
    return ['div', {
      'data-type':  'deck-box',
      'data-title': node.attrs.title || 'Deck List',
      'data-cards': node.attrs.cards || '[]',
    }]
  },

  addCommands() {
    return {
      insertDeckBox: attrs => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(DeckBoxView)
  },
})
