import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS, SECTIONS, TOTAL_STICKERS } from '../data/stickers'
import StickerCard from '../components/StickerCard'
import ProgressBar from '../components/ProgressBar'

export default function MyAlbum() {
  const { user } = useAuth()
  const [quantities, setQuantities] = useState({}) // { [code]: qty }
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('ALL')
  const [filter, setFilter] = useState('all') // all | owned | missing | dupes
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)
    supabase
      .from('user_stickers')
      .select('sticker_code, quantity')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error(error)
        } else {
          const map = {}
          for (const row of data || []) map[row.sticker_code] = row.quantity
          setQuantities(map)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  async function updateQuantity(code, qty) {
    setQuantities((prev) => ({ ...prev, [code]: qty }))
    if (qty <= 0) {
      await supabase
        .from('user_stickers')
        .delete()
        .eq('user_id', user.id)
        .eq('sticker_code', code)
    } else {
      await supabase.from('user_stickers').upsert(
        {
          user_id: user.id,
          sticker_code: code,
          quantity: qty,
        },
        { onConflict: 'user_id,sticker_code' }
      )
    }
  }

  const stats = useMemo(() => {
    let owned = 0
    let dupes = 0
    for (const s of STICKERS) {
      const q = quantities[s.code] || 0
      if (q > 0) owned++
      if (q > 1) dupes += q - 1
    }
    return { owned, dupes, missing: TOTAL_STICKERS - owned }
  }, [quantities])

  const visible = useMemo(() => {
    return STICKERS.filter((s) => {
      if (section !== 'ALL' && s.sectionCode !== section) return false
      const q = quantities[s.code] || 0
      if (filter === 'owned' && q === 0) return false
      if (filter === 'missing' && q > 0) return false
      if (filter === 'dupes' && q < 2) return false
      if (search) {
        const t = search.toLowerCase()
        if (
          !s.code.toLowerCase().includes(t) &&
          !s.label.toLowerCase().includes(t) &&
          !s.section.toLowerCase().includes(t)
        )
          return false
      }
      return true
    })
  }, [quantities, section, filter, search])

  return (
    <div className="page">
      <ProgressBar owned={stats.owned} total={TOTAL_STICKERS} />

      <div className="summary">
        <div className="sum-item">
          <span className="sum-label">Tengo</span>
          <span className="sum-value">{stats.owned}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Faltan</span>
          <span className="sum-value">{stats.missing}</span>
        </div>
        <div className="sum-item">
          <span className="sum-label">Repetidas</span>
          <span className="sum-value">{stats.dupes}</span>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por código o nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search"
        />
        <select value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="ALL">Todas las secciones</option>
          {SECTIONS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="filter-pills">
          {[
            ['all', 'Todas'],
            ['owned', 'Tengo'],
            ['missing', 'Faltan'],
            ['dupes', 'Repetidas'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`pill ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando tus figuritas…</p>
      ) : (
        <div className="grid">
          {visible.map((s) => (
            <StickerCard
              key={s.code}
              sticker={s}
              quantity={quantities[s.code] || 0}
              onChange={(q) => updateQuantity(s.code, q)}
            />
          ))}
          {visible.length === 0 && <p className="muted">No hay figuritas con ese filtro.</p>}
        </div>
      )}
    </div>
  )
}
