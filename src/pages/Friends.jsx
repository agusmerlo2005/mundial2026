import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS } from '../data/stickers'

const STICKER_BY_CODE = Object.fromEntries(STICKERS.map((s) => [s.code, s]))

export default function Friends() {
  const { user } = useAuth()
  const [rows, setRows] = useState([]) // [{user_id, sticker_code, quantity, username}]
  const [myMissing, setMyMissing] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('matches') // matches | byFriend

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)

    Promise.all([
      supabase.from('user_stickers').select('user_id, sticker_code, quantity'),
      supabase.from('profiles').select('id, username'),
      supabase
        .from('user_stickers')
        .select('sticker_code, quantity')
        .eq('user_id', user.id),
    ]).then(([all, profiles, mine]) => {
      if (!active) return
      const profileMap = Object.fromEntries(
        (profiles.data || []).map((p) => [p.id, p.username])
      )
      const enriched = (all.data || []).map((r) => ({
        ...r,
        username: profileMap[r.user_id] || 'Anónimo',
      }))
      setRows(enriched)

      const ownedCodes = new Set((mine.data || []).map((r) => r.sticker_code))
      const missing = new Set(
        STICKERS.map((s) => s.code).filter((c) => !ownedCodes.has(c))
      )
      setMyMissing(missing)

      setLoading(false)
    })
  }, [user])

  const friendDupes = useMemo(
    () => rows.filter((r) => r.user_id !== user?.id && r.quantity > 1),
    [rows, user]
  )

  const matches = useMemo(
    () => friendDupes.filter((r) => myMissing.has(r.sticker_code)),
    [friendDupes, myMissing]
  )

  const byFriend = useMemo(() => {
    const map = new Map()
    for (const r of friendDupes) {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, { username: r.username, items: [] })
      }
      map.get(r.user_id).items.push(r)
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length)
  }, [friendDupes])

  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>

  return (
    <div className="page">
      <div className="toolbar">
        <div className="filter-pills">
          <button
            className={`pill ${view === 'matches' ? 'active' : ''}`}
            onClick={() => setView('matches')}
          >
            Me sirven ({matches.length})
          </button>
          <button
            className={`pill ${view === 'byFriend' ? 'active' : ''}`}
            onClick={() => setView('byFriend')}
          >
            Por amigo
          </button>
        </div>
      </div>

      {view === 'matches' && (
        <>
          <h2 className="section-title">Repetidas de amigos que te faltan</h2>
          {matches.length === 0 ? (
            <p className="muted">Por ahora ningún amigo tiene repetidas que te falten.</p>
          ) : (
            <div className="grid">
              {matches.map((r) => {
                const s = STICKER_BY_CODE[r.sticker_code]
                if (!s) return null
                return (
                  <div key={`${r.user_id}-${r.sticker_code}`} className="sticker match">
                    <div className="sticker-code">{s.code}</div>
                    <div className="sticker-label">{s.label}</div>
                    <div className="sticker-section">{s.section}</div>
                    <div className="match-info">
                      <strong>{r.username}</strong> tiene <span>+{r.quantity - 1}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === 'byFriend' && (
        <>
          <h2 className="section-title">Todas las repetidas por amigo</h2>
          {byFriend.length === 0 ? (
            <p className="muted">Ningún amigo cargó repetidas todavía.</p>
          ) : (
            byFriend.map((f) => (
              <div key={f.username} className="friend-block">
                <h3>
                  {f.username} · {f.items.length} figuritas repetidas
                </h3>
                <div className="grid">
                  {f.items.map((r) => {
                    const s = STICKER_BY_CODE[r.sticker_code]
                    if (!s) return null
                    const meNeeds = myMissing.has(r.sticker_code)
                    return (
                      <div
                        key={`${f.username}-${r.sticker_code}`}
                        className={`sticker ${meNeeds ? 'match' : ''}`}
                      >
                        <div className="sticker-code">{s.code}</div>
                        <div className="sticker-label">{s.label}</div>
                        <div className="sticker-section">{s.section}</div>
                        <span className="tag dupe-tag">+{r.quantity - 1}</span>
                        {meNeeds && <span className="tag match-tag">Me sirve</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
