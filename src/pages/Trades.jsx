import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS, TEAMS } from '../data/stickers'

const STICKER_BY_CODE = Object.fromEntries(STICKERS.map(s => [s.code, s]))
const TEAM_BY_CODE    = Object.fromEntries(TEAMS.map(t => [t.code, t]))
const FLAG_BASE       = 'https://flagcdn.com/w40'

function groupByTeam(codes) {
  const map = new Map()
  for (const code of codes) {
    const s = STICKER_BY_CODE[code]
    if (!s) continue
    if (!map.has(s.sectionCode)) {
      map.set(s.sectionCode, { sectionCode: s.sectionCode, section: s.section, stickers: [] })
    }
    map.get(s.sectionCode).stickers.push(s)
  }
  return Array.from(map.values())
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function Trades() {
  const { user } = useAuth()
  const [trades,   setTrades]   = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('received')
  const [acting,   setActing]   = useState(null)
  const [error,    setError]    = useState(null)
  const activeRef = useRef(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('trade_proposals')
      .select('*')
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (!activeRef.current) return
    if (error) { console.error(error); return }
    setTrades(data || [])

    const ids = new Set()
    for (const t of data || []) { ids.add(t.from_user); ids.add(t.to_user) }
    if (ids.size) {
      const { data: profs } = await supabase
        .from('profiles').select('id, username').in('id', Array.from(ids))
      if (!activeRef.current) return
      setProfiles(Object.fromEntries((profs || []).map(p => [p.id, p.username])))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    activeRef.current = true
    fetchAll()
    return () => { activeRef.current = false }
  }, [fetchAll])

  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel('trade_proposals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_proposals' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, fetchAll])

  const { received, sent, history } = useMemo(() => {
    const received = [], sent = [], history = []
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

  const byFriend = useMemo(() => {
    const pending = trades.filter(t => t.status === 'pending')
    const map = new Map()
    for (const t of pending) {
      const other = t.from_user === user.id ? t.to_user : t.from_user
      if (!map.has(other)) map.set(other, { userId: other, trades: [] })
      map.get(other).trades.push(t)
    }
    return Array.from(map.values()).sort((a, b) => b.trades.length - a.trades.length)
  }, [trades, user])

  async function act(rpc, id) {
    setError(null)
    setActing(id)
    const { error } = await supabase.rpc(rpc, { p_trade_id: id })
    setActing(null)
    if (error) setError(error.message)
  }

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>

  const urgentCount = received.length

  return (
    <div className="page">
      {urgentCount > 0 && (
        <div className="trade-alert">
          <span>
            Tenés <strong>{urgentCount}</strong> propuesta{urgentCount !== 1 ? 's' : ''} esperando tu respuesta
          </span>
          <button
            className={`pill ${view === 'received' ? 'active' : ''}`}
            onClick={() => setView('received')}
          >
            Ver ahora
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="filter-pills">
          {[
            ['received', 'Recibidos',  received.length, true],
            ['sent',     'Enviados',   sent.length,     false],
            ['byFriend', 'Por amigo',  byFriend.length, false],
            ['history',  'Historial',  history.length,  false],
          ].map(([k, label, count, urgent]) => (
            <button
              key={k}
              className={`pill ${view === k ? 'active' : ''}`}
              onClick={() => setView(k)}
            >
              {label}
              {count > 0 && (
                <span className={`pill-badge ${urgent && count > 0 ? 'pill-badge-urgent' : ''}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="auth-msg err">{error}</p>}

      {view === 'received' && (
        received.length === 0
          ? <Empty msg="No tenés intercambios pendientes por aceptar." />
          : <div className="trade-feed-v2">
              {received.map(t => (
                <TradeCard key={t.id} trade={t} profiles={profiles} userId={user.id}
                  actions={id => (
                    <>
                      <button className="btn-primary" disabled={acting === id} onClick={() => act('accept_trade', id)}>
                        {acting === id ? 'Procesando…' : 'Aceptar'}
                      </button>
                      <button className="btn-ghost" disabled={acting === id} onClick={() => act('reject_trade', id)}>
                        Rechazar
                      </button>
                    </>
                  )}
                />
              ))}
            </div>
      )}

      {view === 'sent' && (
        sent.length === 0
          ? <Empty msg="No tenés propuestas enviadas pendientes." />
          : <div className="trade-feed-v2">
              {sent.map(t => (
                <TradeCard key={t.id} trade={t} profiles={profiles} userId={user.id}
                  actions={id => (
                    <button className="btn-ghost" disabled={acting === id} onClick={() => act('cancel_trade', id)}>
                      Cancelar
                    </button>
                  )}
                />
              ))}
            </div>
      )}

      {view === 'byFriend' && (
        byFriend.length === 0
          ? <Empty msg="No hay intercambios pendientes." />
          : byFriend.map(({ userId: fId, trades: fTrades }) => {
              const isSent = (t) => t.from_user === user.id
              return (
                <div key={fId} className="friend-trade-block">
                  <div className="friend-trade-block-head">
                    <span className="friend-trade-block-name">{profiles[fId] || 'Anónimo'}</span>
                    <span className="tag dupe-tag">
                      {fTrades.length} propuesta{fTrades.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="trade-feed-v2">
                    {fTrades.map(t => (
                      <TradeCard key={t.id} trade={t} profiles={profiles} userId={user.id} hideName
                        actions={id => isSent(t) ? (
                          <button className="btn-ghost" disabled={acting === id} onClick={() => act('cancel_trade', id)}>
                            Cancelar
                          </button>
                        ) : (
                          <>
                            <button className="btn-primary" disabled={acting === id} onClick={() => act('accept_trade', id)}>
                              {acting === id ? 'Procesando…' : 'Aceptar'}
                            </button>
                            <button className="btn-ghost" disabled={acting === id} onClick={() => act('reject_trade', id)}>
                              Rechazar
                            </button>
                          </>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )
            })
      )}

      {view === 'history' && (
        history.length === 0
          ? <Empty msg="Todavía no hay intercambios cerrados." />
          : <div className="trade-feed-v2">
              {history.map(t => (
                <TradeCard key={t.id} trade={t} profiles={profiles} userId={user.id} />
              ))}
            </div>
      )}
    </div>
  )
}

// ─── Trade card ──────────────────────────────────────────────────────────────

function TradeCard({ trade, profiles, userId, actions, hideName }) {
  const iAmSender  = trade.from_user === userId
  const counterId  = iAmSender ? trade.to_user : trade.from_user
  const name       = profiles[counterId] || 'Anónimo'
  const myGive     = iAmSender ? trade.give_codes    : trade.receive_codes
  const myReceive  = iAmSender ? trade.receive_codes : trade.give_codes
  const giveGroups = groupByTeam(myGive)
  const rcvGroups  = groupByTeam(myReceive)

  return (
    <div className={`tc status-${trade.status}`}>
      {/* Head */}
      <div className="tc-head">
        {!hideName ? (
          <div className="tc-who">
            <span className="tc-dir">{iAmSender ? 'Para' : 'De'}</span>
            <span className="tc-name">{name}</span>
          </div>
        ) : (
          <div className="tc-who">
            <span className="tc-dir">{iAmSender ? 'Enviado' : 'Recibido'}</span>
          </div>
        )}
        <div className="tc-meta">
          <StatusBadge status={trade.status} />
          <span className="muted tc-date">{fmtDate(trade.created_at)}</span>
        </div>
      </div>

      {/* Body: two panels */}
      <div className="tc-body">
        <StickerPanel title="Doy" count={myGive.length} groups={giveGroups} side="give" />
        <div className="tc-sep">⇄</div>
        <StickerPanel title="Recibo" count={myReceive.length} groups={rcvGroups} side="receive" />
      </div>

      {/* Actions */}
      {actions && trade.status === 'pending' && (
        <div className="tc-foot">{actions(trade.id)}</div>
      )}
    </div>
  )
}

function StickerPanel({ title, count, groups, side }) {
  return (
    <div className={`tc-panel tc-panel-${side}`}>
      <div className="tc-panel-head">
        <span className="tc-panel-title">{title}</span>
        <span className={`tag ${side === 'give' ? 'dupe-tag' : 'match-tag'}`}>{count}</span>
      </div>
      <div className="tc-groups">
        {groups.map(g => {
          const team = TEAM_BY_CODE[g.sectionCode]
          return (
            <div key={g.sectionCode} className="tc-group">
              <div className="tc-group-head">
                {team ? (
                  <img
                    src={`${FLAG_BASE}/${team.iso2}.png`}
                    alt={team.name}
                    className="tc-group-flag"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <span className="tc-group-icon">📖</span>
                )}
                <span className="tc-group-name">{g.section}</span>
              </div>
              <div className="tc-chips">
                {g.stickers.map(s => (
                  <span key={s.code} className="tc-chip">{s.label}</span>
                ))}
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
    pending:   ['Pendiente', 'dupe-tag'],
    accepted:  ['Aceptado',  'owned-tag'],
    rejected:  ['Rechazado', 'missing-tag'],
    cancelled: ['Cancelado', 'missing-tag'],
  }
  const [label, cls] = map[status] || [status, 'dupe-tag']
  return <span className={`tag ${cls}`}>{label}</span>
}

function Empty({ msg }) {
  return <p className="muted" style={{ marginTop: 24 }}>{msg}</p>
}
