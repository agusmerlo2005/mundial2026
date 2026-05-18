import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS } from '../data/stickers'
import TradeModal from '../components/TradeModal'

const STICKER_BY_CODE = Object.fromEntries(STICKERS.map((s) => [s.code, s]))
const PAGE_SIZE = 1000

export default function Friends() {
  const { user } = useAuth()
  const [rows, setRows] = useState([]) // [{user_id, sticker_code, quantity, username}]
  const [myMissing, setMyMissing] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [view, setView] = useState('matches') // matches | byFriend
  const [tradeWith, setTradeWith] = useState(null) // { user_id, username }
  const activeRef = useRef(true)

  const fetchAll = useCallback(
    async (isInitial = false) => {
      if (!user) return
      if (isInitial) setLoading(true)
      else setRefreshing(true)

      // Paginamos manualmente para esquivar el tope por defecto de 1000 filas
      // de PostgREST en Supabase: si hay más, no se ven todas las repetidas.
      const all = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('user_stickers')
          .select('user_id, sticker_code, quantity')
          .range(from, from + PAGE_SIZE - 1)
        if (error) {
          console.error('user_stickers fetch error', error)
          break
        }
        const batch = data || []
        all.push(...batch)
        if (batch.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      const [profilesRes, mineRes] = await Promise.all([
        supabase.from('profiles').select('id, username'),
        supabase
          .from('user_stickers')
          .select('sticker_code, quantity')
          .eq('user_id', user.id),
      ])

      if (profilesRes.error) console.error('profiles fetch error', profilesRes.error)
      if (mineRes.error) console.error('mine fetch error', mineRes.error)

      if (!activeRef.current) return

      const profileMap = Object.fromEntries(
        (profilesRes.data || []).map((p) => [p.id, p.username])
      )
      const enriched = all.map((r) => ({
        ...r,
        username: profileMap[r.user_id] || 'Anónimo',
      }))
      setRows(enriched)

      const ownedCodes = new Set((mineRes.data || []).map((r) => r.sticker_code))
      const missing = new Set(
        STICKERS.map((s) => s.code).filter((c) => !ownedCodes.has(c))
      )
      setMyMissing(missing)
      setLastUpdated(new Date())

      if (isInitial) setLoading(false)
      else setRefreshing(false)
    },
    [user]
  )

  useEffect(() => {
    activeRef.current = true
    if (!user) return
    fetchAll(true)
    return () => {
      activeRef.current = false
    }
  }, [user, fetchAll])

  // Refrescar cuando el usuario vuelve a la pestaña
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') fetchAll(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchAll])

  // Tiempo real: si algún amigo agrega/edita repetidas, refrescamos
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('user_stickers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_stickers' },
        () => fetchAll(false)
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchAll])

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
        map.set(r.user_id, { user_id: r.user_id, username: r.username, items: [] })
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
        <button
          className="pill"
          onClick={() => fetchAll(false)}
          disabled={refreshing}
          title={lastUpdated ? `Última actualización: ${lastUpdated.toLocaleTimeString()}` : ''}
        >
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
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
                    <button
                      className="link"
                      onClick={() =>
                        setTradeWith({ user_id: r.user_id, username: r.username })
                      }
                    >
                      Proponer intercambio
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tradeWith && (
        <TradeModal
          friend={tradeWith}
          allRows={rows}
          onClose={() => setTradeWith(null)}
        />
      )}

      {view === 'byFriend' && (
        <>
          <h2 className="section-title">Todas las repetidas por amigo</h2>
          {byFriend.length === 0 ? (
            <p className="muted">Ningún amigo cargó repetidas todavía.</p>
          ) : (
            byFriend.map((f) => (
              <div key={f.user_id} className="friend-block">
                <div className="friend-head">
                  <h3>
                    {f.username} · {f.items.length} figuritas repetidas
                  </h3>
                  <button
                    className="btn-primary"
                    onClick={() => setTradeWith({ user_id: f.user_id, username: f.username })}
                  >
                    Proponer intercambio
                  </button>
                </div>
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
