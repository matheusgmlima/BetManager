// ─── Skeleton primitives ──────────────────────────────────────────────────────
// Reutilizavel em qualquer pagina. Use o mesmo keyframe "shimmer" do index.css.

const BASE: React.CSSProperties = {
  borderRadius: 6,
  background: 'linear-gradient(90deg, #1a1a2e 25%, #242438 50%, #1a1a2e 75%)',
  backgroundSize: '200% auto',
  animation: 'shimmer 1.4s linear infinite',
}

/** Bloco retangular generico */
export function Skeleton({ w, h, radius = 6, style }: {
  w?: number | string
  h?: number | string
  radius?: number
  style?: React.CSSProperties
}) {
  return (
    <div style={{ ...BASE, width: w ?? '100%', height: h ?? 14, borderRadius: radius, flexShrink: 0, ...style }} />
  )
}

/** Linha de texto simulada */
export function SkeletonText({ lines = 1, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={13} w={i === lines - 1 && lines > 1 ? '65%' : '100%'} />
      ))}
    </div>
  )
}

/** Card completo com icone + linhas de texto */
export function SkeletonCard({ h = 80 }: { h?: number }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 18px', height: h,
      display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden',
    }}>
      <Skeleton h={10} w="40%" />
      <Skeleton h={28} w="55%" />
    </div>
  )
}

/** Pill/chip — para os stats pequenos (ROI, Win Rate...) */
export function SkeletonPill() {
  return (
    <div style={{
      padding: '8px 16px', borderRadius: 10,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      minWidth: 80,
    }}>
      <Skeleton h={9} w={32} style={{ marginBottom: 6 }} />
      <Skeleton h={20} w={52} />
    </div>
  )
}

/** Barra de grafico horizontal */
export function SkeletonBar({ width = '100%' }: { width?: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Skeleton h={12} w={80} />
      <Skeleton h={20} w={width} radius={4} />
      <Skeleton h={12} w={36} />
    </div>
  )
}

/** Linha de tabela — versao generica */
export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  const widths = ['60%', '100%', '80%', '50%', '40%', '60%', '50%', '40%']
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <Skeleton h={13} w={widths[i % widths.length]} />
        </td>
      ))}
    </tr>
  )
}
