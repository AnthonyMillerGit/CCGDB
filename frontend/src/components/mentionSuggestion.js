import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import MentionList from './MentionList'
import { API_URL } from '../config'

export function createMentionSuggestion(getGameIds = () => []) {
 return {
  char: '@',
  allowSpaces: true,

  items: async ({ query }) => {
    if (query.length < 2) return []
    try {
      const token = localStorage.getItem('ccgdb_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const gameIds = getGameIds()
      const gameParam = gameIds.length ? `&game_ids=${gameIds.join(',')}` : ''
      const res = await fetch(`${API_URL}/api/search/mentions?q=${encodeURIComponent(query)}${gameParam}`, { headers })
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  command: ({ editor, range, props }) => {
    if (props.type === 'card') {
      editor.chain().focus().deleteRange(range).insertCardImage({
        cardId: String(props.id),
        cardName: props.name,
        imageUrl: props.image_url || '',
        cardUrl: props.url,
      }).insertContent(' ').run()
    } else if (props.type === 'deck') {
      const token = localStorage.getItem('ccgdb_token')
      fetch(`${API_URL}/api/decks/${props.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(deck => {
          const sorted = [...(deck.cards || [])].sort((a, b) =>
            (a.card_type || '').localeCompare(b.card_type || '')
          )
          const cards = sorted.map(c => ({
            quantity: c.quantity,
            name: c.card_name,
            section: c.card_type || '',
            cardId: c.card_id,
            imageUrl: c.image_url || null,
          }))
          editor.chain().focus().deleteRange(range).insertDeckBox({
            title: deck.name,
            cards: JSON.stringify(cards),
            game: deck.game_name || '',
          }).run()
        })
        .catch(() => {
          editor.chain().focus().deleteRange(range)
            .insertContent({ type: 'text', marks: [{ type: 'link', attrs: { href: props.url } }], text: props.name })
            .insertContent(' ').unsetLink().run()
        })
    } else {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'text',
          marks: [{ type: 'link', attrs: { href: props.url } }],
          text: props.name,
        })
        .insertContent(' ')
        .unsetLink()
        .run()
    }
  },

  render: () => {
    let component
    let popup

    return {
      onStart(props) {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })
        if (!props.clientRect) return
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          arrow: false,
          offset: [0, 8],
          theme: 'ccgvault',
        })
      },

      onUpdate(props) {
        component?.updateProps(props)
        if (props.clientRect) {
          popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
        }
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }
        return component?.ref?.onKeyDown(props) ?? false
      },

      onExit() {
        popup?.[0]?.destroy()
        component?.destroy()
      },
    }
  },
 }
}
