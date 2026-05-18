import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const name = profile?.username || user?.email

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="brand">🏆 Álbum Mundial 2026</div>
        <div className="nav-links">
          <NavLink to="/" end>
            Mi álbum
          </NavLink>
          <NavLink to="/amigos">Repetidas de amigos</NavLink>
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
