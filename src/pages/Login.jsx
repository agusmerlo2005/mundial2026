import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username || email.split('@')[0],
          })
        }
        // Si Supabase tiene "Confirm email" desactivado, ya viene la sesión
        // y el useEffect de arriba redirige. Si está activado, avisamos.
        if (!data.session) {
          setMsg({ type: 'ok', text: 'Cuenta creada. Revisá tu email para confirmar.' })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Álbum Mundial 2026</h1>
        <p className="auth-sub">
          {mode === 'signin' ? 'Iniciá sesión para cargar tus figuritas' : 'Creá tu cuenta'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label>
              <span>Nombre / Apodo</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Cómo te ven tus amigos"
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? '...' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {msg && <p className={`auth-msg ${msg.type}`}>{msg.text}</p>}

        <button
          className="link"
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  )
}
