import { useState, useEffect } from 'react'

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

export default function EditorMenuBar({ editor, onOpenCardPicker, onOpenDeckBuilder, onImportMarkdown }) {
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
    if (!url) { editor.chain().focus().unsetLink().run(); return }
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
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} label="B" title="Bold" active={editor.isActive('bold')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} label="I" title="Italic" active={editor.isActive('italic')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} label="S̶" title="Strikethrough" active={editor.isActive('strike')} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" active={editor.isActive('heading', { level: 2 })} />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" active={editor.isActive('heading', { level: 3 })} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} label="• List" active={editor.isActive('bulletList')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1. List" active={editor.isActive('orderedList')} />
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝ Quote" active={editor.isActive('blockquote')} />
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="</> Code" active={editor.isActive('codeBlock')} />
      <Divider />
      <ToolBtn onClick={onOpenCardPicker} label="🎴 Card Image" title="Insert a card image into the post" active={false} />
      <ToolBtn onClick={onOpenDeckBuilder} label="🃏 Deck" title="Insert a deck list with hover card previews" active={false} />
      <Divider />
      <ToolBtn onClick={insertLink} label="🔗 Link" active={editor.isActive('link')} />
      <ToolBtn onClick={insertImage} label="🖼 Image" active={false} />
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="— Rule" active={false} />
      <Divider />
      {editor.isActive('table') ? (
        <>
          <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} label="+Col" title="Add column" active={false} />
          <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} label="−Col" title="Delete column" active={false} />
          <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} label="+Row" title="Add row" active={false} />
          <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} label="−Row" title="Delete row" active={false} />
          <ToolBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()} label="Header" title="Toggle header row" active={false} />
          <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} label="🗑 Table" title="Delete table" active={false} />
        </>
      ) : (
        <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} label="▦ Table" title="Insert a table" active={false} />
      )}
      {onImportMarkdown && <ToolBtn onClick={onImportMarkdown} label="⬇ MD" title="Import Markdown" active={false} />}
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="↩" title="Undo" active={false} />
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="↪" title="Redo" active={false} />
    </div>
  )
}
