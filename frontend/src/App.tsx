import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import SnakeLogo from './components/SnakeLogo'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useMobile } from './hooks/useMobile'
import { useFaviconSnake } from './hooks/useFaviconSnake'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import NewBet from './pages/NewBet'
import Statistics from './pages/Statistics'
import Goals from './pages/Goals'
import Settings from './pages/Settings'
import Spreadsheet from './pages/Spreadsheet'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

const navItems = [
  { to: '/',              label: 'Dashboard',     icon: '▦' },
  { to: '/planilha',      label: 'Planilha',      icon: '⊞' },
  { to: '/metas',         label: 'Metas',         icon: '◎' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
]

// ─── Floating New Bet FAB ─────────────────────────────────────────────────────
function FloatingNewBet() {
  const navigate = useNavigate()
  const isMobile = useMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [hidden, setHidden]       = useState(false)

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        title="Mostrar botão Nova Aposta"
        style={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          zIndex: 50,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.4)',
          color: '#a78bfa', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
      >
        +
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 16 : 24,
        right: isMobile ? 16 : 24,
        zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}
    >
      {/* Controls — hidden on mobile to save space */}
      {!isMobile && (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setHidden(true)}
            title="Ocultar"
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(20,10,40,0.85)',
              border: '1px solid rgba(124,58,237,0.25)',
              color: '#5a5a78', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5a5a78'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)' }}
          >
            ✕
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Recolher'}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(20,10,40,0.85)',
              border: '1px solid rgba(124,58,237,0.25)',
              color: '#5a5a78', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5a5a78'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)' }}
          >
            {collapsed ? '‹' : '›'}
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => navigate('/apostas/nova')}
        className="fab-pulse"
        style={{
          display: 'flex', alignItems: 'center',
          gap: (collapsed && !isMobile) ? 0 : 10,
          padding: (collapsed && !isMobile) ? '0' : (isMobile ? '0 18px' : '0 22px'),
          width: (collapsed && !isMobile) ? 52 : 'auto',
          height: isMobile ? 46 : 52,
          borderRadius: (collapsed && !isMobile) ? '50%' : 26,
          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          border: 'none', color: '#fff',
          fontSize: (collapsed && !isMobile) ? 22 : 14, fontWeight: 700,
          cursor: 'pointer',
          justifyContent: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
      >
        <span style={{ fontSize: (collapsed && !isMobile) ? 22 : 18, lineHeight: 1 }}>+</span>
        {!(collapsed && !isMobile) && <span>Nova Aposta</span>}
      </button>
    </div>
  )
}

// ─── Sidebar content ──────────────────────────────────────────────────────────
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2.5">
          <div
            className="flex-shrink-0 logo-pulse"
            style={{ borderRadius: '50%', background: 'linear-gradient(135deg, #1a0a3e, #0f0820)', padding: 2 }}
          >
            <SnakeLogo size={36} />
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>BetManager</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gestão de apostas</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        <p className="text-xs font-semibold px-3 mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Menu
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavClick}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
              textDecoration: 'none',
              background: isActive
                ? 'linear-gradient(135deg, var(--purple-700), var(--purple-600))'
                : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              boxShadow: isActive ? '0 0 16px var(--purple-glow)' : 'none',
            })}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              if (!el.style.background.includes('gradient')) {
                el.style.background = 'var(--bg-card-hover)'
                el.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              if (!el.style.background.includes('gradient')) {
                el.style.background = 'transparent'
                el.style.color = 'var(--text-secondary)'
              }
            }}
          >
            <span
              className="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--bg-card)', color: 'var(--purple-400)' }}
            >
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div
        className="mx-1 mt-4 p-3 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Sistema online</p>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>v1.0.0 · MVP</p>
      </div>
    </>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  useFaviconSnake()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 18,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className="flex flex-col py-6 px-3"
        style={{
          width: 240,
          position: 'fixed', top: 0, left: 0, height: '100%',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          zIndex: 20,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}

        <SidebarContent onNavClick={isMobile ? () => setSidebarOpen(false) : undefined} />
      </aside>

      {/* Hamburger button — mobile only */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 17,
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            color: 'var(--purple-400)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ☰
        </button>
      )}

      {/* Main content */}
      <main
        className="flex-1 overflow-auto"
        style={{
          marginLeft: isMobile ? 0 : 240,
          minHeight: '100vh',
        }}
      >
        {children}
      </main>

      <FloatingNewBet />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/apostas"       element={<History />} />
            <Route path="/apostas/nova"  element={<NewBet />} />
            <Route path="/estatisticas"  element={<Statistics />} />
            <Route path="/metas"         element={<Goals />} />
            <Route path="/planilha"      element={<Spreadsheet />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
