import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import SnakeLogo from './components/SnakeLogo'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useMobile } from './hooks/useMobile'
import { useFaviconSnake } from './hooks/useFaviconSnake'
import { UnitProvider, useUnit } from './contexts/UnitContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import NewBet from './pages/NewBet'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import Spreadsheet from './pages/Spreadsheet'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import { Tutorial, useTutorial } from './components/Tutorial'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

const navItems = [
  { to: '/',             label: 'Dashboard',    end: true  },
  { to: '/planilha',     label: 'Planilha',     end: false },
  { to: '/analytics',    label: 'Analytics',    end: false },
  { to: '/estatisticas', label: 'Metas',        end: false },
  { to: '/configuracoes',label: 'Configurações',end: false },
]

const HEADER_H = 52

// ─── Floating New Bet FAB (draggable) ─────────────────────────────────────────
const FAB_KEY = 'fab-position'

function FloatingNewBet() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useMobile()

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const s = localStorage.getItem(FAB_KEY)
      if (s) return JSON.parse(s)
    } catch {}
    return { x: window.innerWidth - 168, y: window.innerHeight - 76 }
  })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null)
  const fabRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onResize = () => {
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth  - (fabRef.current?.offsetWidth  ?? 56) - 8),
        y: Math.min(p.y, window.innerHeight - (fabRef.current?.offsetHeight ?? 56) - 8),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, moved: false }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true
    const w = fabRef.current?.offsetWidth  ?? 56
    const h = fabRef.current?.offsetHeight ?? 56
    setPos({
      x: Math.max(8, Math.min(window.innerWidth  - w - 8, dragRef.current.originX + dx)),
      y: Math.max(HEADER_H + 8, Math.min(window.innerHeight - h - 8, dragRef.current.originY + dy)),
    })
  }
  const onPointerUp = (_e: React.PointerEvent) => {
    if (!dragRef.current) return
    const moved = dragRef.current.moved
    dragRef.current = null
    setDragging(false)
    if (!moved) navigate('/apostas/nova')
    else setPos(p => { localStorage.setItem(FAB_KEY, JSON.stringify(p)); return p })
  }

  if (pathname === '/apostas/nova') return null

  return (
    <div
      ref={fabRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 50,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none', touchAction: 'none',
      }}
    >
      <button
        className="fab-pulse"
        style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 9,
          padding: isMobile ? '0' : '0 20px',
          width: isMobile ? 48 : 'auto', height: 48,
          borderRadius: isMobile ? '50%' : 24,
          background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
          border: 'none', color: '#fff',
          fontSize: isMobile ? 22 : 13, fontWeight: 600,
          cursor: dragging ? 'grabbing' : 'pointer',
          justifyContent: 'center', whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transition: dragging ? 'none' : 'box-shadow 0.2s',
          boxShadow: dragging
            ? '0 8px 32px rgba(109,40,217,0.45)'
            : '0 2px 16px rgba(109,40,217,0.3)',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        {!isMobile && <span>Nova Aposta</span>}
      </button>
    </div>
  )
}

// ─── Unit toggle ──────────────────────────────────────────────────────────────

function UnitToggle() {
  const { showU, setShowU } = useUnit()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => setShowU(!showU)}
        title={showU ? 'Mostrar em R$' : 'Mostrar em unidades'}
        style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 3, cursor: 'pointer', gap: 2,
        }}
      >
        {(['R$', 'U'] as const).map(label => (
          <span key={label} style={{
            padding: '2px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
            transition: 'all 0.15s',
            background: (label === 'U') === showU ? 'var(--purple-600)' : 'transparent',
            color:      (label === 'U') === showU ? '#fff' : 'var(--text-muted)',
          }}>{label}</span>
        ))}
      </button>
    </div>
  )
}

// ─── Top nav ──────────────────────────────────────────────────────────────────

function TopNav() {
  const isMobile  = useMobile()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  useFaviconSnake()

  // close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
      height: HEADER_H,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
        <SnakeLogo size={28} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          BetManager
        </span>
      </div>

      {/* Desktop nav links */}
      {!isMobile && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                borderRadius: 6,
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                transition: 'all 0.12s',
                position: 'relative',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement
                if (!el.style.background.includes('surface')) {
                  el.style.background = 'var(--bg-card)'
                  el.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement
                if (!el.style.background.includes('surface')) {
                  el.style.background = 'transparent'
                  el.style.color = 'var(--text-secondary)'
                }
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Spacer on mobile */}
      {isMobile && <div style={{ flex: 1 }} />}

      {/* Right controls (desktop) */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
          <UnitToggle />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', opacity: 0.8 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.username}</span>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 11,
              cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >Sair</button>
        </div>
      )}

      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      )}

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'absolute', top: HEADER_H, left: 0, right: 0,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          padding: '8px 12px 12px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding: '10px 14px',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                borderRadius: 8,
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--purple-400)' : '2px solid transparent',
              })}
            >{item.label}</NavLink>
          ))}
        </div>
      )}
    </header>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <TopNav />
      <main style={{ paddingTop: HEADER_H }}>
        {children}
      </main>
      <FloatingNewBet />
    </div>
  )
}

// ─── Protected route ──────────────────────────────────────────────────────────

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const { show: showTutorial, close: closeTutorial } = useTutorial(user?.id)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando…</p>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/apostas/nova"  element={<NewBet />} />
        <Route path="/analytics"     element={<Analytics />} />
        <Route path="/estatisticas"  element={<Goals />} />
        <Route path="/planilha"      element={<Spreadsheet />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
      {showTutorial && <Tutorial onClose={closeTutorial} />}
    </Layout>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UnitProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login"           element={<Login />} />
              <Route path="/cadastro"        element={<Register />} />
              <Route path="/verificar-email" element={<VerifyEmail />} />
              {/* Protected */}
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </UnitProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
