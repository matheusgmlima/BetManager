import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import SnakeLogo from './components/SnakeLogo'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useMobile } from './hooks/useMobile'
import { useFaviconSnake } from './hooks/useFaviconSnake'
import Dashboard from './pages/Dashboard'
import NewBet from './pages/NewBet'
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
  { to: '/estatisticas',  label: 'Estatísticas',  icon: '◎' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
]

// ─── Floating New Bet FAB (draggable) ─────────────────────────────────────────
const FAB_KEY = 'fab-position'

function FloatingNewBet() {
  const navigate  = useNavigate()
  const isMobile  = useMobile()

  const getDefault = useCallback(() => ({
    x: window.innerWidth  - (isMobile ? 80  : 172),
    y: window.innerHeight - (isMobile ? 80  : 80),
  }), [isMobile])

  const [pos,     setPos]     = useState<{ x: number; y: number }>(() => {
    try {
      const s = localStorage.getItem(FAB_KEY)
      if (s) return JSON.parse(s)
    } catch {}
    return { x: window.innerWidth - 172, y: window.innerHeight - 80 }
  })
  const [dragging, setDragging] = useState(false)
  const dragRef   = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null)
  const fabRef    = useRef<HTMLDivElement>(null)

  // Clamp inside viewport on resize
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
    // Only drag on the container div, not child buttons
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
    const newX = Math.max(8, Math.min(window.innerWidth  - w - 8, dragRef.current.originX + dx))
    const newY = Math.max(8, Math.min(window.innerHeight - h - 8, dragRef.current.originY + dy))
    setPos({ x: newX, y: newY })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const moved = dragRef.current.moved
    dragRef.current = null
    setDragging(false)
    if (!moved) {
      // it was a click — navigate
      navigate('/apostas/nova')
    } else {
      // save position
      setPos(p => { localStorage.setItem(FAB_KEY, JSON.stringify(p)); return p })
    }
  }

  return (
    <div
      ref={fabRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        zIndex: 50,
        display: 'flex', alignItems: 'center',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <button
        className="fab-pulse"
        style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 10,
          padding: isMobile ? '0' : '0 22px',
          width:   isMobile ? 52 : 'auto',
          height:  isMobile ? 52 : 52,
          borderRadius: isMobile ? '50%' : 26,
          background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
          border: 'none', color: '#fff',
          fontSize: isMobile ? 22 : 14, fontWeight: 700,
          cursor: dragging ? 'grabbing' : 'pointer',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none', // delegated to parent div
          transition: dragging ? 'none' : 'box-shadow 0.2s',
          boxShadow: dragging ? '0 8px 32px rgba(124,58,237,0.5)' : '0 4px 20px rgba(124,58,237,0.35)',
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
        {!isMobile && <span>Nova Aposta</span>}
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
            <Route path="/apostas/nova"  element={<NewBet />} />
            <Route path="/estatisticas"  element={<Goals />} />
            <Route path="/planilha"      element={<Spreadsheet />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
