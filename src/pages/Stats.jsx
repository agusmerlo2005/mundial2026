import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS, TEAMS, TOTAL_STICKERS } from '../data/stickers'

const SECTION_STICKERS = {}
for (const s of STICKERS) {
  if (!SECTION_STICKERS[s.sectionCode]) SECTION_STICKERS[s.sectionCode] = []
  SECTION_STICKERS[s.sectionCode].push(s.code)
}

export default function Stats() {
  const { user } = useAuth()
  const [myStickers, setMyStickers] = useState([])
  const [trades, setTrades] = useState([])
  const [allRows, setAllRows] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const activeRef = useRef(true)

  const fetchAll = useCallback(async () => {
    if (!user) return

    const PAGE = 1000
    const all = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('user_stickers')
        .select('user_id, sticker_code, quantity')
        .range(from, from + PAGE - 1)
      if (error) break
      all.push(...(data || []))
      if ((data || []).length < PAGE) break
      from += PAGE
    }

    const [mineRes, tradesRes, profilesRes] = await Promise.all([
      supabase.from('user_stickers').select('sticker_code, quantity').eq('user_id', user.id),
      supabase.from('trade_proposals').select('*').or(`from_user.eq.${user.id},to_user.eq.${user.id}`),
      supabase.from('profiles').select('id, username'),
    ])

    if (!activeRef.current) return

    const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.username]))
    setProfiles(profileMap)
    setMyStickers(mineRes.data || [])
    setTrades(tradesRes.data || [])
    setAllRows(all.map(r => ({ ...r, username: profileMap[r.user_id] || 'Anónimo' })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    activeRef.current = true
    fetchAll()
    return () => { activeRef.current = false }
  }, [fetchAll])

  const myOwned = useMemo(() => {
    const set = new Set()
    for (const r of myStickers) if (r.quantity >= 1) set.add(r.sticker_code)
    return set
  }, [myStickers])

  const myDupes = useMemo(
    () => myStickers.filter(r => r.quantity > 1).length,
    [myStickers]
  )

  const teamProgress = useMemo(() => {
    return TEAMS.map(team => {
      const codes = SECTION_STICKERS[team.code] || []
      const owned = codes.filter(c => myOwned.has(c)).length
      const pct = codes.length > 0 ? owned / codes.length : 0
      return { code: team.code, name: team.name, total: codes.length, owned, pct }
    }).sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name))
  }, [myOwned])

  const completedTeams = useMemo(() => teamProgress.filter(t => t.owned === t.total), [teamProgress])

  const tradeStats = useMemo(() => {
    let accepted = 0, pending = 0, sent = 0, received = 0
    const withWhom = {}
    for (const t of trades) {
      if (t.status === 'accepted') {
        accepted++
        const other = t.from_user === user.id ? t.to_user : t.from_user
        withWhom[other] = (withWhom[other] || 0) + 1
      }
      if (t.status === 'pending') {
        pending++
        if (t.from_user === user.id) sent++
        else received++
      }
    }
    const topPartner = Object.entries(withWhom).sort((a, b) => b[1] - a[1])[0]
    return { accepted, pending, sent, received, topPartner, withWhom }
  }, [trades, user])

  const ranking = useMemo(() => {
    const byUser = {}
    for (const r of allRows) {
      if (!byUser[r.user_id]) {
        byUser[r.user_id] = { user_id: r.user_id, username: r.username, owned: 0 }
      }
      if (r.quantity >= 1) byUser[r.user_id].owned++
    }
    return Object.values(byUser)
      .map(u => ({ ...u, pct: u.owned / TOTAL_STICKERS }))
      .sort((a, b) => b.owned - a.owned)
  }, [allRows])

  if (loading) return <div className="page"><p className="muted">Cargando estadísticas…</p></div>

  const totalOwned = myOwned.size
  const globalPct = Math.round((totalOwned / TOTAL_STICKERS) * 100)

  return (
    <div className="page">
      <h2 className="section-title">Estadísticas</h2>

      {/* Mi álbum */}
      <div className="summary">
        <div className="sum-item">
          <span className="sum-label">Figuritas pegadas</span>
          <span className="sum-value">
            {totalOwned}
            <small className="sum-of"> / {TOTAL_STICKERS}</small>
          </span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Álbum completado</span>
          <span className="sum-value">{globalPct}%</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Repetidas</span>
          <span className="sum-value">{myDupes}</span>
        </div>
      </div>

      <div className="progress">
        <div className="progress-head">
          <strong>Progreso general</strong>
          <span>{totalOwned} / {TOTAL_STICKERS} ({globalPct}%)</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${globalPct}%` }} />
        </div>
      </div>

      {/* Intercambios */}
      <h3 className="section-title" style={{ marginTop: '28px' }}>Intercambios</h3>
      <div className="summary stats-summary-4">
        <div className="sum-item">
          <span className="sum-label">Completados</span>
          <span className="sum-value" style={{ color: 'var(--green)' }}>{tradeStats.accepted}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Pendientes</span>
          <span className="sum-value" style={{ color: 'var(--amber)' }}>{tradeStats.pending}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Enviados</span>
          <span className="sum-value">{tradeStats.sent}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Recibidos</span>
          <span className="sum-value">{tradeStats.received}</span>
        </div>
      </div>

      {tradeStats.topPartner && (
        <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
          Amigo con más intercambios:{' '}
          <strong style={{ color: 'var(--text)' }}>
            {profiles[tradeStats.topPartner[0]] || 'Anónimo'}
          </strong>{' '}
          ({tradeStats.topPartner[1]} {tradeStats.topPartner[1] === 1 ? 'intercambio' : 'intercambios'})
        </p>
      )}

      {/* Ranking */}
      <h3 className="section-title" style={{ marginTop: '28px' }}>Ranking de amigos</h3>
      <div className="stats-table">
        {ranking.map((u, i) => {
          const isMe = u.user_id === user.id
          return (
            <div key={u.user_id} className={`stats-row${isMe ? ' stats-row-me' : ''}`}>
              <span className="stats-rank">#{i + 1}</span>
              <span className="stats-name">
                {u.username}
                {isMe && <span className="tag owned-tag" style={{ marginLeft: 6 }}>vos</span>}
              </span>
              <span className="stats-bar-wrap">
                <span
                  className="stats-bar-fill"
                  style={{ width: `${Math.round(u.pct * 100)}%` }}
                />
              </span>
              <span className="stats-pct">{Math.round(u.pct * 100)}%</span>
              <span className="muted" style={{ fontSize: 13, minWidth: 70, textAlign: 'right' }}>
                {u.owned}/{TOTAL_STICKERS}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progreso por selección */}
      <h3 className="section-title" style={{ marginTop: '28px' }}>
        Progreso por selección
        {completedTeams.length > 0 && (
          <span className="tag owned-tag" style={{ marginLeft: 10, fontSize: 13 }}>
            {completedTeams.length} completa{completedTeams.length !== 1 ? 's' : ''}
          </span>
        )}
      </h3>
      <div className="stats-teams">
        {teamProgress.map(t => (
          <div key={t.code} className={`stats-team-row${t.owned === t.total ? ' complete' : ''}`}>
            <span className="stats-team-name">{t.name}</span>
            <span className="stats-bar-wrap">
              <span
                className="stats-bar-fill"
                style={{
                  width: `${Math.round(t.pct * 100)}%`,
                  background: t.owned === t.total ? 'var(--green)' : undefined,
                }}
              />
            </span>
            <span className="muted" style={{ fontSize: 13, minWidth: 40, textAlign: 'right' }}>
              {t.owned}/{t.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
