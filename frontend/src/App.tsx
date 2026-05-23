import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useState, useEffect, useRef, useMemo } from 'react'
import type { UserRole } from './contexts/AuthContext'
import SnakeLogo from './components/SnakeLogo'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useMobile } from './hooks/useMobile'
import { useFaviconSnake } from './hooks/useFaviconSnake'
import { UnitProvider, useUnit } from './contexts/UnitContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import NewBet from './pages/NewBet'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import Spreadsheet from './pages/Spreadsheet'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SetupAccount from './pages/SetupAccount'
import { Tutorial, useTutorial } from './components/Tutorial'
import { ErrorBoundary } from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

const navItems = [
  { to: '/',              label: 'Dashboard',     end: true  },
  { to: '/planilha',      label: 'Planilha',      end: false },
  { to: '/analytics',     label: 'Analytics',     end: false },
  { to: '/estatisticas',  label: 'Metas',         end: false },
  { to: '/configuracoes', label: 'Configuracoes', end: false },
]

const HEADER_H = 52
const TELEGRAM_LINK = 'https://t.me/matheusgmlima'

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin', permanent: 'Perma', partner: 'Partner', subscriber: 'Sub',
}
const ROLE_COLOR: Record<UserRole, string> = {
  admin: 'var(--purple-400)', permanent: '#f59e0b', partner: '#38bdf8', subscriber: 'var(--text-muted)',
}

function daysRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function isExpiredSub(role: UserRole | undefined, expiresAt: string | null | undefined): boolean {
  if (!role || role === 'admin' || role === 'permanent' || role === 'partner') return false
  const d = daysRemaining(expiresAt)
  return d !== null && d <= 0
}

const FAB_KEY = 'fab-position'

function FloatingNewBet() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useMobile()
  const { user } = useAuth()
  const expired = isExpiredSub(user?.role, user?.accessExpiresAt)

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try { const s = localStorage.getItem(FAB_KEY); if (s) return JSON.parse(s) } catch {}
    return { x: window.innerWidth - 168, y: window.innerHeight - 76 }
  })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null)
  const fabRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onResize = () => setPos(p => ({
      x: Math.min(p.x, window.innerWidth  - (fabRef.current?.offsetWidth  ?? 56) - 8),
      y: Math.min(p.y, window.innerHeight - (fabRef.current?.offsetHeight ?? 56) - 8),
    }))
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
    const w = fabRef.current?.offsetWidth ?? 56
    const h = fabRef.current?.offsetHeight ?? 56
    setPos({
      x: Math.max(8, Math.min(window.innerWidth  - w - 8, dragRef.current.originX + dx)),
      y: Math.max(HEADER_H + 8, Math.min(window.innerHeight - h - 8, dragRef.current.originY + dy)),
    })
  }
  const onPointerUp = (_e: React.PointerEvent) => {
    if (!dragRef.current) return
    const moved = dragRef.current.moved
    dragRef.current = null; setDragging(false)
    if (!moved) navigate('/apostas/nova')
    else setPos(p => { localStorage.setItem(FAB_KEY, JSON.stringify(p)); return p })
  }

  if (pathname === '/apostas/nova' || expired) return null

  return (
    <div ref={fabRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 50, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none' }}>
      <button className="fab-pulse" style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 9,
        padding: isMobile ? '0' : '0 20px', width: isMobile ? 48 : 'auto', height: 48,
        borderRadius: isMobile ? '50%' : 24,
        background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
        border: 'none', color: '#fff', fontSize: isMobile ? 22 : 13, fontWeight: 600,
        cursor: dragging ? 'grabbing' : 'pointer', justifyContent: 'center', whiteSpace: 'nowrap',
        pointerEvents: 'none', transition: dragging ? 'none' : 'box-shadow 0.2s',
        boxShadow: dragging ? '0 8px 32px rgba(109,40,217,0.45)' : '0 2px 16px rgba(109,40,217,0.3)',
      }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        {!isMobile && <span>Nova Aposta</span>}
      </button>
    </div>
  )
}

function UnitToggle() {
  const { showU, setShowU } = useUnit()
  return (
    <button onClick={() => setShowU(!showU)} title={showU ? 'Mostrar em R$' : 'Mostrar em unidades'}
      style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 3, cursor: 'pointer', gap: 2 }}>
      {(['R$', 'U'] as const).map(label => (
        <span key={label} style={{
          padding: '2px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
          background: (label === 'U') === showU ? 'var(--purple-600)' : 'transparent',
          color:      (label === 'U') === showU ? '#fff' : 'var(--text-muted)',
        }}>{label}</span>
      ))}
    </button>
  )
}

function UserInfo() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const days = useMemo(() => daysRemaining(user?.accessExpiresAt), [user?.accessExpiresAt])
  const role = user?.role ?? 'subscriber'
  const color = ROLE_COLOR[role]
  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'
  const dotColor = days !== null && days <= 0 ? 'var(--red)' : 'var(--green)'

  const info = (() => {
    if (isLifetime) return { text: 'Acesso vitalicio', color }
    if (days === null) return { text: 'Sem data definida', color: 'var(--text-muted)' }
    if (days <= 0) return { text: 'Acesso expirado', color: 'var(--red)' }
    if (days <= 7) return { text: `${days} dia${days !== 1 ? 's' : ''} restantes`, color: '#f59e0b' }
    return { text: `${days} dias restantes`, color: 'var(--text-muted)' }
  })()

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, opacity: 0.85 }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.username}</span>
      <span onClick={() => setOpen(o => !o)} style={{
        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
        background: `${color}18`, border: `1px solid ${color}40`, color,
        letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
      }}>{ROLE_LABEL[role]}</span>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <span style={{ fontSize: 12, color: info.color, fontWeight: 600 }}>{info.text}</span>
          </div>
        </>
      )}
    </div>
  )
}

function TopNav() {
  const isMobile = useMobile()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { logout, user } = useAuth()
  useFaviconSnake()
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const linkStyle = (isActive: boolean) => ({
    padding: '6px 12px', fontSize: 13, fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
    textDecoration: 'none', borderRadius: 6,
    background: isActive ? 'var(--bg-surface)' : 'transparent',
    transition: 'all 0.12s',
  })

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, height: HEADER_H, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
        <SnakeLogo size={28} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>BetManager</span>
      </div>

      {!isMobile && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} style={({ isActive }) => linkStyle(isActive)}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; if (!el.style.background.includes('surface')) { el.style.background = 'var(--bg-card)'; el.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; if (!el.style.background.includes('surface')) { el.style.background = 'transparent'; el.style.color = 'var(--text-secondary)' } }}
            >{item.label}</NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink to="/admin"
              style={({ isActive }) => ({ padding: '6px 12px', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--purple-400)' : 'var(--text-secondary)', textDecoration: 'none', borderRadius: 6, background: isActive ? 'rgba(167,139,250,0.1)' : 'transparent', transition: 'all 0.12s' })}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'var(--bg-card)'; el.style.color = 'var(--purple-400)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'transparent'; el.style.color = 'var(--text-secondary)' }}
            >Admin</NavLink>
          )}
        </nav>
      )}

      {isMobile && <div style={{ flex: 1 }} />}

      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
          <UnitToggle />
          <UserInfo />
          <button onClick={logout}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >Sair</button>
        </div>
      )}

      {isMobile && (
        <button onClick={() => setMenuOpen(o => !o)}
          style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {menuOpen ? 'X' : '='}
        </button>
      )}

      {isMobile && menuOpen && (
        <div style={{ position: 'absolute', top: HEADER_H, left: 0, right: 0, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({ padding: '10px 14px', fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: 'none', borderRadius: 8, background: isActive ? 'var(--bg-surface)' : 'transparent', borderLeft: isActive ? '2px solid var(--purple-400)' : '2px solid transparent' })}
            >{item.label}</NavLink>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <UserInfo />
            <button onClick={logout} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      )}
    </header>
  )
}

const TGIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
  </svg>
)

function ExpiredBanner() {
  const { user } = useAuth()
  const days = useMemo(() => daysRemaining(user?.accessExpiresAt), [user?.accessExpiresAt])
  const role = user?.role
  const isLifetime = role === 'admin' || role === 'permanent' || role === 'partner'
  if (isLifetime || days === null || days > 3) return null

  const tgBtn = (clr: string, bg: string, hoverBg: string) => (
    <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: bg, border: `1px solid ${clr}40`, color: clr, fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bg }}
    ><TGIcon /> Renovar acesso</a>
  )

  if (days <= 0) return (
    <div style={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, zIndex: 29, background: 'linear-gradient(90deg,#1a0505,#2a0808,#1a0505)', borderBottom: '1px solid rgba(239,68,68,0.35)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔒</span>
        <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>Seu acesso expirou — visualizacao somente leitura</span>
      </div>
      <span style={{ width: 1, height: 16, background: 'rgba(239,68,68,0.3)', flexShrink: 0 }} />
      {tgBtn('#f87171', 'rgba(239,68,68,0.12)', 'rgba(239,68,68,0.22)')}
    </div>
  )

  return (
    <div style={{ position: 'fixed', top: HEADER_H, left: 0, right: 0, zIndex: 29, background: 'linear-gradient(90deg,#1c1000,#2a1800,#1c1000)', borderBottom: '1px solid rgba(245,158,11,0.3)', padding: '9px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span>⏳</span>
        <span style={{ fontSize: 12, color: '#fcd34d', fontWeight: 600 }}>Seu acesso expira em <strong>{days} dia{days !== 1 ? 's' : ''}</strong></span>
      </div>
      <span style={{ width: 1, height: 14, background: 'rgba(245,158,11,0.3)', flexShrink: 0 }} />
      {tgBtn('#fbbf24', 'rgba(245,158,11,0.1)', 'rgba(245,158,11,0.2)')}
    </div>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const days = useMemo(() => daysRemaining(user?.accessExpiresAt), [user?.accessExpiresAt])
  const isLifetime = user?.role === 'admin' || user?.role === 'permanent' || user?.role === 'partner'
  const bannerH = !isLifetime && days !== null && days <= 3 ? 42 : 0
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <TopNav />
      <ExpiredBanner />
      <main style={{ paddingTop: HEADER_H + bannerH }}>{children}</main>
      <FloatingNewBet />
    </div>
  )
}

function useKeyboardShortcuts(expired: boolean) {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if ((e.target as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n' || e.key === 'N') {
        if (!expired) { e.preventDefault(); navigate('/apostas/nova') }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expired, navigate])
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const { show: showTutorial, close: closeTutorial } = useTutorial(user?.id)
  const expired = isExpiredSub(user?.role, user?.accessExpiresAt)
  useKeyboardShortcuts(expired)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Carregando...</p>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/setup-conta" replace />

  return (
    <Layout>
      <ErrorBoundary>
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/apostas/nova"  element={expired ? <Navigate to="/" replace /> : <NewBet />} />
          <Route path="/analytics"     element={<Analytics />} />
          <Route path="/estatisticas"  element={<Goals />} />
          <Route path="/planilha"      element={<Spreadsheet />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/admin"         element={user.role === 'admin' ? <AdminPanel /> : <Navigate to="/" replace />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      {showTutorial && <Tutorial onClose={closeTutorial} />}
    </Layout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UnitProvider>
          <BrowserRouter>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#12121f',
                  border: '1px solid rgba(124,58,237,0.35)',
                  color: '#e2e2f0',
                  fontSize: '13px',
                  borderRadius: '10px',
                },
              }}
            />
            <Routes>
              <Route path="/login"           element={<Login />} />
              <Route path="/cadastro"        element={<Register />} />
              <Route path="/verificar-email" element={<VerifyEmail />} />
              <Route path="/esqueci-senha"   element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/setup-conta"     element={<SetupAccount />} />
              <Route path="/*"               element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </UnitProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
