import { useState } from 'react'
import { useMobile } from '../hooks/useMobile'
import {
  useSports,    useCreateSport,    useUpdateSport,    useToggleSport,
  useBookmakers, useCreateBookmaker, useUpdateBookmaker, useToggleBookmaker,
  useProfiles,  useCreateProfile,  useUpdateProfile,  useToggleProfile,
} from '../hooks/useConfig'
import { Sport, Bookmaker, BettingProfile } from '../types/bet.types'

// ─── Design tokens ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg-primary)',
  border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 13px', color: 'var(--text-primary)',
  fontSize: 14, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit',
}

const focus = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = '#7c3aed'
  e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.12)'
}
const blur = (e: React.FocusEvent<any>) => {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow   = 'none'
}

// ─── Preset colors ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#7c3aed','#6366f1','#ec4899','#22c55e','#f59e0b',
  '#ef4444','#06b6d4','#8b5cf6','#10b981','#f97316',
  '#3b82f6','#a855f7','#14b8a6','#eab308','#64748b',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={focus} onBlur={blur}
        placeholder="#6B7280"
        style={{ ...inp, paddingLeft: 40 }}
      />
      <div style={{
        position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        width: 18, height: 18, borderRadius: 6,
        background: /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#6B7280',
        border: '1px solid rgba(255,255,255,0.1)',
      }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)} style={{
            width: 22, height: 22, borderRadius: 6, background: c, border: 'none',
            cursor: 'pointer', outline: value === c ? '2px solid #fff' : 'none',
            outlineOffset: 2, transition: 'transform 0.1s',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ active, onToggle, loading }: { active: boolean; onToggle: () => void; loading?: boolean }) {
  return (
    <button type="button" onClick={onToggle} disabled={loading} style={{
      width: 40, height: 22, borderRadius: 999, padding: '2px',
      background: active ? '#7c3aed' : 'rgba(255,255,255,0.08)',
      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'background 0.2s', display: 'flex', alignItems: 'center',
      opacity: loading ? 0.5 : 1,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transform: active ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

// ─── Bookmakers Section ───────────────────────────────────────────────────────

function BookmakersSection() {
  const { data: bookmakers = [], isLoading } = useBookmakers()
  const createBookmaker  = useCreateBookmaker()
  const updateBookmaker  = useUpdateBookmaker()
  const toggleBookmaker  = useToggleBookmaker()

  const [adding,   setAdding]   = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState('#7c3aed')
  const [editId,   setEditId]   = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor,setEditColor]= useState('')

  const startEdit = (b: Bookmaker) => {
    setEditId(b.id); setEditName(b.name); setEditColor(b.color); setAdding(false)
  }
  const cancelEdit = () => setEditId(null)
  const cancelAdd  = () => { setAdding(false); setNewName(''); setNewColor('#7c3aed') }

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createBookmaker.mutateAsync({ name: newName.trim(), color: newColor })
    cancelAdd()
  }

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return
    await updateBookmaker.mutateAsync({ id: editId, data: { name: editName.trim(), color: editColor } })
    cancelEdit()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isLoading && <Skeleton />}

      {bookmakers.map(b => (
        editId === b.id ? (
          <div key={b.id} style={editCard}>
            <div style={{ position: 'relative' }}>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                onFocus={focus} onBlur={blur}
                style={{ ...inp, marginBottom: 10 }}
                placeholder="Nome da casa"
              />
            </div>
            <div style={{ position: 'relative' }}>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={cancelEdit} style={btnSecondary}>Cancelar</button>
              <button onClick={handleUpdate} disabled={updateBookmaker.isLoading} style={btnPrimary}>
                {updateBookmaker.isLoading ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div key={b.id} style={itemRow(b.active)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, flexShrink: 0, boxShadow: `0 0 6px ${b.color}88` }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: b.active ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.name}
              </span>
              {!b.active && <span style={inactiveBadge}>inativa</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button onClick={() => startEdit(b)} style={iconBtn} title="Editar">✎</button>
              <Toggle active={b.active} onToggle={() => toggleBookmaker.mutate(b.id)} loading={toggleBookmaker.isLoading} />
            </div>
          </div>
        )
      ))}

      {adding ? (
        <div style={editCard}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onFocus={focus} onBlur={blur}
            style={{ ...inp, marginBottom: 10 }}
            placeholder="Nome da casa (ex: Betano)"
            autoFocus
          />
          <div style={{ position: 'relative' }}>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={cancelAdd} style={btnSecondary}>Cancelar</button>
            <button onClick={handleAdd} disabled={createBookmaker.isLoading || !newName.trim()} style={btnPrimary}>
              {createBookmaker.isLoading ? 'Criando…' : '+ Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>
          + Nova casa de apostas
        </button>
      )}
    </div>
  )
}

// ─── Sports Section ───────────────────────────────────────────────────────────

function SportsSection() {
  const { data: sports = [], isLoading } = useSports()
  const createSport  = useCreateSport()
  const updateSport  = useUpdateSport()
  const toggleSport  = useToggleSport()

  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [editId,  setEditId]  = useState<number | null>(null)
  const [editName,setEditName]= useState('')
  const [editIcon,setEditIcon]= useState('')

  const startEdit = (s: Sport) => { setEditId(s.id); setEditName(s.name); setEditIcon(s.icon ?? ''); setAdding(false) }
  const cancelEdit = () => setEditId(null)
  const cancelAdd  = () => { setAdding(false); setNewName(''); setNewIcon('') }

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createSport.mutateAsync({ name: newName.trim(), icon: newIcon.trim() || null })
    cancelAdd()
  }

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return
    await updateSport.mutateAsync({ id: editId, data: { name: editName.trim(), icon: editIcon.trim() || null } })
    cancelEdit()
  }

  const SPORT_ICONS = ['⚽','🏀','🎾','🏈','⚾','🏒','🏉','🏐','🎱','🏓','🥊','🏊','🎽','🏇','🚴','🏋️','🤼','🎯','🎮','🏆']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isLoading && <Skeleton />}

      {sports.map(s => (
        editId === s.id ? (
          <div key={s.id} style={editCard}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input value={editIcon} onChange={e => setEditIcon(e.target.value)}
                onFocus={focus} onBlur={blur}
                style={{ ...inp, width: 56, textAlign: 'center', fontSize: 18, padding: '9px 8px' }}
                placeholder="⚽" maxLength={4}
              />
              <input value={editName} onChange={e => setEditName(e.target.value)}
                onFocus={focus} onBlur={blur}
                style={{ ...inp, flex: 1 }}
                placeholder="Nome do esporte"
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {SPORT_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setEditIcon(ic)} style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 16, border: editIcon === ic ? '2px solid #7c3aed' : '1px solid var(--border)',
                  background: editIcon === ic ? 'rgba(124,58,237,0.15)' : 'var(--bg-primary)', cursor: 'pointer',
                }}>
                  {ic}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelEdit} style={btnSecondary}>Cancelar</button>
              <button onClick={handleUpdate} disabled={updateSport.isLoading} style={btnPrimary}>
                {updateSport.isLoading ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div key={s.id} style={itemRow(s.active)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              {s.icon && <span style={{ fontSize: 20, lineHeight: 1 }}>{s.icon}</span>}
              <span style={{ fontSize: 14, fontWeight: 600, color: s.active ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              {!s.active && <span style={inactiveBadge}>inativo</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button onClick={() => startEdit(s)} style={iconBtn} title="Editar">✏️</button>
              <Toggle active={s.active} onToggle={() => toggleSport.mutate(s.id)} loading={toggleSport.isLoading} />
            </div>
          </div>
        )
      ))}

      {adding ? (
        <div style={editCard}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, width: 56, textAlign: 'center', fontSize: 18, padding: '9px 8px' }}
              placeholder="⚽" maxLength={4}
            />
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, flex: 1 }}
              placeholder="Nome do esporte"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {SPORT_ICONS.map(ic => (
              <button key={ic} type="button" onClick={() => setNewIcon(ic)} style={{
                width: 34, height: 34, borderRadius: 8, fontSize: 16, border: newIcon === ic ? '2px solid #7c3aed' : '1px solid var(--border)',
                background: newIcon === ic ? 'rgba(124,58,237,0.15)' : 'var(--bg-primary)', cursor: 'pointer',
              }}>
                {ic}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelAdd} style={btnSecondary}>Cancelar</button>
            <button onClick={handleAdd} disabled={createSport.isLoading || !newName.trim()} style={btnPrimary}>
              {createSport.isLoading ? 'Criando…' : '+ Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>
          + Novo esporte
        </button>
      )}
    </div>
  )
}

// ─── Profiles Section ─────────────────────────────────────────────────────────

function ProfilesSection() {
  const { data: profiles = [], isLoading } = useProfiles()
  const createProfile = useCreateProfile()
  const updateProfile = useUpdateProfile()
  const toggleProfile = useToggleProfile()

  const [adding,   setAdding]  = useState(false)
  const [newName,  setNewName] = useState('')
  const [editId,   setEditId]  = useState<number | null>(null)
  const [editName, setEditName]= useState('')

  const startEdit = (p: BettingProfile) => { setEditId(p.id); setEditName(p.name); setAdding(false) }
  const cancelEdit = () => setEditId(null)
  const cancelAdd  = () => { setAdding(false); setNewName('') }

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createProfile.mutateAsync({ name: newName.trim() })
    cancelAdd()
  }

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return
    await updateProfile.mutateAsync({ id: editId, data: { name: editName.trim() } })
    cancelEdit()
  }

  const PROFILE_COLORS = ['#a78bfa','#818cf8','#c084fc','#f472b6','#34d399','#60a5fa']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isLoading && <Skeleton />}

      {profiles.map((p, i) => {
        const cor   = PROFILE_COLORS[i % PROFILE_COLORS.length]
        const sigla = p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

        return editId === p.id ? (
          <div key={p.id} style={editCard}>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              onFocus={focus} onBlur={blur}
              style={{ ...inp, marginBottom: 10 }}
              placeholder="Nome do perfil"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelEdit} style={btnSecondary}>Cancelar</button>
              <button onClick={handleUpdate} disabled={updateProfile.isLoading} style={btnPrimary}>
                {updateProfile.isLoading ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div key={p.id} style={itemRow(p.active)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: `${cor}20`, border: `1px solid ${cor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: cor,
              }}>
                {sigla}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: p.active ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              {!p.active && <span style={inactiveBadge}>inativo</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button onClick={() => startEdit(p)} style={iconBtn} title="Editar">✏️</button>
              <Toggle active={p.active} onToggle={() => toggleProfile.mutate(p.id)} loading={toggleProfile.isLoading} />
            </div>
          </div>
        )
      })}

      {adding ? (
        <div style={editCard}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onFocus={focus} onBlur={blur}
            style={{ ...inp, marginBottom: 10 }}
            placeholder="Nome do perfil (ex: VIP Premium)"
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelAdd} style={btnSecondary}>Cancelar</button>
            <button onClick={handleAdd} disabled={createProfile.isLoading || !newName.trim()} style={btnPrimary}>
              {createProfile.isLoading ? 'Criando…' : '+ Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setEditId(null) }} style={addBtn}>
          + Novo perfil VIP
        </button>
      )}
    </div>
  )
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.04)',
          animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 100}ms`,
        }} />
      ))}
    </>
  )
}

const itemRow = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 16px', borderRadius: 12,
  border: '1px solid var(--border)',
  background: active ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
  transition: 'border-color 0.15s',
})

const editCard: React.CSSProperties = {
  padding: '16px', borderRadius: 12,
  border: '1px solid #7c3aed',
  background: 'rgba(124,58,237,0.06)',
}

const inactiveBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
  background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
  background: 'transparent', cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'border-color 0.15s',
}

const btnPrimary: React.CSSProperties = {
  flex: 1, padding: '9px 0', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 0 14px rgba(124,58,237,0.3)',
}

const btnSecondary: React.CSSProperties = {
  flex: 1, padding: '9px 0', borderRadius: 9,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

const addBtn: React.CSSProperties = {
  width: '100%', padding: '11px', borderRadius: 12,
  border: '1px dashed rgba(124,58,237,0.4)', background: 'transparent',
  color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s',
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

interface TabConfig {
  key: string
  icon: string
  label: string
  description: string
  component: React.ReactNode
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const isMobile = useMobile()
  const [tab, setTab] = useState('bookmakers')

  const tabs: TabConfig[] = [
    {
      key: 'bookmakers', icon: '◈', label: 'Casas de Apostas',
      description: 'Gerencie as casas onde você aposta',
      component: <BookmakersSection />,
    },
    {
      key: 'sports', icon: '◇', label: 'Esportes',
      description: 'Configure os esportes disponíveis',
      component: <SportsSection />,
    },
    {
      key: 'profiles', icon: '◉', label: 'Perfis VIP',
      description: 'Perfis de apostadores associados às suas apostas',
      component: <ProfilesSection />,
    },
  ]

  const active = tabs.find(t => t.key === tab)!

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: isMobile ? '56px 16px 32px' : '32px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          margin: 0, fontSize: isMobile ? 22 : 26, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--purple-400), var(--purple-300))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Configurações
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Personalize casas de apostas, esportes e perfis
        </p>
      </div>

      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Sidebar tabs */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden',
          marginBottom: isMobile ? 20 : 0,
        }}>
          {tabs.map((t, i) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px', border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'rgba(124,58,237,0.12)' : 'transparent',
              borderLeft: `3px solid ${tab === t.key ? '#7c3aed' : 'transparent'}`,
              borderBottom: i < tabs.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'all 0.15s', textAlign: 'left',
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: tab === t.key ? '#a78bfa' : 'var(--text-secondary)' }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Panel header */}
          <div style={{
            padding: '18px 24px', borderBottom: '1px solid var(--border)',
            background: 'rgba(124,58,237,0.04)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>{active.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{active.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{active.description}</p>
            </div>
          </div>

          {/* Panel body */}
          <div style={{ padding: '20px 24px' }}>
            {active.component}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
      </div>
    </div>
  )
}
