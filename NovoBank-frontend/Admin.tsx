import { useEffect, useState } from 'react'
import { admin as adminApi } from '../api/client'
import { PageHeader, StatCard, fmtKz, fmtDateTime, TxnBadge, Alert, EmptyState, Pagination } from '../components/ui'
import type { DashboardMetrics, AdminUser, Transaction } from '../types'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.dashboard().then(d => { setMetrics(d as DashboardMetrics); setLoading(false) })
  }, [])

  if (loading) return (
    <div>
      <div style={{ height: 36, width: 260, marginBottom: 32 }} className="skeleton" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ height: 100 }} className="skeleton" />)}
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform-wide metrics and operations overview." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Users" value={metrics?.total_users.toLocaleString() || '0'} accent="var(--gold)" delay={0} />
        <StatCard label="Active Users" value={metrics?.active_users.toLocaleString() || '0'} sub="is_active = true" delay={40} />
        <StatCard label="KYC Pending" value={metrics?.kyc_pending || 0} sub="Requires review" accent={metrics?.kyc_pending ? 'var(--gold)' : undefined} delay={80} />
        <StatCard label="Total Accounts" value={metrics?.total_accounts.toLocaleString() || '0'} delay={120} />
        <StatCard label="Total Deposits" value={fmtKz(metrics?.total_deposits_kz || 0)} accent="var(--green)" delay={160} />
        <StatCard label="Txns Today" value={metrics?.transactions_today || 0} delay={200} />
        <StatCard label="Volume Today" value={fmtKz(metrics?.volume_today_kz || 0)} delay={240} />
        <StatCard label="AML Flags" value={metrics?.aml_flags_pending || 0} sub="Pending review" accent={metrics?.aml_flags_pending ? 'var(--red)' : undefined} delay={280} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card fade-up" style={{ animationDelay: '320ms' }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Revenue This Month</h3>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--gold)', margin: '12px 0' }}>
            {fmtKz(metrics?.revenue_this_month_kz || 0)}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>From transaction fees, interchange, and subscriptions.</p>
        </div>
        <div className="card fade-up" style={{ animationDelay: '360ms', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/admin/users" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>◈ Manage Users →</a>
            <a href="/admin/kyc" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>◉ Review KYC Queue →</a>
            <a href="/admin/aml" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>⚠ AML Queue {metrics?.aml_flags_pending ? `(${metrics.aml_flags_pending})` : ''} →</a>
            <a href="/admin/reports" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>◎ View Reports →</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Admin Users ────────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [data, setData] = useState<{ users: AdminUser[]; total: number } | null>(null)
  const [search, setSearch] = useState('')
  const [kycFilter, setKycFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const load = async (p = 1) => {
    setLoading(true)
    const res = await adminApi.users({ search: search || undefined, kyc_status: kycFilter || undefined, page: p }) as typeof data
    setData(res)
    setLoading(false)
  }

  useEffect(() => { load(1); setPage(1) }, [search, kycFilter])

  const toggleActive = async (userId: string) => {
    await adminApi.toggleActive(userId)
    setActionMsg('User status updated')
    load(page)
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle={`${data?.total || 0} total users`} />
      {actionMsg && <div style={{ marginBottom: 16 }}><Alert type="success" message={actionMsg} /></div>}

      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 240px' }}>
            <label>Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, phone…" />
          </div>
          <div className="field" style={{ flex: '0 0 160px' }}>
            <label>KYC Status</label>
            <select value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
              <option value="">All</option>
              {['pending','submitted','verified','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(5)].map((_,i) => <div key={i} style={{ height: 48 }} className="skeleton" />)}
          </div>
        ) : !data?.users.length ? (
          <EmptyState icon="◈" title="No users found" />
        ) : (
          <>
            <div className="table-wrap">
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
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.email}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.phone}</td>
                      <td>
                        <span className={`badge ${u.kyc_status === 'verified' ? 'badge-green' : u.kyc_status === 'rejected' ? 'badge-red' : u.kyc_status === 'submitted' ? 'badge-blue' : 'badge-muted'}`}>
                          {u.kyc_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{u.account_count}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtKz(u.total_balance)}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDateTime(u.created_at)}</td>
                      <td>
                        <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ghost'}`} onClick={() => toggleActive(u.id)}>
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} hasMore={(page * 20) < (data?.total || 0)} total={data?.total || 0}
              onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)} />
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

  const load = async () => {
    setLoading(true)
    const res = await adminApi.users({ kyc_status: 'submitted' }) as typeof data
    setData(res)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const review = async (userId: string, status: 'verified' | 'rejected') => {
    await adminApi.reviewKyc(userId, status, rejReason[userId])
    setMsg(`KYC ${status} for user`)
    load()
  }

  return (
    <div>
      <PageHeader title="KYC Review Queue" subtitle="Review submitted identity documents." />
      {msg && <div style={{ marginBottom: 16 }}><Alert type="success" message={msg} /></div>}

      {loading ? <div style={{ height: 300 }} className="skeleton" /> : !data?.users.length ? (
        <div className="card">
          <EmptyState icon="◉" title="KYC queue is clear" body="No pending submissions to review." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.users.map(u => (
            <div key={u.id} className="card fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{u.full_name}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 2 }}>{u.email} · {u.phone}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>Submitted for review · {u.account_count} account(s)</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="field" style={{ flex: '1 1 200px' }}>
                    <label>Rejection reason (if rejecting)</label>
                    <input value={rejReason[u.id] || ''} onChange={e => setRejReason(r => ({ ...r, [u.id]: e.target.value }))} placeholder="e.g. Document unclear" />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => review(u.id, 'verified')}>✓ Approve</button>
                  <button className="btn btn-danger btn-sm" onClick={() => review(u.id, 'rejected')}>✕ Reject</button>
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

  const load = async () => {
    setLoading(true)
    const res = await adminApi.amlFlagged() as typeof data
    setData(res)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const review = async (txnId: string, action: 'clear' | 'reverse' | 'escalate') => {
    await adminApi.reviewAml(txnId, action, notes[txnId])
    setMsg(`Transaction ${action}d successfully`)
    load()
  }

  return (
    <div>
      <PageHeader title="AML Review Queue" subtitle="Review transactions flagged for anti-money laundering compliance." />
      {msg && <div style={{ marginBottom: 16 }}><Alert type="success" message={msg} /></div>}

      {loading ? <div style={{ height: 300 }} className="skeleton" /> : !data?.transactions.length ? (
        <div className="card">
          <EmptyState icon="⚠" title="AML queue is clear" body="No flagged transactions pending review." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.transactions.map(txn => (
            <div key={txn.id} className="card fade-up" style={{ borderLeft: '3px solid var(--gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--soft)' }}>{txn.reference}</span>
                    <TxnBadge status={txn.status} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>
                    {fmtKz(txn.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                    {txn.transaction_type.replace(/_/g, ' ')} · {fmtDateTime(txn.created_at)} · via {txn.channel}
                  </div>
                  {txn.aml_flagged && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(245,166,35,0.1)', borderRadius: 6, fontSize: 12, color: 'var(--gold)' }}>
                      ⚠ {(txn as unknown as { aml_reason?: string }).aml_reason || 'Flagged for review'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
                  <div className="field">
                    <label>Review notes</label>
                    <input value={notes[txn.id] || ''} onChange={e => setNotes(n => ({ ...n, [txn.id]: e.target.value }))} placeholder="Optional notes" />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => review(txn.id, 'clear')}>✓ Clear</button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => review(txn.id, 'reverse')}>↩ Reverse</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => review(txn.id, 'escalate')}>↑ Escalate</button>
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
