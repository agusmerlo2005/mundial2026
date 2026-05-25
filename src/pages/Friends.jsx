import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS, TEAMS } from '../data/stickers'
import TradeModal from '../components/TradeModal'

const STICKER_BY_CODE = Object.fromEntries(STICKERS.map(s => [s.code, s]))
const TEAM_BY_CODE    = Object.fromEntries(TEAMS.map(t => [t.code, t]))
const FLAG_BASE       = 'https://flagcdn.com/w40'
const PAGE_SIZE       = 1000

function groupStickersByTeam(rows) {
  const map = new Map()
  for (const r of rows) {
    const s = STICKER_BY_CODE[r.sticker_code]
    if (!s) continue
    if (!map.has(s.sectionCode)) {
      map.set(s.sectionCode, { sectionCode: s.sectionCode, section: s.section, items: [] })
    }
    map.get(s.sectionCode).items.push({ ...r, sticker: s })
  }
  return Array.from(map.values())
}

export default function Friends() {
  const { user } = useAuth()
  const [rows,        setRows]        = useState([])
  const [myMissing,   setMyMissing]   = useState(new Set())
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [view,        setView]        = useState('matches')
  const [tradeWith,   setTradeWith]   = useState(null)
  const [search,      setSearch]      = useState('')
  const activeRef = useRef(true)

  const fetchAll = useCallback(async (isInitial = false) => {
    if (!user) return
    if (isInitial) setLoading(true)
    else setRefreshing(true)

    const all = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('user_stickers')
        .select('user_id, sticker_code, quantity')
        .range(from, from + PAGE_SIZE - 1)
      if (error) { console.error(error); break }
      all.push(...(data || []))
      if ((data || []).length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    const [profilesRes, mineRes] = await Promise.all([
      supabase.from('profiles').select('id, username'),
      supabase.from('user_stickers').select('sticker_code, quantity').eq('user_id', user.id),
    ])

    if (!activeRef.current) return

    const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.username]))
    setRows(all.map(r => ({ ...r, username: profileMap[r.user_id] || 'Anónimo' })))

    const ownedCodes = new Set((mineRes.data || []).map(r => r.sticker_code))
    setMyMissing(new Set(STICKERS.map(s => s.code).filter(c => !ownedCodes.has(c))))
    setLastUpdated(new Date())

    if (isInitial) setLoading(false)
    else setRefreshing(false)
  }, [user])

  useEffect(() => {
    activeRef.current = true
    if (!user) return
    fetchAll(true)
    return () => { activeRef.current = false }
  }, [user, fetchAll])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll(false) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchAll])

  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel('user_stickers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stickers' }, () => fetchAll(false))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, fetchAll])

  const friendDupes = useMemo(
    () => rows.filter(r => r.user_id !== user?.id && r.quantity > 1),
    [rows, user]
  )

  // "Me sirven": friends grouped, showing only stickers I need
  const matchesByFriend = useMemo(() => {
    const map = new Map()
    for (const r of friendDupes) {
      if (!myMissing.has(r.sticker_code)) continue
      if (!map.has(r.user_id)) {
        map.set(r.user_id, { user_id: r.user_id, username: r.username, stickers: [] })
      }
      map.get(r.user_id).stickers.push(r)
    }
    return Array.from(map.values()).sort((a, b) => b.stickers.length - a.stickers.length)
  }, [friendDupes, myMissing])

  // "Por amigo": all friends with all their dupes
  const byFriend = useMemo(() => {
    const map = new Map()
    for (const r of friendDupes) {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, { user_id: r.user_id, username: r.username, stickers: [] })
      }
      map.get(r.user_id).stickers.push(r)
    }
    return Array.from(map.values()).sort((a, b) => b.stickers.length - a.stickers.length)
  }, [friendDupes])

  const filteredMatches = useMemo(() => {
    if (!search) return matchesByFriend
    const q = search.toLowerCase()
    return matchesByFriend
      .map(f => ({
        ...f,
        stickers: f.stickers.filter(r => {
          const s = STICKER_BY_CODE[r.sticker_code]
          return (
            f.username.toLowerCase().includes(q) ||
            s?.section.toLowerCase().includes(q) ||
            s?.label.toLowerCase().includes(q)
          )
        }),
      }))
      .filter(f => f.stickers.length > 0)
  }, [matchesByFriend, search])

  const filteredByFriend = useMemo(() => {
    if (!search) return byFriend
    const q = search.toLowerCase()
    return byFriend.filter(f => f.username.toLowerCase().includes(q))
  }, [byFriend, search])

  const totalMatches = useMemo(
    () => matchesByFriend.reduce((acc, f) => acc + f.stickers.length, 0),
    [matchesByFriend]
  )

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>

  return (
    <div className="page">
      {tradeWith && (
        <TradeModal friend={tradeWith} allRows={rows} onClose={() => setTradeWith(null)} />
      )}

      <div className="toolbar">
        <div className="filter-pills">
          <button
            className={`pill ${view === 'matches' ? 'active' : ''}`}
            onClick={() => setView('matches')}
          >
            Me sirven
            {totalMatches > 0 && (
              <span className="pill-badge pill-badge-urgent">{totalMatches}</span>
            )}
          </button>
          <button
            className={`pill ${view === 'byFriend' ? 'active' : ''}`}
            onClick={() => setView('byFriend')}
          >
            Por amigo
            {byFriend.length > 0 && (
              <span className="pill-badge">{byFriend.length}</span>
            )}
          </button>
        </div>

        <input
          type="search"
          placeholder={view === 'matches' ? 'Buscar amigo o figurita…' : 'Buscar amigo…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search"
        />

        <button
          className="pill"
          onClick={() => fetchAll(false)}
          disabled={refreshing}
          title={lastUpdated ? `Actualizado: ${lastUpdated.toLocaleTimeString()}` : ''}
        >
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* ── Matches view ──────────────────────────────────────────── */}
      {view === 'matches' && (
        filteredMatches.length === 0 ? (
          <p className="muted" style={{ marginTop: 24 }}>
            {search ? 'Sin resultados.' : 'Por ahora ningún amigo tiene repetidas que te falten.'}
          </p>
        ) : (
          <div className="friends-feed">
            {filteredMatches.map(f => (
              <FriendCard
                key={f.user_id}
                friend={f}
                groups={groupStickersByTeam(f.stickers)}
                myMissing={myMissing}
                showMatchBadge
                onTrade={() => setTradeWith({ user_id: f.user_id, username: f.username })}
              />
            ))}
          </div>
        )
      )}

      {/* ── By friend view ────────────────────────────────────────── */}
      {view === 'byFriend' && (
        filteredByFriend.length === 0 ? (
          <p className="muted" style={{ marginTop: 24 }}>
            {search ? 'Sin resultados.' : 'Ningún amigo cargó repetidas todavía.'}
          </p>
        ) : (
          <div className="friends-feed">
            {filteredByFriend.map(f => (
              <FriendCard
                key={f.user_id}
                friend={f}
                groups={groupStickersByTeam(f.stickers)}
                myMissing={myMissing}
                onTrade={() => setTradeWith({ user_id: f.user_id, username: f.username })}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─── Friend card ─────────────────────────────────────────────────────────────

function FriendCard({ friend, groups, myMissing, showMatchBadge, onTrade }) {
  const matchCount = friend.stickers.filter(r => myMissing.has(r.sticker_code)).length
  const totalCount = friend.stickers.length

  return (
    <div className="fc">
      <div className="fc-head">
        <div className="fc-who">
          <span className="fc-name">{friend.username}</span>
          <span className="muted fc-sub">
            {totalCount} repetida{totalCount !== 1 ? 's' : ''}
            {matchCount > 0 && matchCount < totalCount && (
              <span className="tag match-tag fc-match-tag">{matchCount} te sirven</span>
            )}
            {matchCount > 0 && matchCount === totalCount && (
              <span className="tag match-tag fc-match-tag">todas te sirven</span>
            )}
          </span>
        </div>
        <button className="btn-primary fc-trade-btn" onClick={onTrade}>
          Proponer intercambio
        </button>
      </div>

      <div className="fc-body">
        {groups.map(g => {
          const team = TEAM_BY_CODE[g.sectionCode]
          return (
            <div key={g.sectionCode} className="fc-group">
              <div className="fc-group-head">
                {team ? (
                  <img
                    src={`${FLAG_BASE}/${team.iso2}.png`}
                    alt={team.name}
                    className="fc-group-flag"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <span style={{ fontSize: 14 }}>📖</span>
                )}
                <span className="fc-group-name">{g.section}</span>
              </div>
              <div className="fc-chips">
                {g.items.map(r => {
                  const isMatch = myMissing.has(r.sticker_code)
                  return (
                    <span
                      key={r.sticker_code}
                      className={`fc-chip${isMatch ? ' fc-chip-match' : ''}`}
                    >
                      {r.sticker.label}
                      {r.quantity > 2 && (
                        <span className="fc-chip-qty">×{r.quantity - 1}</span>
                      )}
                      {isMatch && <span className="fc-chip-dot" />}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
