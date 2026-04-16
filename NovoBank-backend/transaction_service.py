import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.account import Account, AccountStatus
from app.models.transaction import Transaction, TransactionType, TransactionStatus
from app.models.kyc import Notification
from app.core.config import settings


def generate_reference() -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    uid = str(uuid.uuid4()).replace("-", "")[:8].upper()
    return f"NVB-{ts}-{uid}"


def check_daily_limit(account: Account, amount: float) -> None:
    today = str(date.today())
    if account.daily_reset_date != today:
        account.daily_transfer_used = 0.0
        account.daily_reset_date = today
    if account.daily_transfer_used + amount > settings.MAX_DAILY_TRANSFER_LIMIT_KZ:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Daily transfer limit of {settings.MAX_DAILY_TRANSFER_LIMIT_KZ:,.0f} Kz exceeded",
        )


def compute_fee(amount: float, transaction_type: TransactionType) -> float:
    """NovaBank fee schedule (Kwanza):"""
    if transaction_type == TransactionType.transfer:
        if amount <= 10_000:
            return 50.0
        elif amount <= 100_000:
            return 150.0
        else:
            return 350.0
    elif transaction_type == TransactionType.bill_payment:
        return 100.0
    elif transaction_type == TransactionType.merchant_payment:
        return 0.0    # Free for customers; merchant pays interchange
    return 0.0


def check_aml(amount: float) -> tuple[bool, Optional[str]]:
    if amount >= settings.AML_FLAG_THRESHOLD_KZ:
        return True, f"Transaction above AML threshold of {settings.AML_FLAG_THRESHOLD_KZ:,.0f} Kz"
    return False, None


def process_transfer(
    db: Session,
    sender_account: Account,
    receiver_account: Account,
    amount: float,
    description: Optional[str],
    narration: Optional[str],
    ip_address: Optional[str] = None,
    device_id: Optional[str] = None,
    channel: str = "mobile",
) -> Transaction:
    # Guard checks
    if sender_account.status != AccountStatus.active:
        raise HTTPException(status_code=400, detail="Sender account is not active")
    if receiver_account.status != AccountStatus.active:
        raise HTTPException(status_code=400, detail="Receiver account is not active")
    if sender_account.id == receiver_account.id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
    if amount > settings.MAX_SINGLE_TRANSFER_KZ:
        raise HTTPException(
            status_code=422,
            detail=f"Single transfer limit is {settings.MAX_SINGLE_TRANSFER_KZ:,.0f} Kz",
        )

    check_daily_limit(sender_account, amount)
    fee = compute_fee(amount, TransactionType.transfer)
    total_debit = amount + fee

    if sender_account.balance < total_debit:
        raise HTTPException(status_code=422, detail="Insufficient funds")

    aml_flagged, aml_reason = check_aml(amount)
    tx_status = TransactionStatus.flagged if aml_flagged else TransactionStatus.completed

    # Debit sender, credit receiver
    sender_account.balance -= total_debit
    sender_account.daily_transfer_used += amount
    if not aml_flagged:
        receiver_account.balance += amount

    txn = Transaction(
        reference=generate_reference(),
        sender_account_id=sender_account.id,
        receiver_account_id=receiver_account.id,
        transaction_type=TransactionType.transfer,
        status=tx_status,
        amount=amount,
        fee=fee,
        description=description,
        narration=narration,
        aml_flagged=aml_flagged,
        aml_reason=aml_reason,
        ip_address=ip_address,
        device_id=device_id,
        channel=channel,
        completed_at=datetime.utcnow() if not aml_flagged else None,
    )
    db.add(txn)

    # Notify sender
    notif = Notification(
        user_id=sender_account.user_id,
        title="Transfer Sent",
        body=f"You sent {amount:,.2f} Kz to account {receiver_account.account_number}. Ref: {txn.reference}",
        category="transaction",
    )
    db.add(notif)

    db.commit()
    db.refresh(txn)
    return txn


def process_bill_payment(
    db: Session,
    sender_account: Account,
    biller_code: str,
    biller_name: str,
    reference: str,
    amount: float,
    channel: str = "mobile",
) -> Transaction:
    if sender_account.status != AccountStatus.active:
        raise HTTPException(status_code=400, detail="Account is not active")

    fee = compute_fee(amount, TransactionType.bill_payment)
    total_debit = amount + fee

    if sender_account.balance < total_debit:
        raise HTTPException(status_code=422, detail="Insufficient funds")

    sender_account.balance -= total_debit

    txn = Transaction(
        reference=generate_reference(),
        sender_account_id=sender_account.id,
        transaction_type=TransactionType.bill_payment,
        status=TransactionStatus.completed,
        amount=amount,
        fee=fee,
        external_payee_name=biller_name,
        external_payee_ref=reference,
        description=f"Bill payment to {biller_name} - Ref: {reference}",
        channel=channel,
        completed_at=datetime.utcnow(),
    )
    db.add(txn)

    notif = Notification(
        user_id=sender_account.user_id,
        title="Bill Payment Successful",
        body=f"Payment of {amount:,.2f} Kz to {biller_name} was successful. Ref: {txn.reference}",
        category="transaction",
    )
    db.add(notif)

    db.commit()
    db.refresh(txn)
    return txn
