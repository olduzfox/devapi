import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import time
import secrets
import string
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, Form, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import engine, Base, get_db
from models import TGSession, Card, Payment
from telegram_manager import telegram_manager

# Create database tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load active telegram sessions
    print("[Server Startup] Restoring Telegram sessions...")
    try:
        await telegram_manager.load_active_sessions()
    except Exception as e:
        print(f"[Startup Warning] Could not initialize Telegram sessions: {e}")
    yield
    # Shutdown
    print("[Server Shutdown]")


app = FastAPI(title="Telegram Provider Payment API", lifespan=lifespan)

# Allow CORS for ReactJS frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------
# Pydantic Schemas
# --------------------------------------------------------
class SendCodeReq(BaseModel):
    phone: str
    force_sms: Optional[bool] = False
    api_id: Optional[int] = 24511179
    api_hash: Optional[str] = "ac098d8c9f90857f2c443302d86a7288"


class LoginReq(BaseModel):
    phone: str
    code: str
    phone_code_hash: str
    password: Optional[str] = None


class ImportSessionReq(BaseModel):
    phone: str
    session_string: str


class CardReq(BaseModel):
    name: str
    card_number: str


class SimulateMsgReq(BaseModel):
    text: str


# --------------------------------------------------------
# Payment Creation (/create)
# --------------------------------------------------------
@app.post("/create")
@app.post("/api/create")
@app.post("/api/payments/create")
async def create_payment(
    amount: Optional[int] = Form(None),
    body_amount: Optional[int] = Body(None, embed=True),
    db: Session = Depends(get_db),
):
    amt = amount or body_amount
    if not amt or amt <= 0:
        raise HTTPException(status_code=400, detail="Miqdor (amount) to'g'ri kiritilishi kerak")

    current_time = time.time()

    # 10 daqiqadan eski "pending" to'lovlarni tozalaymiz (cancel holatiga o'tkazamiz)
    pending_payments = db.query(Payment).filter(Payment.status == "pending").all()
    for p in pending_payments:
        if current_time - p.created_at > 600:
            p.status = "cancel"
    db.commit()

    # Random 15 ta belgidan iborat payment_id generator
    alphabet = string.ascii_letters + string.digits
    payment_id = "".join(secrets.choice(alphabet) for _ in range(15))

    # Active kartalarni bazadan olamiz
    active_cards = db.query(Card).filter(Card.is_active == True).all()

    # Agar kartalar ro'yxati bo'sh bo'lsa, default rejimda ishlaydi (karta tekshirilmaydi)
    if not active_cards:
        new_payment = Payment(
            payment_id=payment_id,
            amount=amt,
            card_number=None,
            card_name=None,
            status="pending",
            created_at=current_time,
            served=False,
        )
        db.add(new_payment)
        db.commit()
        return {
            "status": "ok",
            "payment_id": payment_id,
            "amount": amt,
            "card": None,
            "message": "Payment created",
        }

    # Kartalar mavjud bo'lsa, bir xil miqdordagi kutilayotgan to'lovlarni tekshiramiz
    assigned_card = None
    for card in active_cards:
        card_num = card.card_number

        already_waiting = db.query(Payment).filter(
            Payment.amount == amt,
            Payment.card_number == card_num,
            Payment.status == "pending"
        ).first()

        if not already_waiting:
            assigned_card = card
            break

    # Agar barcha kartalarda aynan shu summa bo'yicha to'lov allaqachon kutilayotgan bo'lsa
    if not assigned_card:
        raise HTTPException(
            status_code=400,
            detail="Barcha kartalarda ushbu miqdor bo'yicha to'lov kutilmoqda. Iltimos, boshqa miqdor kiriting.",
        )

    new_payment = Payment(
        payment_id=payment_id,
        amount=amt,
        card_number=assigned_card.card_number,
        card_name=assigned_card.name,
        status="pending",
        created_at=current_time,
        served=False,
    )
    db.add(new_payment)
    db.commit()

    return {
        "status": "ok",
        "payment_id": payment_id,
        "amount": amt,
        "card": {
            "name": assigned_card.name,
            "number": assigned_card.card_number,
        },
        "message": "Payment created",
    }


# --------------------------------------------------------
# Holatni tekshirish (/status/{payment_id})
# --------------------------------------------------------
@app.get("/status/{payment_id}")
@app.get("/api/status/{payment_id}")
@app.get("/api/payments/status/{payment_id}")
async def get_payment_status(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.payment_id == payment_id).first()

    if not payment:
        return {
            "ok": "false",
            "data": {
                "status": "error",
                "message": "Payment not found",
            },
        }

    current_time = time.time()
    # 10 daqiqa limit
    if current_time - payment.created_at > 600 and payment.status == "pending":
        payment.status = "cancel"
        db.commit()

    response = {
        "ok": "true",
        "data": {
            "payment_id": payment.payment_id,
            "amount": payment.amount,
            "card_number": payment.card_number,
            "payment_status": payment.status,
        },
    }

    # 🔥 Ikkinchi marta so'ralganda xotiradan/bazadan o'chirish
    if payment.status in ["paid", "cancel"]:
        if not payment.served:
            payment.served = True
            db.commit()
        else:
            db.delete(payment)
            db.commit()

    return response


# --------------------------------------------------------
# Payments list for Dashboard
# --------------------------------------------------------
@app.get("/api/payments")
async def list_payments(db: Session = Depends(get_db)):
    payments = db.query(Payment).order_by(Payment.id.desc()).all()
    return payments


# --------------------------------------------------------
# Sessions Management Endpoints
# --------------------------------------------------------
from telethon.errors import SessionPasswordNeededError

@app.post("/sessions/send-code")
@app.post("/api/sessions/send-code")
async def send_code_endpoint(req: SendCodeReq, db: Session = Depends(get_db)):
    try:
        clean_p = telegram_manager.clean_phone(req.phone)
        code_hash = await telegram_manager.send_code(clean_p, api_id=req.api_id, api_hash=req.api_hash, force_sms=bool(req.force_sms))

        sess = db.query(TGSession).filter(TGSession.phone == clean_p).first()
        if not sess:
            sess = TGSession(
                phone=clean_p,
                api_id=req.api_id or 24511179,
                api_hash=req.api_hash or "ac098d8c9f90857f2c443302d86a7288",
                status="pending_code",
                phone_code_hash=code_hash,
            )
            db.add(sess)
        else:
            sess.api_id = req.api_id or sess.api_id or 24511179
            sess.api_hash = req.api_hash or sess.api_hash or "ac098d8c9f90857f2c443302d86a7288"
            sess.status = "pending_code"
            sess.phone_code_hash = code_hash

        db.commit()
        msg = "Telegram ilovangizga (SMS) kod yuborildi!" if req.force_sms else "Telegram ilovangizga (App/SMS) kod yuborildi!"
        return {"status": "ok", "message": msg, "phone_code_hash": code_hash, "phone": clean_p}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sessions/import-string")
@app.post("/api/sessions/import-string")
async def import_session_endpoint(req: ImportSessionReq, db: Session = Depends(get_db)):
    try:
        clean_p = telegram_manager.clean_phone(req.phone)
        await telegram_manager.import_string_session(clean_p, req.session_string)

        sess = db.query(TGSession).filter(TGSession.phone == clean_p).first()
        if not sess:
            sess = TGSession(
                phone=clean_p,
                api_id=24511179,
                api_hash="ac098d8c9f90857f2c443302d86a7288",
                session_string=req.session_string.strip(),
                status="active",
            )
            db.add(sess)
        else:
            sess.session_string = req.session_string.strip()
            sess.status = "active"

        db.commit()
        return {"status": "ok", "message": "StringSession orqali sessiya muvaffaqiyatli faollashtirildi!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sessions/login")
@app.post("/api/sessions/login")
async def login_endpoint(req: LoginReq, db: Session = Depends(get_db)):
    try:
        clean_p = telegram_manager.clean_phone(req.phone)
        session_str = await telegram_manager.sign_in(
            phone=clean_p,
            code=req.code,
            phone_code_hash=req.phone_code_hash,
            password=req.password,
        )

        sess = db.query(TGSession).filter(TGSession.phone == clean_p).first()
        if sess:
            sess.session_string = session_str
            sess.status = "active"
            db.commit()

        return {"status": "ok", "message": "Telegram sessiyasi muvaffaqiyatli ulandi!"}
    except SessionPasswordNeededError:
        return {"status": "2fa_required", "message": "Hisobingizda 2-bosqichli xavfsizlik (2FA) yoqilgan. Iltimos 2FA parolingizni kiriting."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/sessions")
@app.get("/api/sessions")
async def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(TGSession).all()
    return [
        {
            "id": s.id,
            "phone": s.phone,
            "api_id": s.api_id,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@app.delete("/sessions/{session_id}")
@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(TGSession).filter(TGSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    await telegram_manager.disconnect_session(sess.phone)
    db.delete(sess)
    db.commit()
    return {"status": "ok", "message": "Session deleted"}


# --------------------------------------------------------
# Cards Management Endpoints
# --------------------------------------------------------
@app.get("/cards")
@app.get("/api/cards")
async def list_cards(db: Session = Depends(get_db)):
    cards = db.query(Card).filter(Card.is_active == True).all()
    return cards


@app.post("/cards")
@app.post("/api/cards")
async def add_card(card: CardReq, db: Session = Depends(get_db)):
    clean_num = card.card_number.strip()
    if len(clean_num) > 4:
        clean_num = clean_num[-4:]

    new_card = Card(name=card.name.strip().upper(), card_number=clean_num)
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return {"status": "ok", "card": new_card}


@app.delete("/cards/{card_id}")
@app.delete("/api/cards/{card_id}")
async def delete_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()
    return {"status": "ok", "message": "Card deleted"}


# --------------------------------------------------------
# Simulation Endpoint (For Testing without live Telegram bot)
# --------------------------------------------------------
@app.post("/api/simulate-telegram-message")
async def simulate_message(req: SimulateMsgReq):
    matched = await telegram_manager.process_telegram_message(req.text)
    return {"status": "ok", "matched": matched}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
