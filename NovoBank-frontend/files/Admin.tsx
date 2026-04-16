import { useEffect, useState } from 'react'
import { admin as adminApi } from '../api/client'
import {
  PageHeader, StatCard, fmtKz, fmtDateTime, TxnBadge,
  Alert, EmptyState, Pagination, Field, inputCls, btnPrimary, btnGhost, btnDanger, btnSm, Spinner,
} from '../components/ui'
import type { DashboardMetrics, AdminUser, Transaction } from '../types'

// ── Admin Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.dashboard().then(d => { setMetrics(d as DashboardMetrics); setLoading(false) })
  }, [])

  if (loading) return (
    <div>
      <div className="h-9 w-64 skeleton mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => <div key={i} className="h-24 skeleton" />)}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform-wide metrics and operations overview." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"    value={metrics?.total_users.toLocaleString() || '0'} topColor="#F5A623" delay={0} />
        <StatCard label="Active Users"   value={metrics?.active_users.toLocaleString() || '0'} sub="is_active = true" delay={40} />
        <StatCard label="KYC Pending"    value={metrics?.kyc_pending || 0} sub="Requires review" topColor={metrics?.kyc_pending ? '#F5A623' : undefined} delay={80} />
        <StatCard label="Total Accounts" value={metrics?.total_accounts.toLocaleString() || '0'} delay={120} />
        <StatCard label="Total Deposits" value={fmtKz(metrics?.total_deposits_kz || 0)} topColor="#2ECC71" delay={160} />
        <StatCard label="Txns Today"     value={metrics?.transactions_today || 0} delay={200} />
        <StatCard label="Volume Today"   value={fmtKz(metrics?.volume_today_kz || 0)} delay={240} />
        <StatCard label="AML Flags"      value={metrics?.aml_flags_pending || 0} sub="Pending review" topColor={metrics?.aml_flags_pending ? '#E74C3C' : undefined} delay={280} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up delay-320">
          <h3 className="text-sm font-semibold text-soft uppercase tracking-widest mb-1">Revenue This Month</h3>
          <div className="font-display text-[36px] font-bold text-gold my-3">
            {fmtKz(metrics?.revenue_this_month_kz || 0)}
          </div>
          <p className="text-xs text-text-dim">From transaction fees, interchange, and subscriptions.</p>
        </div>

        <div className="bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up delay-360 flex flex-col gap-3">
          <h3 className="text-base font-semibold">Quick Actions</h3>
          {[
            { href: '/admin/users',   label: '◈ Manage Users' },
            { href: '/admin/kyc',     label: '◉ Review KYC Queue' },
            { href: '/admin/aml',     label: `⚠ AML Queue${metrics?.aml_flags_pending ? ` (${metrics.aml_flags_pending})` : ''}` },
            { href: '/admin/reports', label: '◎ View Reports' },
          ].map(a => (
            <a key={a.href} href={a.href} className={`${btnGhost} justify-start`}>{a.label} →</a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Admin Users ───────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [data, setData] = useState<{ users: AdminUser[]; total: number } | null>(null)
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = async (p = 1) => {
    setLoading(true)
    const res = await adminApi.users({ search: search || undefined, kyc_status: kycFilter || undefined, page: p }) as typeof data
    setData(res); setLoading(false)
  }

  useEffect(() => { load(1); setPage(1) }, [search, kycFilter])

  const toggleActive = async (userId: string) => {
    await adminApi.toggleActive(userId)
    setMsg('User status updated'); load(page)
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${data?.total || 0} total users`} />
      {msg && <div className="mb-4"><Alert type="success" message={msg} /></div>}

      <div className="bg-ink-mid border border-border rounded-DEFAULT px-5 py-4 mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[220px]">
            <Field label="Search">
              <input className={inputCls} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, phone…" />
            </Field>
          </div>
          <div className="w-40">
            <Field label="KYC Status">
              <select className={inputCls} value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
                <option value="">All</option>
                {['pending', 'submitted', 'verified', 'rejected'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="bg-ink-mid border border-border rounded-DEFAULT p-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton" />)}
          </div>
        ) : !data?.users.length ? (
          <EmptyState icon="◈" title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th>
                    <th>KYC</th><th>Accounts</th><th>Balance</th>
                    <th>Status</th><th>Joined</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u => (
                    <tr key={u.id}>
                      <td className="font-semibold">{u.full_name}</td>
                      <td className="text-text-dim text-xs">{u.email}</td>
                      <td className="text-text-dim text-xs">{u.phone}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          u.kyc_status === 'verified' ? 'bg-emerald/15 text-emerald'
                          : u.kyc_status === 'rejected' ? 'bg-danger/15 text-danger'
                          : u.kyc_status === 'submitted' ? 'bg-info/15 text-info'
                          : 'bg-muted/20 text-soft'
                        }`}>{u.kyc_status}</span>
                      </td>
                      <td className="text-center">{u.account_count}</td>
                      <td className="font-semibold whitespace-nowrap">{fmtKz(u.total_balance)}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          u.is_active ? 'bg-emerald/15 text-emerald' : 'bg-danger/15 text-danger'
                        }`}>{u.is_active ? 'Active' : 'Suspended'}</span>
                      </td>
                      <td className="text-text-dim text-xs whitespace-nowrap">{fmtDateTime(u.created_at)}</td>
                      <td>
                        <button
                          className={`${u.is_active ? btnDanger : btnGhost} ${btnSm}`}
                          onClick={() => toggleActive(u.id)}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page} hasMore={(page * 20) < (data?.total || 0)} total={data?.total || 0}
              onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ── KYC Queue ─────────────────────────────────────────────────────────────────
export function AdminKYC() {
  const [data, setData] = useState<{ users: AdminUser[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [rejReason, setRejReason] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await adminApi.users({ kyc_status: 'submitted' }) as typeof data
    setData(res); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const review = async (userId: string, status: 'verified' | 'rejected') => {
    setActing(userId)
    await adminApi.reviewKyc(userId, status, rejReason[userId])
    setMsg(`KYC ${status} for user`)
    load(); setActing(null)
  }

  return (
    <div>
      <PageHeader title="KYC Review Queue" subtitle="Review submitted identity documents." />
      {msg && <div className="mb-4"><Alert type="success" message={msg} /></div>}

      {loading ? <div className="h-72 skeleton" />
        : !data?.users.length ? (
          <div className="bg-ink-mid border border-border rounded-DEFAULT">
            <EmptyState icon="◉" title="KYC queue is clear" body="No pending submissions to review." />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {data.users.map(u => (
              <div key={u.id} className="bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <div className="font-bold text-base">{u.full_name}</div>
                    <div className="text-text-dim text-[13px] mt-1">{u.email} · {u.phone}</div>
                    <div className="text-text-dim text-xs mt-1">{u.account_count} account(s) · Submitted for review</div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px]">
                      <Field label="Rejection reason (if rejecting)">
                        <input
                          className={inputCls}
                          value={rejReason[u.id] || ''}
                          onChange={e => setRejReason(r => ({ ...r, [u.id]: e.target.value }))}
                          placeholder="e.g. Document unclear"
                        />
                      </Field>
                    </div>
                    <button className={`${btnPrimary} ${btnSm}`} onClick={() => review(u.id, 'verified')} disabled={acting === u.id}>
                      {acting === u.id ? <Spinner /> : '✓ Approve'}
                    </button>
                    <button className={`${btnDanger} ${btnSm}`} onClick={() => review(u.id, 'rejected')} disabled={acting === u.id}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// ── AML Queue ─────────────────────────────────────────────────────────────────
export function AdminAML() {
  const [data, setData] = useState<{ transactions: Transaction[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await adminApi.amlFlagged() as typeof data
    setData(res); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const review = async (txnId: string, action: 'clear' | 'reverse' | 'escalate') => {
    setActing(txnId)
    await adminApi.reviewAml(txnId, action, notes[txnId])
    setMsg(`Transaction ${action}d successfully`)
    load(); setActing(null)
  }

  return (
    <div>
      <PageHeader title="AML Review Queue" subtitle="Transactions flagged for anti-money laundering compliance." />
      {msg && <div className="mb-4"><Alert type="success" message={msg} /></div>}

      {loading ? <div className="h-72 skeleton" />
        : !data?.transactions.length ? (
          <div className="bg-ink-mid border border-border rounded-DEFAULT">
            <EmptyState icon="⚠" title="AML queue is clear" body="No flagged transactions pending review." />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {data.transactions.map(txn => (
              <div key={txn.id} className="bg-ink-mid border-l-4 border-l-gold border border-border rounded-DEFAULT p-6 animate-fade-up">
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-[11px] text-soft">{txn.reference}</span>
                      <TxnBadge status={txn.status} />
                    </div>
                    <div className="font-display text-[24px] font-bold text-gold">{fmtKz(txn.amount)}</div>
                    <div className="text-xs text-text-dim mt-1">
                      {txn.transaction_type.replace(/_/g, ' ')} · {fmtDateTime(txn.created_at)} · via {txn.channel}
                    </div>
                    {(txn as unknown as { aml_reason?: string }).aml_reason && (
                      <div className="mt-2 px-3 py-1.5 bg-gold/10 rounded text-xs text-gold">
                        ⚠ {(txn as unknown as { aml_reason: string }).aml_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[240px]">
                    <Field label="Review notes">
                      <input
                        className={inputCls}
                        value={notes[txn.id] || ''}
                        onChange={e => setNotes(n => ({ ...n, [txn.id]: e.target.value }))}
                        placeholder="Optional notes"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <button className={`${btnPrimary} ${btnSm} flex-1`} onClick={() => review(txn.id, 'clear')} disabled={acting === txn.id}>
                        {acting === txn.id ? <Spinner /> : '✓ Clear'}
                      </button>
                      <button className={`${btnDanger} ${btnSm} flex-1`} onClick={() => review(txn.id, 'reverse')} disabled={acting === txn.id}>
                        ↩ Reverse
                      </button>
                      <button className={`${btnGhost} ${btnSm} flex-1`} onClick={() => review(txn.id, 'escalate')} disabled={acting === txn.id}>
                        ↑ Escalate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
