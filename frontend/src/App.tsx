import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import SnakeLogo from './components/SnakeLogo'
import { QueryClient, QueryClientProvider } from 'react-query'
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
  { to: '/',              label: 'Dashboard',    icon: '▦' },
  { to: '/planilha',      label: 'Planilha',     icon: '⊞' },
  { to: '/metas',         label: 'Metas',        icon: '◎' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
]

// ─── Floating New Bet FAB ─────────────────────────────────────────────────────
function FloatingNewBet() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [hidden, setHidden]       = useState(false)

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        title="Mostrar botão Nova Aposta"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.4)',
          color: '#a78bfa', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.32)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)' }}
      >
        +
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}
    >
      {/* Controls row */}
      <div className="flex gap-2 items-center">
        {/* Hide button */}
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

        {/* Collapse toggle */}
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

      {/* Main FAB */}
      <button
        onClick={() => navigate('/apostas/nova')}
        className="fab-pulse"
        style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
          padding: collapsed ? '0' : '0 22px',
          width: collapsed ? 52 : 'auto',
          height: 52,
          borderRadius: collapsed ? '50%' : 26,
          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          border: 'none', color: '#fff',
          fontSize: collapsed ? 22 : 14, fontWeight: 700,
          cursor: 'pointer',
          justifyContent: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
      >
        <span style={{ fontSize: collapsed ? 22 : 18, lineHeight: 1 }}>+</span>
        {!collapsed && <span>Nova Aposta</span>}
      </button>
    </div>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col py-6 px-3 fixed top-0 left-0 h-full z-10"
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      >
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

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 flex-1">
          <p className="text-xs font-semibold px-3 mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Menu
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 overflow-auto" style={{ minHeight: '100vh' }}>
        {children}
      </main>

      {/* Floating button */}
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
