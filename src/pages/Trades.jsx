import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS } from '../data/stickers'

const STICKER_BY_CODE = Object.fromEntries(STICKERS.map((s) => [s.code, s]))

export default function Trades() {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('received') // received | sent | history
  const [acting, setActing] = useState(null) // trade id being acted on
  const [error, setError] = useState(null)
  const activeRef = useRef(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('trade_proposals')
      .select('*')
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (!activeRef.current) return
    if (error) {
      console.error(error)
      return
    }
    setTrades(data || [])

    const ids = new Set()
    for (const t of data || []) {
      ids.add(t.from_user)
      ids.add(t.to_user)
    }
    if (ids.size) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(ids))
      if (!activeRef.current) return
      setProfiles(Object.fromEntries((profs || []).map((p) => [p.id, p.username])))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    activeRef.current = true
    fetchAll()
    return () => {
      activeRef.current = false
    }
  }, [fetchAll])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('trade_proposals_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_proposals' },
        () => fetchAll()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchAll])

  const { received, sent, history } = useMemo(() => {
    const received = []
    const sent = []
    const history = []
    for (const t of trades) {
      if (t.status === 'pending') {
        if (t.to_user === user?.id) received.push(t)
        else sent.push(t)
      } else {
        history.push(t)
      }
    }
    return { received, sent, history }
  }, [trades, user])

  async function act(rpc, id) {
    setError(null)
    setActing(id)
    const { error } = await supabase.rpc(rpc, { p_trade_id: id })
    setActing(null)
    if (error) setError(error.message)
  }

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>

  const tabs = [
    ['received', `Recibidos (${received.length})`],
    ['sent', `Enviados (${sent.length})`],
    ['history', `Historial (${history.length})`],
  ]

  return (
    <div className="page">
      <div className="toolbar">
        <div className="filter-pills">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              className={`pill ${view === k ? 'active' : ''}`}
              onClick={() => setView(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="auth-msg err">{error}</p>}

      {view === 'received' && (
        <TradeList
          trades={received}
          profiles={profiles}
          perspective="received"
          userId={user.id}
          actions={(t) => (
            <>
              <button
                className="btn-primary"
                disabled={acting === t.id}
                onClick={() => act('accept_trade', t.id)}
              >
                {acting === t.id ? 'Procesando…' : 'Aceptar'}
              </button>
              <button
                className="btn-ghost"
                disabled={acting === t.id}
                onClick={() => act('reject_trade', t.id)}
              >
                Rechazar
              </button>
            </>
          )}
          empty="No tenés intercambios pendientes por aceptar."
        />
      )}

      {view === 'sent' && (
        <TradeList
          trades={sent}
          profiles={profiles}
          perspective="sent"
          userId={user.id}
          actions={(t) => (
            <button
              className="btn-ghost"
              disabled={acting === t.id}
              onClick={() => act('cancel_trade', t.id)}
            >
              Cancelar
            </button>
          )}
          empty="No tenés propuestas pendientes enviadas."
        />
      )}

      {view === 'history' && (
        <TradeList
          trades={history}
          profiles={profiles}
          perspective="history"
          userId={user.id}
          empty="Todavía no hay intercambios cerrados."
        />
      )}
    </div>
  )
}

function TradeList({ trades, profiles, perspective, userId, actions, empty }) {
  if (trades.length === 0) return <p className="muted">{empty}</p>
  return (
    <div className="trade-feed">
      {trades.map((t) => {
        const iAmSender = t.from_user === userId
        const counterId = iAmSender ? t.to_user : t.from_user
        const counterName = profiles[counterId] || 'Anónimo'
        // Lo que YO doy y YO recibo desde mi punto de vista
        const myGive = iAmSender ? t.give_codes : t.receive_codes
        const myReceive = iAmSender ? t.receive_codes : t.give_codes
        return (
          <div key={t.id} className={`trade-card status-${t.status}`}>
            <div className="trade-card-head">
              <div>
                <strong>{iAmSender ? `Para ${counterName}` : `De ${counterName}`}</strong>
                <span className="muted trade-date">
                  {new Date(t.created_at).toLocaleString()}
                </span>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="trade-columns">
              <TradeSide title="Doy" codes={myGive} accent="amber" />
              <TradeSide title="Recibo" codes={myReceive} accent="primary" />
            </div>
            {actions && perspective !== 'history' && t.status === 'pending' && (
              <div className="trade-card-foot">{actions(t)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TradeSide({ title, codes, accent }) {
  return (
    <div className="trade-col">
      <h4>
        {title} ({codes.length})
      </h4>
      <div className="trade-list compact">
        {codes.map((c) => {
          const s = STICKER_BY_CODE[c]
          return (
            <div key={c} className={`trade-item static ${accent}`}>
              <div className="trade-item-body">
                <div className="sticker-code">{s?.code || c}</div>
                <div className="sticker-label">{s?.label || '—'}</div>
                <div className="sticker-section">{s?.section || ''}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: ['Pendiente', 'dupe-tag'],
    accepted: ['Aceptado', 'owned-tag'],
    rejected: ['Rechazado', 'missing-tag'],
    cancelled: ['Cancelado', 'missing-tag'],
  }
  const [label, cls] = map[status] || [status, 'dupe-tag']
  return <span className={`tag ${cls}`}>{label}</span>
}
