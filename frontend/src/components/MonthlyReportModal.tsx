import { useState } from 'react'
// @ts-ignore
import { jsPDF } from 'jspdf'
import { useTipsters } from '../hooks/useConfig'
import { betsService } from '../services/betsService'
import { useAuth } from '../contexts/AuthContext'
import { Bet } from '../types/bet.types'

interface Props { onClose: () => void }

const MONTHS = [
  'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export default function MonthlyReportModal({ onClose }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [tipsterIds, setTipsterIds] = useState<number[]>([])
  const [unitType, setUnitType] = useState<'units' | 'brl'>('units')
  const [loading, setLoading] = useState(false)

  const { data: tipsters = [] } = useTipsters()
  const { user } = useAuth()
  const unitValue = user?.unitValue ?? 1

  function toggleTipster(id: number) {
    setTipsterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function generate() {
    setLoading(true)
    try {
      const dateFrom = new Date(year, month, 1).toISOString().split('T')[0]
      const dateTo   = new Date(year, month + 1, 0).toISOString().split('T')[0]
      let allBets: Bet[] = []

      if (tipsterIds.length === 0) {
        const res = await betsService.list({ dateFrom, dateTo, perPage: 2000, page: 1 })
        allBets = res.data
      } else {
        for (const tid of tipsterIds) {
          const res = await betsService.list({ dateFrom, dateTo, tipsterId: tid, perPage: 2000, page: 1 })
          allBets.push(...res.data)
        }
        allBets = allBets.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
      }

      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const byDay: Record<number, number> = {}
      for (let d = 1; d <= daysInMonth; d++) byDay[d] = 0

      for (const bet of allBets) {
        if (bet.result === 'pending' || bet.result === 'void') continue
        const day = parseInt(bet.date.split('T')[0].split('-')[2], 10)
        byDay[day] = (byDay[day] || 0) + (unitType === 'units' ? bet.profit / unitValue : bet.profit)
      }

      let headerName = user?.username || 'BetManager'
      if (tipsterIds.length === 1) {
        const t = tipsters.find(x => x.id === tipsterIds[0])
        if (t) headerName = t.name
      }

      buildPDF({ monthName: MONTHS[month], year, headerName, byDay, daysInMonth, unitType })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:9999,
      background:'rgba(0,0,0,0.75)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16,
    }}>
      <div style={{
        background:'#0d0d1a',border:'1px solid rgba(124,58,237,0.35)',
        borderRadius:16,padding:28,width:'100%',maxWidth:460,
        boxShadow:'0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{
              width:36,height:36,borderRadius:10,
              background:'linear-gradient(135deg,#7c3aed,#a855f7)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
            }}>
              📄
            </div>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:'#e2d9f3'}}>Relatorio Mensal</h2>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:8,color:'#7070a0',width:32,height:32,
            fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
          }}>x</button>
        </div>

        <div style={{display:'flex',gap:12,marginBottom:20}}>
          <div style={{flex:1}}>
            <label style={lbl}>MES</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={sel}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={lbl}>ANO</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={sel}>
              {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <label style={lbl}>EXIBIR EM</label>
          <div style={{display:'flex',gap:8}}>
            {(['units','brl'] as const).map(opt => (
              <button key={opt} onClick={() => setUnitType(opt)} style={{
                flex:1,padding:'9px 0',borderRadius:8,border:'1px solid',
                borderColor:unitType===opt?'#7c3aed':'rgba(124,58,237,0.2)',
                background:unitType===opt?'rgba(124,58,237,0.2)':'rgba(255,255,255,0.03)',
                color:unitType===opt?'#c4b5fd':'#7070a0',
                fontWeight:600,fontSize:13,cursor:'pointer',
              }}>
                {opt==='units'?'Unidades (U)':'Reais (R$)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:24}}>
          <label style={lbl}>TIPSTER(S)</label>
          <div style={{
            border:'1px solid rgba(124,58,237,0.2)',borderRadius:10,
            padding:10,maxHeight:160,overflowY:'auto',
            display:'flex',flexDirection:'column',gap:4,
          }}>
            <label style={chk(tipsterIds.length===0)}>
              <input type="checkbox" checked={tipsterIds.length===0}
                onChange={()=>setTipsterIds([])} style={{accentColor:'#7c3aed'}}/>
              <span>Todos</span>
            </label>
            {tipsters.map(t => (
              <label key={t.id} style={chk(tipsterIds.includes(t.id))}>
                <input type="checkbox" checked={tipsterIds.includes(t.id)}
                  onChange={()=>toggleTipster(t.id)} style={{accentColor:'#7c3aed'}}/>
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading} style={{
          width:'100%',padding:'13px 0',
          background:loading?'rgba(124,58,237,0.3)':'linear-gradient(135deg,#7c3aed,#a855f7)',
          border:'none',borderRadius:10,color:'#fff',
          fontWeight:700,fontSize:15,cursor:loading?'not-allowed':'pointer',
          boxShadow:loading?'none':'0 4px 20px rgba(124,58,237,0.4)',
        }}>
          {loading?'Gerando PDF...':'Gerar PDF'}
        </button>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display:'block',fontSize:11,fontWeight:700,
  color:'#7070a0',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.08em',
}
const sel: React.CSSProperties = {
  width:'100%',padding:'9px 12px',borderRadius:8,
  background:'#1a1a2e',border:'1px solid rgba(124,58,237,0.25)',
  color:'#e2d9f3',fontSize:14,outline:'none',
}
const chk = (active: boolean): React.CSSProperties => ({
  display:'flex',alignItems:'center',gap:8,padding:'6px 8px',
  borderRadius:6,cursor:'pointer',userSelect:'none',
  background:active?'rgba(124,58,237,0.12)':'transparent',
  color:active?'#c4b5fd':'#a0a0c0',fontSize:13,fontWeight:active?600:400,
})

interface PDFParams {
  monthName: string
  year: number
  headerName: string
  byDay: Record<number, number>
  daysInMonth: number
  unitType: 'units' | 'brl'
}

function buildPDF({ monthName, year, headerName, byDay, daysInMonth, unitType }: PDFParams) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W     = 210
  const M     = 16
  const CW    = W - M * 2
  const ROW_H = 6.5
  const COL_D = M + 10
  const COL_V = M + CW - 4
  const suffix = unitType === 'units' ? 'u' : ''
  const total  = Object.values(byDay).reduce((a, b) => a + b, 0)

  // ── Background ──────────────────────────────────────────────────────────
  doc.setFillColor(10, 8, 22)
  doc.rect(0, 0, W, 297, 'F')

  // ── Header band ─────────────────────────────────────────────────────────
  const ACCENT = 3   // uniform accent bar width (mm)
  const TXTX   = M + ACCENT + 3  // text starts after stripe + padding

  doc.setFillColor(18, 10, 40)
  doc.rect(0, 0, W, 24, 'F')
  doc.setFillColor(124, 58, 237)
  doc.rect(0, 0, ACCENT, 24, 'F')

  // Snake logo pixels (P=1.4mm per pixel, 8x6 grid)
  const P = 1.4
  const LX = TXTX        // logo origin x
  const LY = (24 - 6 * P) / 2  // logo vertically centered in 24mm header
  const LW = 8 * P
  const LH = 6 * P
  doc.setFillColor(30, 10, 60);   doc.rect(LX,         LY,         LW,         LH,         'F')
  doc.setFillColor(124, 58, 237); doc.rect(LX+P,       LY+P,       LW-2*P,     LH-2*P,     'F')
  doc.setFillColor(167, 139, 250);doc.rect(LX+P,       LY+P,       LW-2*P,     P,          'F')
  doc.setFillColor(45, 31, 94);   doc.rect(LX+2*P,     LY+3*P,     P,          P,          'F')
  doc.setFillColor(45, 31, 94);   doc.rect(LX+4*P,     LY+3*P,     P,          P,          'F')
  // eyes
  doc.setFillColor(240, 240, 255);doc.rect(LX+2*P,     LY+P,       2*P,        2*P,        'F')
  doc.setFillColor(10, 0, 26);    doc.rect(LX+3*P,     LY+P,       P,          P,          'F')
  doc.setFillColor(240, 240, 255);doc.rect(LX+5*P,     LY+P,       2*P,        2*P,        'F')
  doc.setFillColor(10, 0, 26);    doc.rect(LX+6*P,     LY+P,       P,          P,          'F')
  // tongue
  doc.setFillColor(244, 114, 182);doc.rect(LX+LW,      LY+3*P,     2*P,        P,          'F')
  doc.setFillColor(244, 114, 182);doc.rect(LX+LW+2*P,  LY+2*P,     P,          P,          'F')
  doc.setFillColor(244, 114, 182);doc.rect(LX+LW+2*P,  LY+4*P,     P,          P,          'F')

  // "BetManager" text aligned right of logo
  const NAMEX = LX + LW + 3 * P + 4   // gap after tongue (tongue extends 3*P beyond LW)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  // text baseline aligned to logo vertical center
  const TY = LY + 6 * P * 0.72
  doc.text('Bet', NAMEX, TY)
  const betW = doc.getTextWidth('Bet')
  doc.setTextColor(168, 85, 247)
  doc.text('Manager', NAMEX + betW, TY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 110, 160)
  doc.text('betmanager.app.br', W - M, TY, { align: 'right' })

  // separator lines
  doc.setFillColor(124, 58, 237); doc.rect(0, 24,   W, 1,   'F')
  doc.setFillColor(50, 20, 100);  doc.rect(0, 25,   W, 0.6, 'F')

  // ── Title section ────────────────────────────────────────────────────────
  doc.setFillColor(16, 12, 34)
  doc.rect(M, 29, CW, 18, 'F')
  doc.setFillColor(124, 58, 237)
  doc.rect(M, 29, ACCENT, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(168, 85, 247)
  doc.text('Planilha ' + monthName, M + ACCENT + 4, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 110, 160)
  doc.text(headerName + '   |   ' + String(year), M + ACCENT + 4, 44)

  // ── Table header ─────────────────────────────────────────────────────────
  let y = 52
  doc.setFillColor(28, 16, 58)
  doc.rect(M, y - 4.5, CW, ROW_H, 'F')
  doc.setFillColor(124, 58, 237)
  doc.rect(M, y - 4.5, ACCENT, ROW_H, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(168, 85, 247)
  doc.text('DIA', COL_D, y)
  doc.text('RESULTADO (' + (unitType === 'units' ? 'U' : 'R$') + ')', COL_V, y, { align: 'right' })
  y += ROW_H

  // ── Day rows ─────────────────────────────────────────────────────────────
  for (let d = 1; d <= daysInMonth; d++) {
    const val = byDay[d] || 0
    if (d % 2 === 0) {
      doc.setFillColor(15, 11, 30)
      doc.rect(M, y - 4.5, CW, ROW_H, 'F')
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 110, 160)
    doc.text(String(d), COL_D, y)

    if (val === 0) {
      doc.setTextColor(55, 50, 80)
      doc.text('-', COL_V, y, { align: 'right' })
    } else if (val > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 197, 94)
      doc.text('+' + val.toFixed(2) + suffix, COL_V, y, { align: 'right' })
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(239, 68, 68)
      doc.text(val.toFixed(2) + suffix, COL_V, y, { align: 'right' })
    }
    y += ROW_H
  }

  // ── Total row ─────────────────────────────────────────────────────────────
  y += 1
  doc.setFillColor(124, 58, 237)
  doc.rect(M, y - 4.5, CW, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('RESULTADO - ' + monthName.toUpperCase(), COL_D, y + 1)
  const tc: [number,number,number] = total >= 0 ? [134, 239, 172] : [252, 165, 165]
  doc.setTextColor(tc[0], tc[1], tc[2])
  doc.text((total >= 0 ? '+' : '') + total.toFixed(2) + (unitType === 'units' ? 'u' : ''), COL_V, y + 1, { align: 'right' })

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(16, 12, 34)
  doc.rect(0, 287, W, 10, 'F')
  doc.setFillColor(124, 58, 237)
  doc.rect(0, 287, W, 0.6, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 90, 140)
  doc.text('Gerado em ' + new Date().toLocaleDateString('pt-BR') + ' via BetManager  |  betmanager.app.br', W / 2, 292, { align: 'center' })

  doc.save('relatorio-' + monthName.toLowerCase() + '-' + String(year) + '.pdf')
}
