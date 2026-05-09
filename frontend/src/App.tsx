import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import NewBet from './pages/NewBet'
import Statistics from './pages/Statistics'
import Goals from './pages/Goals'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

const navItems = [
  { to: '/',              label: '📊 Dashboard'     },
  { to: '/apostas',       label: '📋 Histórico'     },
  { to: '/apostas/nova',  label: '➕ Nova Aposta'   },
  { to: '/estatisticas',  label: '📈 Estatísticas'  },
  { to: '/metas',         label: '🎯 Metas'         },
  { to: '/configuracoes', label: '⚙️ Configurações' },
]

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 gap-1">
        <h1 className="text-xl font-bold text-red-500 px-3 mb-6">BetManager</h1>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
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
            <Route path="/configuracoes" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
