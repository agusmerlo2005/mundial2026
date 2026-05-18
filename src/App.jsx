import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import MyAlbum from './pages/MyAlbum'
import Friends from './pages/Friends'
import Navbar from './components/Navbar'
import './App.css'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page"><p className="muted">Cargando…</p></div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Protected>
                <MyAlbum />
              </Protected>
            }
          />
          <Route
            path="/amigos"
            element={
              <Protected>
                <Friends />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
