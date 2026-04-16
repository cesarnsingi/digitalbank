"""
seed.py — Populate NovaBank dev database with realistic Angolan demo data.
Run: python seed.py
"""
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, engine
from app.models import *  # noqa
from app.db.session import Base
from app.core.security import get_password_hash
from app.services.transaction_service import generate_reference

Base.metadata.create_all(bind=engine)

ANGOLAN_NAMES = [
    "Cesário Nsingi", "Ana Paula Ferreira", "João Baptista", "Maria da Graça",
    "António Manuel", "Filipa Sousa", "Domingos Lopes", "Rosa Neto",
    "Carlos Esperança", "Lurdes Cabinda", "Miguel Tiago", "Sandra Menezes",
]

BILLERS = [
    ("ENDE001", "ENDE Electricidade"),
    ("EPAL001", "EPAL Água"),
    ("UNITEL01", "Unitel Mobile"),
    ("AFRICELL", "Africell"),
    ("DHL001", "DHL Angola"),
]


def random_phone():
    return f"+2449{random.randint(10000000, 99999999)}"


def random_account_number():
    return "NVB" + "".join([str(random.randint(0, 9)) for _ in range(10)])


def seed():
    db: Session = SessionLocal()
    try:
        print("🌱 Seeding NovaBank Angola database...")

        # ── Admin user ────────────────────────────────────────────────────────
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@novabank.ao",
            phone="+244923000001",
            full_name="NovaBank Admin",
            hashed_password=get_password_hash("Admin@1234"),
            role=UserRole.admin,
            kyc_status=KYCStatus.verified,
            is_verified=True,
        )
        db.add(admin)
        print("  ✓ Admin user: admin@novabank.ao / Admin@1234")

        # ── Demo customer ─────────────────────────────────────────────────────
        demo_user = User(
            id=str(uuid.uuid4()),
            email="cesar@novabank.ao",
            phone="+244923000002",
            full_name="Cesar Nsingi",
            hashed_password=get_password_hash("Demo@1234"),
            role=UserRole.customer,
            kyc_status=KYCStatus.verified,
            is_verified=True,
            address="Rua da Missão 45, Luanda",
            date_of_birth="1990-05-14",
        )
        db.add(demo_user)

        demo_account = Account(
            id=str(uuid.uuid4()),
            account_number=random_account_number(),
            user_id=demo_user.id,
            account_type=AccountType.current,
            status=AccountStatus.active,
            balance=500_000.0,
            is_primary=True,
        )
        db.add(demo_account)
        print("  ✓ Demo customer: cesar@novabank.ao / Demo@1234")

        # ── SME user ──────────────────────────────────────────────────────────
        sme_user = User(
            id=str(uuid.uuid4()),
            email="sme@novabank.ao",
            phone="+244923000003",
            full_name="Ana Paula Ferreira",
            hashed_password=get_password_hash("SME@1234"),
            role=UserRole.sme_owner,
            kyc_status=KYCStatus.verified,
            is_verified=True,
        )
        db.add(sme_user)

        sme_account = Account(
            id=str(uuid.uuid4()),
            account_number=random_account_number(),
            user_id=sme_user.id,
            account_type=AccountType.business,
            status=AccountStatus.active,
            balance=2_500_000.0,
            is_primary=True,
            nickname="Loja Principal",
        )
        db.add(sme_account)
        print("  ✓ SME user: sme@novabank.ao / SME@1234")

        db.flush()

        # ── Additional customers ───────────────────────────────────────────────
        other_accounts = []
        for name in ANGOLAN_NAMES[:8]:
            uid = str(uuid.uuid4())
            u = User(
                id=uid,
                email=f"{name.split()[0].lower()}.{uid[:4]}@mail.ao",
                phone=random_phone(),
                full_name=name,
                hashed_password=get_password_hash("Pass@1234"),
                role=UserRole.customer,
                kyc_status=random.choice([KYCStatus.verified, KYCStatus.pending, KYCStatus.submitted]),
                is_verified=True,
            )
            db.add(u)
            db.flush()

            acc = Account(
                id=str(uuid.uuid4()),
                account_number=random_account_number(),
                user_id=uid,
                account_type=AccountType.current,
                status=AccountStatus.active,
                balance=random.uniform(10_000, 800_000),
                is_primary=True,
            )
            db.add(acc)
            other_accounts.append(acc)

        db.flush()

        # ── Transactions ──────────────────────────────────────────────────────
        print("  ✓ Generating transactions...")
        txn_count = 0
        for i in range(60):
            days_ago = random.randint(0, 90)
            created = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))
            amount = random.choice([
                random.uniform(5_000, 50_000),
                random.uniform(50_000, 300_000),
                random.uniform(300_000, 1_200_000),
            ])
            aml_flag = amount >= 1_000_000

            sender = random.choice([demo_account, sme_account] + other_accounts[:4])
            receiver = random.choice(other_accounts)
            if receiver.id == sender.id:
                receiver = demo_account

            txn = Transaction(
                id=str(uuid.uuid4()),
                reference=generate_reference(),
                sender_account_id=sender.id,
                receiver_account_id=receiver.id,
                transaction_type=random.choice([
                    TransactionType.transfer,
                    TransactionType.bill_payment,
                    TransactionType.merchant_payment,
                ]),
                status=TransactionStatus.flagged if aml_flag else TransactionStatus.completed,
                amount=amount,
                fee=random.choice([50, 150, 350]),
                aml_flagged=aml_flag,
                aml_reason="Above AML threshold" if aml_flag else None,
                channel=random.choice(["mobile", "web", "ussd"]),
                created_at=created,
                completed_at=created if not aml_flag else None,
            )
            db.add(txn)
            txn_count += 1

        # ── Bill payments ─────────────────────────────────────────────────────
        for _ in range(20):
            biller_code, biller_name = random.choice(BILLERS)
            days_ago = random.randint(0, 60)
            created = datetime.utcnow() - timedelta(days=days_ago)
            txn = Transaction(
                id=str(uuid.uuid4()),
                reference=generate_reference(),
                sender_account_id=demo_account.id,
                transaction_type=TransactionType.bill_payment,
                status=TransactionStatus.completed,
                amount=random.uniform(3_000, 30_000),
                fee=100.0,
                external_payee_name=biller_name,
                external_payee_ref=f"REF{random.randint(100000, 999999)}",
                description=f"Bill payment to {biller_name}",
                channel="mobile",
                created_at=created,
                completed_at=created,
            )
            db.add(txn)

        # ── Savings pockets ────────────────────────────────────────────────────
        pockets = [
            ("Viagem Família", 300_000, 120_000, "2024-12-31"),
            ("Novo Portátil", 150_000, 80_000, "2024-09-01"),
            ("Fundo Emergência", 500_000, 50_000, None),
        ]
        for name, target, current, tdate in pockets:
            db.add(SavingsPocket(
                id=str(uuid.uuid4()),
                account_id=demo_account.id,
                name=name,
                target_amount=target,
                current_amount=current,
                target_date=tdate,
            ))

        # ── Notifications ──────────────────────────────────────────────────────
        db.add(Notification(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            title="Bem-vindo ao NovaBank!",
            body="A sua conta foi criada com sucesso. Complete o KYC para desbloquear todas as funcionalidades.",
            category="system",
        ))
        db.add(Notification(
            id=str(uuid.uuid4()),
            user_id=demo_user.id,
            title="KYC Verificado ✓",
            body="A sua identidade foi verificada. A sua conta está agora totalmente activa.",
            category="system",
        ))

        db.commit()
        print(f"  ✓ {txn_count + 20} transactions seeded")
        print(f"  ✓ 3 savings pockets seeded")
        print("\n✅ Seed complete!")
        print("\nLogin credentials:")
        print("  Admin : admin@novabank.ao   / Admin@1234")
        print("  Customer: cesar@novabank.ao / Demo@1234")
        print("  SME   : sme@novabank.ao     / SME@1234")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
