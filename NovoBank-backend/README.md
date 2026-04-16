# NovaBank Angola – Backend API

**Python · FastAPI · PostgreSQL · SQLAlchemy**

A production-grade banking API for NovaBank Angola, a digital-only, BNA-compliant bank targeting individuals and SMEs in Luanda and beyond.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL (SQLite for tests) |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Migrations | Alembic |
| Validation | Pydantic v2 |

---

## Project Structure

```
novabank/
├── app/
│   ├── main.py                  # FastAPI app, CORS, middleware
│   ├── core/
│   │   ├── config.py            # Settings (env vars, BNA limits)
│   │   └── security.py          # JWT, password hashing, auth deps
│   ├── db/
│   │   └── session.py           # SQLAlchemy engine + session
│   ├── models/
│   │   ├── user.py              # User, UserRole, KYCStatus
│   │   ├── account.py           # Account, SavingsPocket
│   │   ├── transaction.py       # Transaction (with AML fields)
│   │   └── kyc.py               # KYCDocument, Notification, MerchantQR
│   ├── schemas/
│   │   ├── user.py              # Auth + profile schemas
│   │   ├── account.py           # Account + pockets schemas
│   │   ├── transaction.py       # Transfer + payment schemas
│   │   └── admin.py             # Admin + reporting schemas
│   ├── services/
│   │   └── transaction_service.py  # Core banking logic, fee engine, AML
│   └── api/v1/endpoints/
│       ├── auth.py              # Register, login, refresh
│       ├── users.py             # Profile, KYC docs, notifications
│       ├── accounts.py          # Accounts, savings pockets
│       ├── transactions.py      # Transfers, bill payments, history
│       ├── admin.py             # User mgmt, KYC review, AML queue
│       ├── reporting.py         # Daily volume, revenue, growth stats
│       └── sme.py               # Merchant QR, payroll, analytics
├── migrations/
│   └── 0001_initial.py          # Alembic migration
├── tests/
│   └── test_api.py              # Pytest test suite
├── seed.py                      # Dev data seeder
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Clone & install

```bash
cd novabank
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and secret key
```

### 3. Start PostgreSQL

```bash
# Docker (recommended)
docker run -d \
  --name novabank-db \
  -e POSTGRES_USER=novabank \
  -e POSTGRES_PASSWORD=novabank \
  -e POSTGRES_DB=novabank_db \
  -p 5432:5432 \
  postgres:15
```

### 4. Run migrations & seed

```bash
# Auto-create tables (handled by SQLAlchemy on startup)
# OR use Alembic:
alembic upgrade head

# Seed demo data
python seed.py
```

### 5. Start the API

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  
ReDoc: http://localhost:8000/redoc

---

## API Modules

### Authentication  `/api/v1/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register new customer |
| POST | `/login` | Login, get JWT tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Logout (client-side) |

### Profile  `/api/v1/me`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Get own profile |
| PATCH | `/` | Update profile |
| POST | `/change-password` | Change password |
| POST | `/kyc/documents` | Upload KYC document |
| GET | `/kyc/status` | KYC status + documents |
| GET | `/notifications` | Get notifications |
| POST | `/notifications/{id}/read` | Mark as read |

### Accounts  `/api/v1/accounts`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List accounts + total balance |
| POST | `/` | Open new account (KYC required) |
| GET | `/{id}` | Account details |
| GET | `/{id}/balance` | Live balance |
| GET | `/{id}/pockets` | Savings pockets |
| POST | `/{id}/pockets` | Create savings pocket |
| POST | `/{id}/pockets/{pid}/topup` | Top up pocket |

### Transactions  `/api/v1/transactions`
| Method | Path | Description |
|---|---|---|
| POST | `/transfer` | P2P transfer (KYC required) |
| POST | `/bill-payment` | Pay bill (ENDE, EPAL, etc.) |
| GET | `/` | Transaction history (filterable) |
| GET | `/{id}` | Transaction detail |

### Admin  `/api/v1/admin`
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Platform metrics |
| GET | `/users` | User list (searchable) |
| GET | `/users/{id}` | User detail |
| POST | `/users/{id}/toggle-active` | Suspend/activate user |
| POST | `/kyc/{id}/review` | Approve/reject KYC |
| POST | `/accounts/freeze` | Freeze account |
| POST | `/accounts/{id}/unfreeze` | Unfreeze account |
| GET | `/aml/flagged` | AML queue |
| POST | `/aml/review` | Clear/reverse/escalate AML flag |

### Reporting  `/api/v1/reports`
| Method | Path | Description |
|---|---|---|
| GET | `/daily-volume` | Daily transaction volume + fees |
| GET | `/monthly-revenue` | Monthly revenue breakdown |
| GET | `/user-growth` | Registration + KYC trends |
| GET | `/transaction-type-breakdown` | Volume by type |
| GET | `/my/statement` | Customer account statement |
| GET | `/my/cashflow` | Monthly cashflow (SME-ready) |

### SME Portal  `/api/v1/sme`
| Method | Path | Description |
|---|---|---|
| GET | `/business-account` | Business account info |
| POST | `/merchant-qr/generate` | Generate merchant QR |
| GET | `/merchant-qr/{account_id}` | Get active QR |
| POST | `/payroll/disburse` | Bulk salary disbursement |
| GET | `/analytics/{account_id}` | SME cashflow analytics |

---

## Fee Schedule (Kwanza)

| Transaction | Fee |
|---|---|
| Transfer ≤ 10,000 Kz | 50 Kz |
| Transfer 10k–100k Kz | 150 Kz |
| Transfer > 100,000 Kz | 350 Kz |
| Bill payment | 100 Kz |
| Merchant payment | Free (customer) |

## BNA Compliance Limits

| Limit | Value |
|---|---|
| Single transfer max | 2,000,000 Kz |
| Daily transfer limit | 5,000,000 Kz |
| AML flag threshold | 1,000,000 Kz |

---

## Running Tests

```bash
pytest tests/ -v
```

---

## TypeScript Frontend Integration

The API is fully CORS-configured for React/TypeScript at `localhost:3000` and `localhost:5173` (Vite).

Example fetch:
```typescript
const res = await fetch("http://localhost:8000/api/v1/accounts/", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const data = await res.json(); // { total_balance, accounts[], ... }
```

---

## Production Checklist

- [ ] Rotate `SECRET_KEY` in `.env`
- [ ] Enable HTTPS / SSL termination
- [ ] Switch from `create_all()` to Alembic migrations
- [ ] Wire file uploads to S3 / cloud storage
- [ ] Add token blocklist (Redis) for logout
- [ ] Configure BNA reporting integration
- [ ] Enable structured logging + Sentry
- [ ] Set up rate limiting (slowapi)
- [ ] Add database connection pooling (PgBouncer)
