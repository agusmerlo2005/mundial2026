import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { STICKERS, SECTIONS, TEAMS, GROUPS, TOTAL_STICKERS } from '../data/stickers'
import StickerCard from '../components/StickerCard'
import ProgressBar from '../components/ProgressBar'

const FLAG_BASE = 'https://flagcdn.com/w80'

const SPECIAL_SECTIONS = [
  { code: 'INTRO', name: 'Introducción', icon: '📖' },
  { code: 'EST',   name: 'Estadios',     icon: '🏟️' },
  { code: 'CC',    name: 'Coca-Cola',    icon: '🥤' },
]

// Pre-build list of sticker codes per section for fast lookup
const SECTION_CODES = {}
for (const s of STICKERS) {
  if (!SECTION_CODES[s.sectionCode]) SECTION_CODES[s.sectionCode] = []
  SECTION_CODES[s.sectionCode].push(s.code)
}

export default function MyAlbum() {
  const { user } = useAuth()
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState(null) // null = home
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('ALL')
  const [teamSearch, setTeamSearch] = useState('')

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
        if (!error) {
          const map = {}
          for (const row of data || []) map[row.sticker_code] = row.quantity
          setQuantities(map)
        }
        setLoading(false)
      })
    return () => { active = false }
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
        { user_id: user.id, sticker_code: code, quantity: qty },
        { onConflict: 'user_id,sticker_code' }
      )
    }
  }

  const stats = useMemo(() => {
    let owned = 0, dupes = 0
    for (const s of STICKERS) {
      const q = quantities[s.code] || 0
      if (q > 0) owned++
      if (q > 1) dupes += q - 1
    }
    return { owned, dupes, missing: TOTAL_STICKERS - owned }
  }, [quantities])

  // Sticker view filtered list
  const visible = useMemo(() => {
    if (!selectedSection) return []
    return STICKERS.filter((s) => {
      if (s.sectionCode !== selectedSection) return false
      const q = quantities[s.code] || 0
      if (filter === 'owned' && q === 0) return false
      if (filter === 'missing' && q > 0) return false
      if (filter === 'dupes' && q < 2) return false
      if (search) {
        const t = search.toLowerCase()
        if (!s.code.toLowerCase().includes(t) && !s.label.toLowerCase().includes(t)) return false
      }
      return true
    })
  }, [selectedSection, quantities, filter, search])

  // Progress per team/section
  function sectionProgress(code) {
    const codes = SECTION_CODES[code] || []
    const owned = codes.filter(c => (quantities[c] || 0) > 0).length
    return { owned, total: codes.length }
  }

  function openSection(code) {
    setSelectedSection(code)
    setFilter('all')
    setSearch('')
  }

  function goHome() {
    setSelectedSection(null)
    setSearch('')
    setFilter('all')
  }

  const currentTeam = selectedSection ? TEAMS.find(t => t.code === selectedSection) : null
  const currentSpecial = selectedSection ? SPECIAL_SECTIONS.find(s => s.code === selectedSection) : null

  // ── HOME VIEW ──────────────────────────────────────────────────────────────
  if (!selectedSection) {
    const filteredTeams = TEAMS.filter(t => {
      if (groupFilter !== 'ALL' && t.group !== groupFilter) return false
      if (teamSearch && !t.name.toLowerCase().includes(teamSearch.toLowerCase())) return false
      return true
    })
    const teamsByGroup = groupFilter === 'ALL'
      ? GROUPS.map(g => ({ group: g, teams: TEAMS.filter(t => t.group === g) }))
      : [{ group: groupFilter, teams: filteredTeams }]

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

        {/* Special sections */}
        <div className="special-sections">
          {SPECIAL_SECTIONS.map(s => {
            const { owned, total } = sectionProgress(s.code)
            return (
              <button key={s.code} className="special-card" onClick={() => openSection(s.code)}>
                <span className="special-icon">{s.icon}</span>
                <span className="special-name">{s.name}</span>
                <span className="special-count muted">{owned}/{total}</span>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="toolbar" style={{ marginTop: 20 }}>
          <input
            type="search"
            placeholder="Buscar selección…"
            value={teamSearch}
            onChange={e => setTeamSearch(e.target.value)}
            className="search"
          />
          <div className="filter-pills">
            <button
              className={`pill ${groupFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setGroupFilter('ALL')}
            >
              Todos
            </button>
            {GROUPS.map(g => (
              <button
                key={g}
                className={`pill ${groupFilter === g ? 'active' : ''}`}
                onClick={() => setGroupFilter(g)}
              >
                Grupo {g}
              </button>
            ))}
          </div>
        </div>

        {/* Teams grid by group */}
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          teamsByGroup.map(({ group, teams }) => {
            const shown = teamSearch
              ? teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
              : teams
            if (shown.length === 0) return null
            return (
              <div key={group} className="group-section">
                <h3 className="group-header">Grupo {group}</h3>
                <div className="teams-grid">
                  {shown.map(team => {
                    const { owned, total } = sectionProgress(team.code)
                    const pct = Math.round((owned / total) * 100)
                    const complete = owned === total
                    return (
                      <button
                        key={team.code}
                        className={`team-card${complete ? ' team-complete' : ''}`}
                        onClick={() => openSection(team.code)}
                      >
                        <img
                          src={`${FLAG_BASE}/${team.iso2}.png`}
                          alt={team.name}
                          className="team-flag"
                          loading="lazy"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                        <span className="team-name">{team.name}</span>
                        <div className="team-prog-track">
                          <div
                            className="team-prog-fill"
                            style={{
                              width: `${pct}%`,
                              background: complete ? 'var(--green)' : undefined,
                            }}
                          />
                        </div>
                        <span className="team-count muted">{owned}/{total}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── STICKER VIEW ──────────────────────────────────────────────────────────
  const sectionName = currentTeam?.name ?? currentSpecial?.name ?? selectedSection

  return (
    <div className="page">
      {/* Header */}
      <div className="section-header">
        <button className="btn-ghost" onClick={goHome}>← Volver</button>
        {currentTeam && (
          <img
            src={`${FLAG_BASE}/${currentTeam.iso2}.png`}
            alt={currentTeam.name}
            className="section-flag"
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        {!currentTeam && currentSpecial && (
          <span style={{ fontSize: 28 }}>{currentSpecial.icon}</span>
        )}
        <div>
          <h2 style={{ margin: 0 }}>{sectionName}</h2>
          {currentTeam && (
            <span className="muted" style={{ fontSize: 13 }}>
              Grupo {currentTeam.group}
            </span>
          )}
        </div>
        {(() => {
          const { owned, total } = sectionProgress(selectedSection)
          return (
            <span className={`tag ${owned === total ? 'owned-tag' : 'dupe-tag'}`} style={{ marginLeft: 'auto' }}>
              {owned}/{total}
            </span>
          )
        })()}
      </div>

      {/* Filters */}
      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar figurita…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search"
        />
        <div className="filter-pills">
          {[['all','Todas'],['owned','Tengo'],['missing','Faltan'],['dupes','Repetidas']].map(([k, l]) => (
            <button
              key={k}
              className={`pill ${filter === k ? 'active' : ''}`}
              onClick={() => setFilter(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="grid">
          {visible.map(s => (
            <StickerCard
              key={s.code}
              sticker={s}
              quantity={quantities[s.code] || 0}
              onChange={q => updateQuantity(s.code, q)}
            />
          ))}
          {visible.length === 0 && <p className="muted">No hay figuritas con ese filtro.</p>}
        </div>
      )}
    </div>
  )
}
