import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accounts, transactions } from '../api/client'
import { StatCard, PageHeader, fmtKz, fmtDateTime, TxnBadge, EmptyState } from '../components/ui'
import type { AccountSummary, TransactionList } from '../types'
import { useAuthStore } from '../store/auth'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [txns, setTxns] = useState<TransactionList | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      accounts.list(),
      transactions.list({ page_size: 8 }),
    ]).then(([s, t]) => {
      setSummary(s as AccountSummary)
      setTxns(t as TransactionList)
    }).finally(() => setLoading(false))
  }, [])

  const primaryAccount = summary?.accounts.find(a => a.is_primary) || summary?.accounts[0]

  if (loading) return (
    <div>
      <div style={{ height: 36, width: 260, marginBottom: 32 }} className="skeleton" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 32 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: 110 }} className="skeleton" />)}
      </div>
      <div style={{ height: 320 }} className="skeleton" />
    </div>
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.full_name.split(' ')[0]}.`}
        subtitle="Here's your financial overview."
        action={
          <Link to="/transfer" className="btn btn-primary">
            ↗ New Transfer
          </Link>
        }
      />

      {/* KYC banner */}
      {user?.kyc_status !== 'verified' && (
        <div className="fade-up" style={{
          padding: '14px 20px', background: 'rgba(245,166,35,0.1)',
          border: '1px solid rgba(245,166,35,0.3)', borderRadius: 'var(--radius-sm)',
          marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>⚠ KYC Verification Pending</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 12 }}>
              Complete verification to unlock transfers and full features.
            </span>
          </div>
          <Link to="/profile" className="btn btn-ghost btn-sm">Verify Now →</Link>
        </div>
      )}

      {/* Balance hero */}
      {primaryAccount && (
        <div className="fade-up" style={{
          background: 'linear-gradient(135deg, var(--ink-light) 0%, var(--ink-mid) 100%)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '32px', marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circle */}
          <div style={{
            position: 'absolute', right: -60, top: -60, width: 240, height: 240,
            borderRadius: '50%', border: '1px solid rgba(245,166,35,0.12)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', right: -30, top: -30, width: 160, height: 160,
            borderRadius: '50%', border: '1px solid rgba(245,166,35,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--soft)', marginBottom: 8 }}>
            Primary Account · {primaryAccount.account_number}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--gold)' }}>
            {fmtKz(primaryAccount.balance)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
            {primaryAccount.account_type} account · {primaryAccount.status}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <Link to="/transfer" className="btn btn-primary">↗ Transfer</Link>
            <Link to="/bills" className="btn btn-ghost">◻ Pay Bills</Link>
            <Link to="/savings" className="btn btn-ghost">◎ Savings</Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Total Balance"
          value={fmtKz(summary?.total_balance || 0)}
          sub={`${summary?.total_accounts || 0} account(s)`}
          accent="var(--gold)"
          delay={0}
        />
        <StatCard
          label="Transactions"
          value={txns?.total || 0}
          sub="All time"
          delay={60}
        />
        <StatCard
          label="KYC Status"
          value={user?.kyc_status || '—'}
          sub={user?.kyc_status === 'verified' ? 'Account fully active' : 'Action required'}
          accent={user?.kyc_status === 'verified' ? 'var(--green)' : 'var(--gold)'}
          delay={120}
        />
      </div>

      {/* Recent transactions */}
      <div className="card fade-up" style={{ animationDelay: '180ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16 }}>Recent Transactions</h3>
          <Link to="/transactions" style={{ fontSize: 13, color: 'var(--gold)' }}>View all →</Link>
        </div>

        {!txns?.transactions.length ? (
          <EmptyState icon="⇄" title="No transactions yet" body="Your transactions will appear here." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {txns.transactions.map(txn => {
                  const isCredit = txn.receiver_account_id && !txn.sender_account_id
                  return (
                    <tr key={txn.id}>
                      <td style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDateTime(txn.created_at)}</td>
                      <td>
                        <span style={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--soft)' }}>
                          {txn.transaction_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {txn.description || txn.external_payee_name || txn.reference}
                      </td>
                      <td style={{ fontWeight: 600, color: isCredit ? 'var(--green)' : 'var(--text)', whiteSpace: 'nowrap' }}>
                        {isCredit ? '+' : '-'}{fmtKz(txn.amount)}
                      </td>
                      <td><TxnBadge status={txn.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
