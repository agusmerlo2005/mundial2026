import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const name = profile?.username || user?.email
  const [pending, setPending] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    async function load() {
      const { count } = await supabase
        .from('trade_proposals')
        .select('id', { count: 'exact', head: true })
        .eq('to_user', user.id)
        .eq('status', 'pending')
      if (active) setPending(count || 0)
    }
    load()
    const ch = supabase
      .channel('nav_trades_count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_proposals' },
        load
      )
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(ch)
    }
  }, [user])

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="brand">🏆 Álbum Mundial 2026</div>
        <div className="nav-links">
          <NavLink to="/" end>
            Mi álbum
          </NavLink>
          <NavLink to="/amigos">Repetidas de amigos</NavLink>
          <NavLink to="/intercambios" className="nav-trades">
            Intercambios
            {pending > 0 && <span className="nav-badge">{pending}</span>}
          </NavLink>
        </div>
        <div className="nav-user">
          <span className="who">{name}</span>
          <button className="btn-ghost" onClick={signOut}>
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
