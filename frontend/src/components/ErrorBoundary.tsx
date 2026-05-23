import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: '100%',
          background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16, padding: '36px 32px', textAlign: 'center',
          boxShadow: '0 0 40px rgba(239,68,68,0.08)',
        }}>
          {/* icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>⚠️</div>

          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Algo deu errado
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Um componente falhou inesperadamente. Tente novamente ou recarregue a página.
          </p>

          {/* error detail (collapsible) */}
          <details style={{ textAlign: 'left', marginBottom: 24 }}>
            <summary style={{
              fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer',
              userSelect: 'none', marginBottom: 8,
            }}>
              Detalhes do erro
            </summary>
            <pre style={{
              fontSize: 11, color: '#ef4444',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 8, padding: '10px 12px', overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            }}>
              {error.message}
            </pre>
          </details>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={this.reset}
              style={{
                padding: '9px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--purple-700), var(--purple-500))',
                color: '#fff', fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '9px 24px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    )
  }
}

/** Wrapper leve para usar ao redor de seções individuais */
export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          padding: '32px 24px', textAlign: 'center',
          background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Esta seção falhou ao carregar.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
