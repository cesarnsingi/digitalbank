import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { profile as profileApi } from './api/client'
import { useAuthStore } from './store/auth'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import AccountsPage from './pages/Accounts'
import TransactionsPage from './pages/Transactions'
import { TransferPage, BillsPage } from './pages/Transfer'
import ProfilePage from './pages/Profile'
import SavingsPage from './pages/Savings'
import SMEPortal from './pages/SME'
import AdminDashboard, { AdminUsers, AdminKYC, AdminAML } from './pages/Admin'
import AdminReports from './pages/AdminReports'
import type { User } from './types'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, setAuth } = useAuthStore()
  const [loading, setLoading] = useState(!user && !!token)

  useEffect(() => {
    if (token && !user) {
      profileApi.get()
        .then(u => setAuth(u as User, token, localStorage.getItem('refresh_token') || ''))
        .catch(() => { localStorage.removeItem('access_token') })
        .finally(() => setLoading(false))
    }
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>
          Nova<span style={{ color: 'var(--gold)' }}>Bank</span>
        </div>
        <div className="spinner" style={{ width: 24, height: 24, borderColor: 'rgba(245,166,35,0.3)', borderTopColor: 'var(--gold)' }} />
      </div>
    </div>
  )

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user || !['admin', 'ops'].includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <AuthGuard>
            <AppLayout user={user!} />
          </AuthGuard>
        }>
          {/* Customer routes */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="transfer" element={<TransferPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="savings" element={<SavingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="sme" element={<SMEPortal />} />

          {/* Admin routes */}
          <Route path="admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
          <Route path="admin/kyc" element={<AdminGuard><AdminKYC /></AdminGuard>} />
          <Route path="admin/aml" element={<AdminGuard><AdminAML /></AdminGuard>} />
          <Route path="admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
