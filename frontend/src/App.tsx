import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
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
  { to: '/apostas',       label: 'Histórico',    icon: '≡' },
  { to: '/apostas/nova',  label: 'Nova Aposta',  icon: '+' },
  { to: '/estatisticas',  label: 'Estatísticas', icon: '↗' },
  { to: '/metas',         label: 'Metas',        icon: '◎' },
  { to: '/planilha',      label: 'Planilha',      icon: '⊞' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
]

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
