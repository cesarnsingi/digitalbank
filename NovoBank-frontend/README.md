# NovaBank Angola — Frontend

**React 18 · TypeScript · Vite · Recharts · Zustand**

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router v6 |
| State | Zustand |
| Charts | Recharts |
| Fonts | Syne (display) + DM Sans (body) |
| Design | Custom CSS design system (no Tailwind) |

---

## Project Structure

```
src/
├── api/
│   └── client.ts          # All API calls — auth, accounts, transactions, admin, SME
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # Navigation sidebar (role-aware)
│   │   └── AppLayout.tsx   # Page shell with sidebar
│   └── ui/
│       └── index.tsx       # StatCard, Alert, Modal, Badge, Pagination, formatters
├── pages/
│   ├── Login.tsx           # Login + Register
│   ├── Dashboard.tsx       # Customer home — balance hero, recent txns, KYC banner
│   ├── Accounts.tsx        # Account list, savings pocket management
│   ├── Transactions.tsx    # Full history with filters + pagination
│   ├── Transfer.tsx        # P2P transfer + bill payment (both in one file)
│   ├── Savings.tsx         # Savings pockets overview with progress bars
│   ├── Profile.tsx         # Profile edit, KYC document upload, password change
│   ├── SME.tsx             # Business analytics, merchant QR, payroll disbursement
│   ├── Admin.tsx           # Admin dashboard, user mgmt, KYC queue, AML queue
│   └── AdminReports.tsx    # Charts: daily volume, revenue, growth, type breakdown
├── store/
│   └── auth.ts             # Zustand auth store (user + token)
├── types/
│   └── index.ts            # Full TypeScript interfaces matching backend schemas
├── App.tsx                 # Router + AuthGuard + AdminGuard
├── main.tsx                # React entry point
└── index.css               # Full design system (CSS variables, utilities, components)
```

---

## Quick Start

```bash
cd novabank-frontend
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:8000` so no CORS issues.  
Make sure the backend is running first.

---

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Login / Register | Public |
| `/dashboard` | Customer Dashboard | All users |
| `/accounts` | Accounts + Savings Pockets | All users |
| `/transactions` | Transaction History | All users |
| `/transfer` | P2P Transfer | All users |
| `/bills` | Bill Payments | All users |
| `/savings` | Savings Pockets Overview | All users |
| `/profile` | Profile & KYC | All users |
| `/sme` | SME Portal | All users |
| `/admin` | Admin Dashboard | admin / ops |
| `/admin/users` | User Management | admin / ops |
| `/admin/kyc` | KYC Review Queue | admin / ops |
| `/admin/aml` | AML Review Queue | admin / ops |
| `/admin/reports` | Analytics & Reports | admin / ops |

---

## Design System

The app uses a custom CSS-variable design system (`index.css`) with:

- **Palette:** Deep ink navy + electric amber gold
- **Fonts:** Syne (display/headings) + DM Sans (body)
- **Components:** `.card`, `.btn`, `.badge`, `.field`, `.skeleton`, `.spinner`
- **Animations:** `fadeUp`, `fadeIn`, `shimmer` (skeleton loaders)

Key CSS variables:
```css
--ink        /* #0A0E1A – base background */
--gold       /* #F5A623 – primary accent */
--green      /* #2ECC71 – success/credits */
--red        /* #E74C3C – errors/debits */
--blue       /* #3498DB – info */
```

---

## Auth Flow

1. User logs in → JWT stored in `localStorage`
2. `useAuthStore` (Zustand) holds `user` + `token`
3. `AuthGuard` in `App.tsx` hydrates user from `/api/v1/me/` on refresh
4. API client auto-injects `Authorization: Bearer <token>` on every request
5. On 401 → tokens cleared → redirect to `/login`

---

## Role-based Navigation

- `customer` / `sme_owner` → standard banking nav
- `admin` / `ops` → admin nav (dashboard, users, KYC, AML, reports)
- `AdminGuard` component blocks non-admin access to `/admin/*`

---

## Production Build

```bash
npm run build
# Output: dist/
# Deploy to: Nginx, Vercel, Netlify, AWS S3+CloudFront
```

Nginx config (serving from `/`):
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
location /api {
  proxy_pass http://localhost:8000;
}
```
