import { Icon, IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(124,58,237,0.06)',
        border: '1px solid rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
      }}>
        <Icon name={icon} size={30} strokeWidth={1.5} />
      </div>

      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
        {title}
      </p>

      {description && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 8,
            padding: '9px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
            color: '#fff', fontSize: 13, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function EmptyStateRow({ colSpan, icon = 'inbox', title, description }: {
  colSpan: number
  icon?: IconName
  title: string
  description?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <EmptyState icon={icon} title={title} description={description} />
      </td>
    </tr>
  )
}
