import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

function CardImageView({ node, deleteNode }) {
  const { cardName, imageUrl, cardUrl } = node.attrs
  return (
    <NodeViewWrapper contentEditable={false} style={{ display: 'block' }}>
      <figure
        className="card-image-block-editor"
        data-drag-handle
        style={{
          display: 'inline-block', float: 'left', margin: '0 1.5rem 1.5rem 0',
          position: 'relative', cursor: 'default', maxWidth: 180,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={cardName}
            style={{ width: 180, borderRadius: 10, display: 'block', boxShadow: '0 4px 24px rgba(0,0,0,0.55)' }}
          />
        ) : (
          <div style={{
            width: 180, height: 252, borderRadius: 10, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 1rem',
            backgroundColor: '#2e2e38', border: '1px solid #42424e',
          }}>
            <span style={{ color: '#8e8e9e', fontSize: 13, textAlign: 'center' }}>{cardName}</span>
          </div>
        )}
        <figcaption style={{
          textAlign: 'center', fontSize: 12, color: '#8e8e9e', marginTop: 5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
        }}>
          {cardName}
        </figcaption>
        <button
          onClick={deleteNode}
          style={{
            position: 'absolute', top: 4, right: 4, width: 20, height: 20,
            background: 'rgba(0,0,0,0.75)', border: 'none', borderRadius: '50%',
            color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </figure>
      {/* Clearfix so next content doesn't wrap oddly in editor */}
      <div style={{ clear: 'both' }} />
    </NodeViewWrapper>
  )
}

export const CardImageBlock = Node.create({
  name: 'cardImageBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      cardId:   { default: null },
      cardName: { default: '' },
      imageUrl: { default: null },
      cardUrl:  { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="card-image"]' }]
  },

  renderHTML({ node }) {
    const { cardName, imageUrl, cardUrl, cardId } = node.attrs
    return ['figure', {
      'data-type':      'card-image',
      'data-card-id':   String(cardId ?? ''),
      'data-card-name': cardName,
      'data-image-url': imageUrl ?? '',
      'data-card-url':  cardUrl,
    }]
  },

  addCommands() {
    return {
      insertCardImage: attrs => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardImageView)
  },
})
