import { type ReactNode } from 'react'

// ── Shared class strings ───────────────────────────────────────────────────────
export const badgeBase = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]'
export const inputCls  = 'w-full bg-ink-light border border-border rounded-sm text-text-base px-3.5 py-[11px] text-sm transition-colors duration-200 focus:border-gold focus:outline-none placeholder:text-muted'
export const btnBase   = 'inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-all duration-200 whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed'
export const btnPrimary= `${btnBase} bg-gold text-ink px-5 py-[11px] text-sm hover:-translate-y-px hover:bg-gold-light active:translate-y-0`
export const btnGhost  = `${btnBase} bg-transparent text-text-dim border border-border px-5 py-[11px] text-sm hover:bg-ink-light hover:text-text-base`
export const btnDanger = `${btnBase} bg-danger/15 text-danger border border-danger/30 px-5 py-[11px] text-sm hover:bg-danger/25`
export const btnSm     = '!px-3.5 !py-[7px] !text-xs'
export const btnLg     = '!px-7 !py-3.5 !text-base'

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, topColor, delay = 0,
}: { label: string; value: string | number; sub?: string; topColor?: string; delay?: number }) {
  const delayClass = `delay-${delay}`
  return (
    <div
      className={`bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up ${delayClass}`}
      style={topColor ? { borderTop: `3px solid ${topColor}` } : undefined}
    >
      <div className="text-[11px] uppercase tracking-widest text-soft mb-2.5">{label}</div>
      <div className="text-[26px] font-bold font-display" style={topColor ? { color: topColor } : { color: '#E8EBF4' }}>
        {value}
      </div>
      {sub && <div className="text-xs text-text-dim mt-1">{sub}</div>}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div>
        <h1 className="text-[28px] mb-1">{title}</h1>
        {subtitle && <p className="text-text-dim text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="text-4xl">{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      {body && <div className="text-text-dim text-sm max-w-[300px]">{body}</div>}
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ type, message }: { type: 'error' | 'success' | 'info'; message: string }) {
  const styles = {
    error:   'bg-danger/10 border border-danger/20 text-danger',
    success: 'bg-emerald/10 border border-emerald/20 text-emerald',
    info:    'bg-info/10 border border-info/20 text-info',
  }
  return <div className={`px-4 py-3 rounded-sm text-sm leading-relaxed ${styles[type]}`}>{message}</div>
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-ink/85 flex items-center justify-center z-[1000] p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-ink-mid border border-border rounded-DEFAULT p-6 w-full max-w-[480px] max-h-[90vh] overflow-y-auto animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg">{title}</h3>
          <button onClick={onClose} className="bg-transparent text-soft text-xl leading-none px-1 hover:text-text-base transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ cls = '' }: { cls?: string }) {
  return <span className={`inline-block w-[18px] h-[18px] border-2 border-white/20 border-t-current rounded-full animate-spin flex-shrink-0 ${cls}`} />
}

// ── Field wrapper ──────────────────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-soft">{label}</label>
      {children}
    </div>
  )
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmtKz = (n: number) => new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 2 }).format(n) + ' Kz'
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// ── Badges ────────────────────────────────────────────────────────────────────
const badgeVariants: Record<string, string> = {
  green:  `${badgeBase} bg-emerald/15 text-emerald`,
  red:    `${badgeBase} bg-danger/15 text-danger`,
  gold:   `${badgeBase} bg-gold/15 text-gold`,
  muted:  `${badgeBase} bg-muted/20 text-soft`,
  blue:   `${badgeBase} bg-info/15 text-info`,
}

export function TxnBadge({ status }: { status: string }) {
  const v = { completed: 'green', failed: 'red', flagged: 'gold', pending: 'muted', reversed: 'muted' }[status] || 'muted'
  return <span className={badgeVariants[v]}>{status}</span>
}

export function KycBadge({ status }: { status: string }) {
  const v = { verified: 'green', rejected: 'red', submitted: 'blue', pending: 'muted' }[status] || 'muted'
  return <span className={badgeVariants[v]}>{status}</span>
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ page, hasMore, onPrev, onNext, total }: {
  page: number; hasMore: boolean; total: number; onPrev: () => void; onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between mt-5 text-sm text-text-dim">
      <span>{total} total</span>
      <div className="flex gap-2 items-center">
        <button className={`${btnGhost} ${btnSm}`} onClick={onPrev} disabled={page === 1}>← Prev</button>
        <span className="px-3 py-[7px] text-sm">Page {page}</span>
        <button className={`${btnGhost} ${btnSm}`} onClick={onNext} disabled={!hasMore}>Next →</button>
      </div>
    </div>
  )
}
