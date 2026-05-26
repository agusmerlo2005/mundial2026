import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS } from '../data/stickers'

const STICKER_BY_CODE = Object.fromEntries(STICKERS.map((s) => [s.code, s]))

export default function TradeModal({ friend, allRows, onClose }) {
  const { user } = useAuth()
  const [giveSel, setGiveSel] = useState(new Set())
  const [receiveSel, setReceiveSel] = useState(new Set())
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [reservedGive, setReservedGive] = useState(new Set())
  const [reservedReceive, setReservedReceive] = useState(new Set())
  const [reservedByFriend, setReservedByFriend] = useState(new Set())

  // Traer figuritas ya comprometidas en propuestas pendientes para no mostrarlas de nuevo
  useEffect(() => {
    async function fetchReserved() {
      // Mis propias propuestas pendientes (lo que yo ya ofrecí o pedí)
      const { data: mine } = await supabase
        .from('trade_proposals')
        .select('give_codes, receive_codes')
        .eq('from_user', user.id)
        .eq('status', 'pending')
      if (mine) {
        const give = new Set()
        const receive = new Set()
        for (const row of mine) {
          for (const c of row.give_codes) give.add(c)
          for (const c of row.receive_codes) receive.add(c)
        }
        setReservedGive(give)
        setReservedReceive(receive)
      }

      // Figuritas del amigo ya comprometidas en otros intercambios pendientes
      // (alguien más ya las pidió, no las podemos pedir nosotros también)
      const { data: friendPending } = await supabase
        .from('trade_proposals')
        .select('receive_codes')
        .eq('to_user', friend.user_id)
        .neq('from_user', user.id)
        .eq('status', 'pending')
      if (friendPending) {
        const reserved = new Set()
        for (const row of friendPending) {
          for (const c of row.receive_codes) reserved.add(c)
        }
        setReservedByFriend(reserved)
      }
    }
    fetchReserved()
  }, [user.id, friend.user_id])

  const { mineToOffer, friendToReceive } = useMemo(() => {
    const friendOwned = new Set()
    const friendDupes = []
    const myOwned = new Set()
    const myDupes = []

    for (const r of allRows) {
      if (r.user_id === friend.user_id) {
        if (r.quantity > 0) friendOwned.add(r.sticker_code)
        if (r.quantity > 1) friendDupes.push(r)
      } else if (r.user_id === user.id) {
        if (r.quantity > 0) myOwned.add(r.sticker_code)
        if (r.quantity > 1) myDupes.push(r)
      }
    }

    const mineToOffer = myDupes
      .filter((r) => !friendOwned.has(r.sticker_code) && !reservedGive.has(r.sticker_code))
      .map((r) => ({ ...r, sticker: STICKER_BY_CODE[r.sticker_code] }))
      .filter((r) => r.sticker)
      .sort((a, b) => a.sticker.code.localeCompare(b.sticker.code))

    const friendToReceive = friendDupes
      .filter((r) => !myOwned.has(r.sticker_code) && !reservedReceive.has(r.sticker_code) && !reservedByFriend.has(r.sticker_code))
      .map((r) => ({ ...r, sticker: STICKER_BY_CODE[r.sticker_code] }))
      .filter((r) => r.sticker)
      .sort((a, b) => a.sticker.code.localeCompare(b.sticker.code))

    return { mineToOffer, friendToReceive }
  }, [allRows, friend.user_id, user.id, reservedGive, reservedReceive, reservedByFriend])

  function toggle(setFn, set, code) {
    const next = new Set(set)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setFn(next)
  }

  const balanced = giveSel.size === receiveSel.size && giveSel.size > 0
  const sameCount = giveSel.size === receiveSel.size

  async function send() {
    setError(null)
    setSending(true)
    const { error } = await supabase.rpc('create_trade', {
      p_to_user: friend.user_id,
      p_give_codes: Array.from(giveSel),
      p_receive_codes: Array.from(receiveSel),
    })
    setSending(false)
    if (error) {
      setError(error.message)
      return
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Proponer intercambio con {friend.username}</h3>
          <button className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <p className="muted modal-help">
          Elegí la misma cantidad de cada lado. Solo aparecen las que a vos te
          sobran y a {friend.username} le faltan (y al revés).
        </p>

        <div className="trade-columns">
          <TradeColumn
            title={`Yo ofrezco (${giveSel.size})`}
            empty="No tenés repetidas que le falten."
            items={mineToOffer}
            selected={giveSel}
            onToggle={(c) => toggle(setGiveSel, giveSel, c)}
            accent="amber"
          />
          <TradeColumn
            title={`Yo pido (${receiveSel.size})`}
            empty={`${friend.username} no tiene repetidas que te falten.`}
            items={friendToReceive}
            selected={receiveSel}
            onToggle={(c) => toggle(setReceiveSel, receiveSel, c)}
            accent="primary"
          />
        </div>

        {error && <p className="auth-msg err">{error}</p>}

        <footer className="modal-foot">
          <span className={`muted ${!sameCount ? 'warn' : ''}`}>
            {giveSel.size === 0 && receiveSel.size === 0
              ? 'Marcá al menos una de cada lado.'
              : sameCount
              ? `Intercambio de ${giveSel.size} por ${receiveSel.size}.`
              : `Tienen que ser iguales (${giveSel.size} vs ${receiveSel.size}).`}
          </span>
          <button
            className="btn-primary"
            disabled={!balanced || sending}
            onClick={send}
          >
            {sending ? 'Enviando…' : 'Enviar propuesta'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function TradeColumn({ title, empty, items, selected, onToggle, accent }) {
  return (
    <div className="trade-col">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="trade-list">
          {items.map((r) => {
            const checked = selected.has(r.sticker_code)
            return (
              <label
                key={r.sticker_code}
                className={`trade-item ${checked ? `selected ${accent}` : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(r.sticker_code)}
                />
                <div className="trade-item-body">
                  <div className="sticker-code">{r.sticker.code}</div>
                  <div className="sticker-label">{r.sticker.label}</div>
                  <div className="sticker-section">{r.sticker.section}</div>
                </div>
                <span className="tag dupe-tag">+{r.quantity - 1}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
