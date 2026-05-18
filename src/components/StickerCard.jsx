export default function StickerCard({ sticker, quantity, onChange }) {
  const owned = quantity > 0
  const dupes = Math.max(0, quantity - 1)

  function set(q) {
    onChange(Math.max(0, q))
  }

  return (
    <div className={`sticker ${owned ? 'owned' : 'missing'} ${dupes > 0 ? 'has-dupes' : ''}`}>
      <div className="sticker-code">{sticker.code}</div>
      <div className="sticker-label">{sticker.label}</div>

      <div className="sticker-controls">
        <button
          type="button"
          className="qty-btn"
          onClick={() => set(quantity - 1)}
          aria-label="Restar"
        >
          −
        </button>
        <span className="qty">{quantity}</span>
        <button
          type="button"
          className="qty-btn"
          onClick={() => set(quantity + 1)}
          aria-label="Sumar"
        >
          +
        </button>
      </div>

      <div className="sticker-state">
        {!owned && <span className="tag missing-tag">Falta</span>}
        {owned && dupes === 0 && <span className="tag owned-tag">La tengo</span>}
        {dupes > 0 && <span className="tag dupe-tag">+{dupes} repe</span>}
      </div>
    </div>
  )
}
