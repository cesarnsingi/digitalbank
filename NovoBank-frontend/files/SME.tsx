import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { sme as smeApi, accounts as accountsApi } from '../api/client'
import { PageHeader, StatCard, fmtKz, Alert, EmptyState, Field, inputCls, btnPrimary, btnGhost, Spinner } from '../components/ui'
import type { Account, SMEAnalytics } from '../types'

type QRData = { has_qr: boolean; qr_payload?: string; merchant_name?: string; total_received_kz?: number }
type PayrollResult = {
  summary: { total_entries: number; successful: number; failed: number; total_disbursed_kz: number }
  results: { name: string; account_number: string; status: string; reference?: string; reason?: string }[]
}
type PayrollRow = { account_number: string; amount: string; name: string }

const tooltipStyle = {
  contentStyle: { background: '#1E2640', border: '1px solid #252D45', borderRadius: 8, fontSize: 12, color: '#E8EBF4' },
}

export default function SMEPortal() {
  const [businessAccount, setBusinessAccount] = useState<Account | null>(null)
  const [hasBiz, setHasBiz] = useState(false)
  const [analytics, setAnalytics] = useState<SMEAnalytics | null>(null)
  const [qrData, setQrData] = useState<QRData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [merchantName, setMerchantName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [payrollRows, setPayrollRows] = useState<PayrollRow[]>([{ account_number: '', amount: '', name: '' }])
  const [payrollResult, setPayrollResult] = useState<PayrollResult | null>(null)
  const [payrollLoading, setPayrollLoading] = useState(false)

  useEffect(() => {
    smeApi.businessAccount().then(async (res: unknown) => {
      const data = res as { has_business_account: boolean; account?: Account }
      setHasBiz(data.has_business_account)
      if (data.has_business_account && data.account) {
        setBusinessAccount(data.account)
        const [a, q] = await Promise.all([
          smeApi.analytics(data.account.id, 3),
          smeApi.getQr(data.account.id),
        ])
        setAnalytics(a as SMEAnalytics)
        setQrData(q as QRData)
      }
      setLoading(false)
    })
  }, [])

  const generateQR = async () => {
    if (!businessAccount || !merchantName) return
    setQrLoading(true); setError('')
    try {
      const res = await smeApi.generateQr(businessAccount.id, merchantName) as { qr_payload: string }
      setQrData({ has_qr: true, qr_payload: res.qr_payload, merchant_name: merchantName, total_received_kz: 0 })
      setSuccess('QR code generated! Display this to receive payments.')
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to generate QR') }
    finally { setQrLoading(false) }
  }

  const updateRow = (i: number, field: string, value: string) =>
    setPayrollRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const disbursePayroll = async () => {
    if (!businessAccount) return
    setPayrollLoading(true); setError('')
    try {
      const payroll = payrollRows
        .filter(r => r.account_number && r.amount)
        .map(r => ({ account_number: r.account_number, amount: parseFloat(r.amount), name: r.name }))
      const res = await smeApi.disbursePayroll(businessAccount.id, payroll)
      setPayrollResult(res as PayrollResult)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Payroll failed') }
    finally { setPayrollLoading(false) }
  }

  const totalPayroll = payrollRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

  const inputRow = 'bg-ink-light border border-border rounded-sm text-text-base px-3 py-2 text-sm focus:border-gold focus:outline-none placeholder:text-muted w-full'

  if (loading) return <div className="h-96 skeleton" />

  if (!hasBiz) return (
    <div>
      <PageHeader title="SME Portal" subtitle="Business banking tools for entrepreneurs." />
      <div className="bg-ink-mid border border-border rounded-DEFAULT">
        <EmptyState icon="⬡" title="No Business Account Found" body="Open a business account to access SME features like merchant QR, payroll, and cashflow analytics." />
        <div className="text-center pb-8">
          <a href="/accounts" className={btnPrimary}>Open Business Account →</a>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="SME Portal"
        subtitle={businessAccount ? `Account: ${businessAccount.account_number}` : ''}
      />

      {error   && <div className="mb-4"><Alert type="error"   message={error}   /></div>}
      {success && <div className="mb-4"><Alert type="success" message={success} /></div>}

      {/* Analytics stat cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <StatCard label="Balance"      value={fmtKz(analytics.current_balance_kz)}              topColor="#F5A623" delay={0}   />
          <StatCard label="Inflows"      value={fmtKz(analytics.total_inflows_kz)}   sub={`${analytics.period_months}mo`} topColor="#2ECC71" delay={40}  />
          <StatCard label="Outflows"     value={fmtKz(analytics.total_outflows_kz)}  sub={`${analytics.period_months}mo`} delay={80}  />
          <StatCard label="Net Cashflow" value={fmtKz(analytics.net_cashflow_kz)}                 topColor={analytics.net_cashflow_kz >= 0 ? '#2ECC71' : '#E74C3C'} delay={120} />
          <StatCard label="QR Received"  value={fmtKz(analytics.merchant_payments_received_kz)}   delay={160} />
          <StatCard label="Payroll Out"  value={fmtKz(analytics.payroll_disbursed_kz)}             delay={200} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Cashflow chart */}
        {analytics && (
          <div className="bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up">
            <h3 className="text-sm font-semibold mb-5">Cashflow Overview ({analytics.period_months} months)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{
                name: 'Period',
                Inflows: analytics.total_inflows_kz,
                Outflows: analytics.total_outflows_kz,
                Net: Math.max(0, analytics.net_cashflow_kz),
              }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252D45" />
                <XAxis dataKey="name" tick={{ fill: '#8892AA', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8892AA', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtKz(v)]} />
                <Bar dataKey="Inflows"  fill="#2ECC71" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outflows" fill="#E74C3C" opacity={0.7} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net"      fill="#F5A623" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#8892AA' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Merchant QR */}
        <div className="bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up delay-60">
          <h3 className="text-sm font-semibold mb-4">Merchant QR Code</h3>
          {qrData?.has_qr ? (
            <div>
              <div className="bg-ink-light rounded-sm p-5 mb-4 text-center">
                <div className="w-28 h-28 mx-auto bg-white rounded-lg flex items-center justify-center text-[#333] p-2 text-center mb-3">
                  <div>
                    <div className="text-2xl mb-1">⬡</div>
                    <div className="text-[10px]">QR Code</div>
                    <div className="text-[9px] text-[#666] mt-0.5 break-all">{qrData.merchant_name}</div>
                  </div>
                </div>
                <div className="text-[13px] text-text-dim">{qrData.merchant_name}</div>
                {qrData.total_received_kz !== undefined && (
                  <div className="text-lg font-bold text-emerald mt-1.5">{fmtKz(qrData.total_received_kz)} received</div>
                )}
              </div>
              <Field label="Update Merchant Name">
                <input className={inputCls} value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder={qrData.merchant_name} />
              </Field>
              <button className={`${btnGhost} w-full mt-3 justify-center`} onClick={generateQR} disabled={qrLoading || !merchantName}>
                {qrLoading ? <><Spinner /> Regenerating…</> : 'Regenerate QR →'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-text-dim mb-4">Generate a QR code to accept merchant payments from customers instantly.</p>
              <Field label="Merchant / Business Name">
                <input className={inputCls} value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="e.g. Loja da Ana" />
              </Field>
              <button className={`${btnPrimary} w-full mt-3 justify-center`} onClick={generateQR} disabled={qrLoading || !merchantName}>
                {qrLoading ? <><Spinner /> Generating…</> : 'Generate QR Code →'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payroll */}
      <div className="bg-ink-mid border border-border rounded-DEFAULT p-6 animate-fade-up delay-120">
        <h3 className="text-base font-semibold mb-1">Salary Disbursement</h3>
        <p className="text-[13px] text-text-dim mb-5">Pay multiple employees in one bulk transaction.</p>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_200px_130px_36px] gap-2.5 mb-2 px-0.5">
          {['Employee Name', 'Account Number', 'Amount (Kz)', ''].map(h => (
            <div key={h} className="text-[11px] uppercase tracking-wider text-soft">{h}</div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          {payrollRows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_200px_130px_36px] gap-2.5 items-center">
              <input className={inputRow} value={row.name}           onChange={e => updateRow(i, 'name', e.target.value)}           placeholder="João Silva" />
              <input className={inputRow} value={row.account_number} onChange={e => updateRow(i, 'account_number', e.target.value)} placeholder="NVBxxxxxxxxxx" />
              <input className={inputRow} type="number" value={row.amount} onChange={e => updateRow(i, 'amount', e.target.value)}   placeholder="50000" />
              <button
                className="text-muted hover:text-soft text-lg leading-none transition-colors px-1"
                onClick={() => setPayrollRows(rows => rows.filter((_, idx) => idx !== i))}
                disabled={payrollRows.length === 1}
              >×</button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button className={`${btnGhost} text-xs px-3.5 py-2`}
            onClick={() => setPayrollRows(r => [...r, { account_number: '', amount: '', name: '' }])}>
            + Add Row
          </button>
          <div className="flex-1 text-[13px] text-text-dim">
            Total: <span className="text-gold font-semibold">{fmtKz(totalPayroll)}</span>
          </div>
          <button className={btnPrimary} onClick={disbursePayroll} disabled={payrollLoading}>
            {payrollLoading ? <><Spinner /> Disbursing…</> : 'Disburse Payroll →'}
          </button>
        </div>

        {/* Payroll results */}
        {payrollResult && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex gap-5 mb-4 flex-wrap text-sm">
              <span>✓ <span className="text-emerald font-semibold">{payrollResult.summary.successful}</span> successful</span>
              {payrollResult.summary.failed > 0 && (
                <span>✕ <span className="text-danger font-semibold">{payrollResult.summary.failed}</span> failed</span>
              )}
              <span>Total: <span className="text-gold font-semibold">{fmtKz(payrollResult.summary.total_disbursed_kz)}</span></span>
            </div>
            <div className="flex flex-col gap-2">
              {payrollResult.results.map((r, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center px-3 py-2 bg-ink-light rounded-sm text-xs border-l-4 ${
                    r.status === 'success' ? 'border-l-emerald' : 'border-l-danger'
                  }`}
                >
                  <div>
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-text-dim ml-2">{r.account_number}</span>
                  </div>
                  <div className={r.status === 'success' ? 'text-emerald' : 'text-danger'}>
                    {r.status === 'success' ? `✓ ${r.reference}` : `✕ ${r.reason}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
