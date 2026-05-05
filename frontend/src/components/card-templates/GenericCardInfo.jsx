const HTML_RE = /<[a-z][\s\S]*>/i

export default function GenericCardInfo({ card }) {
  const { rules_text, attributes } = card
  const isHtml = rules_text && HTML_RE.test(rules_text)

  return (
    <div>
      {rules_text && (
        <div className="rounded-xl p-5 mb-5 border card-rules-html"
          style={{ backgroundColor: '#35353f', borderColor: '#42424e', color: '#EDF2F6', lineHeight: '1.6' }}>
          {isHtml
            ? <div dangerouslySetInnerHTML={{ __html: rules_text }} />
            : <p className="whitespace-pre-line leading-relaxed text-base">{rules_text}</p>
          }
        </div>
      )}
    </div>
  )
}
