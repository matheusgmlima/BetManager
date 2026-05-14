import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface AuthUser {
  id:        number
  username:  string
  email:     string
  unitValue: number
}

interface AuthCtxValue {
  user:      AuthUser | null
  token:     string | null
  loading:   boolean
  login:     (email: string, password: string) => Promise<void>
  logout:    () => void
  register:  (username: string, email: string, password: string) => Promise<string>
  updateUnit:(unitValue: number) => Promise<void>
}

const AuthCtx = createContext<AuthCtxValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [token,   setToken]   = useState<string | null>(() => localStorage.getItem('bm_token'))
  const [loading, setLoading] = useState(true)

  // Inject token into every axios request
  useEffect(() => {
    const id = axios.interceptors.request.use(cfg => {
      if (token) cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` }
      return cfg
    })
    return () => axios.interceptors.request.eject(id)
  }, [token])

  // On mount (or token change), fetch current user
  useEffect(() => {
    if (!token) { setLoading(false); return }
    axios.get<AuthUser>(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setUser(r.data))
      .catch(() => { localStorage.removeItem('bm_token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (email: string, password: string) => {
    const { data } = await axios.post<{ token: string; user: AuthUser }>(`${API}/auth/login`, { email, password })
    localStorage.setItem('bm_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('bm_token')
    setToken(null)
    setUser(null)
  }

  const register = async (username: string, email: string, password: string) => {
    const { data } = await axios.post<{ message: string }>(`${API}/auth/register`, { username, email, password })
    return data.message
  }

  const updateUnit = async (unitValue: number) => {
    await axios.patch(`${API}/auth/me/unit`, { unitValue }, { headers: { Authorization: `Bearer ${token}` } })
    setUser(u => u ? { ...u, unitValue } : u)
  }

  return (
    <AuthCtx.Provider value={{ user, token, loading, login, logout, register, updateUnit }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
