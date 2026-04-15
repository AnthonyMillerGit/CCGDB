import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import MentionList from './MentionList'
import { API_URL } from '../config'

export const mentionSuggestion = {
  char: '@',
  allowSpaces: false,

  items: async ({ query }) => {
    if (query.length < 2) return []
    try {
      const res = await fetch(`${API_URL}/api/search/mentions?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  // Insert a real hyperlink instead of a mention node
  command: ({ editor, range, props }) => {
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
