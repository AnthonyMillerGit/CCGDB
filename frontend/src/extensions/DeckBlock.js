import { Node, mergeAttributes } from '@tiptap/core'

export const DeckBlock = Node.create({
  name: 'deckBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'pre[data-type="deckBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes(HTMLAttributes, { 'data-type': 'deckBlock' }), ['code', 0]]
  },

  addCommands() {
    return {
      insertDeckBlock: () => ({ commands }) => {
        return commands.insertContent({ type: this.name })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Mod+Enter exits the deck block downward
      'Mod-Enter': () => {
        if (!this.editor.isActive(this.name)) return false
        return this.editor.commands.exitCode()
      },
    }
  },
})
