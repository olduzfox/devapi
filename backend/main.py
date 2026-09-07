import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import time
import secrets
import string
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, Form, HTTPException, Depends, Body, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import engine, Base, get_db, auto_migrate_db
from models import User, Store, TGSession, Card, Payment
from auth_utils import hash_password, verify_password, create_access_token, decode_access_token, generate_api_key
from telegram_manager import telegram_manager

# Create database tables & run column migrations
auto_migrate_db()


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


app = FastAPI(title="Telegram Provider Payment API & SaaS Platform", lifespan=lifespan)

# Allow CORS for ReactJS frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------
# Auth & Store Dependencies
# --------------------------------------------------------
def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Avtorizatsiya talab etiladi (Token mavjud emas)")
    
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Token yaroqsiz yoki muddati o'tgan")
    
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    return user


def get_optional_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    try:
        token = authorization.replace("Bearer ", "").strip()
        payload = decode_access_token(token)
        if payload and "user_id" in payload:
            return db.query(User).filter(User.id == payload["user_id"]).first()
    except Exception:
        pass
    return None


# --------------------------------------------------------
# Pydantic Schemas
# --------------------------------------------------------
class RegisterReq(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = ""


class AuthLoginReq(BaseModel):
    email: str
    password: str


class CreateStoreReq(BaseModel):
    name: str


class SendCodeReq(BaseModel):
    phone: str
    force_sms: Optional[bool] = False
    api_id: Optional[int] = 24511179
    api_hash: Optional[str] = "ac098d8c9f90857f2c443302d86a7288"
    store_id: Optional[int] = None


class LoginReq(BaseModel):
    phone: str
    code: str
    phone_code_hash: str
    password: Optional[str] = None
    store_id: Optional[int] = None


class ImportSessionReq(BaseModel):
    phone: str
    session_string: str
    store_id: Optional[int] = None


class QRCheckReq(BaseModel):
    token_id: str
    password: Optional[str] = None
    store_id: Optional[int] = None


class CardReq(BaseModel):
    name: str
    card_number: str
    store_id: Optional[int] = None


class SimulateMsgReq(BaseModel):
    text: str


# --------------------------------------------------------
# Auth Endpoints
# --------------------------------------------------------
@app.post("/api/auth/register")
async def register(req: RegisterReq, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="To'g'ri email manzilini kiriting")
    
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Parol kamida 4 ta belgidan iborat bo'lishi kerak")

    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan")

    user = User(
        email=email_clean,
        password_hash=hash_password(req.password),
        full_name=req.full_name.strip() if req.full_name else email_clean.split("@")[0].capitalize()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Avtomatik ravishda birinchi do'kon yaratamiz
    default_store = Store(
        user_id=user.id,
        name="Asosiy Do'kon",
        api_key=generate_api_key(),
        is_active=True
    )
    db.add(default_store)
    db.commit()
    db.refresh(default_store)

    token = create_access_token({"user_id": user.id, "email": user.email})
    return {
        "status": "ok",
        "token": token,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
        "stores": [{"id": default_store.id, "name": default_store.name, "api_key": default_store.api_key}]
    }


@app.post("/api/auth/login")
async def login_user(req: AuthLoginReq, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Email yoki parol noto'g'ri")

    stores = db.query(Store).filter(Store.user_id == user.id, Store.is_active == True).all()
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {
        "status": "ok",
        "token": token,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
        "stores": [{"id": s.id, "name": s.name, "api_key": s.api_key} for s in stores]
    }


@app.get("/api/auth/me")
async def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stores = db.query(Store).filter(Store.user_id == user.id, Store.is_active == True).all()
    return {
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
        "stores": [{"id": s.id, "name": s.name, "api_key": s.api_key} for s in stores]
    }


# --------------------------------------------------------
# Stores Management Endpoints
# --------------------------------------------------------
@app.get("/api/stores")
async def list_stores(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stores = db.query(Store).filter(Store.user_id == user.id, Store.is_active == True).all()
    return [{"id": s.id, "name": s.name, "api_key": s.api_key, "created_at": s.created_at.isoformat()} for s in stores]


@app.post("/api/stores")
async def create_store(req: CreateStoreReq, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    name_clean = req.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Do'kon nomi kiritilishi kerak")

    new_store = Store(
        user_id=user.id,
        name=name_clean,
        api_key=generate_api_key(),
        is_active=True
    )
    db.add(new_store)
    db.commit()
    db.refresh(new_store)
    return {"status": "ok", "store": {"id": new_store.id, "name": new_store.name, "api_key": new_store.api_key}}


@app.post("/api/stores/{store_id}/regenerate-key")
async def regenerate_api_key(store_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id, Store.user_id == user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Do'kon topilmadi")

    store.api_key = generate_api_key()
    db.commit()
    return {"status": "ok", "api_key": store.api_key}


@app.delete("/api/stores/{store_id}")
async def delete_store(store_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id, Store.user_id == user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Do'kon topilmadi")

    db.delete(store)
    db.commit()
    return {"status": "ok", "message": "Do'kon muvaffaqiyatli o'chirildi"}


# --------------------------------------------------------
# Payment Creation (/create)
# --------------------------------------------------------
@app.post("/create")
@app.post("/api/create")
@app.post("/api/payments/create")
async def create_payment(
    amount: Optional[int] = Form(None),
    body_amount: Optional[int] = Body(None, embed=True),
    api_key_form: Optional[str] = Form(None, alias="api_key"),
    api_key_body: Optional[str] = Body(None, embed=True, alias="api_key"),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
    db: Session = Depends(get_db),
):
    amt = amount or body_amount
    if not amt or amt <= 0:
        raise HTTPException(status_code=400, detail="Miqdor (amount) to'g'ri kiritilishi kerak")

    # API key orqali Do'konni aniqlaymiz
    key = x_api_key or api_key_form or api_key_body
    store = None
    if key:
        store = db.query(Store).filter(Store.api_key == key.strip(), Store.is_active == True).first()

    current_time = time.time()

    # 20 daqiqadan (1200 soniya) eski "pending" to'lovlarni cancel holatiga o'tkazamiz
    pending_payments = db.query(Payment).filter(Payment.status == "pending").all()
    for p in pending_payments:
        if current_time - p.created_at > 1200:
            p.status = "cancel"
    db.commit()

    # Random 15 ta belgidan iborat payment_id generator
    alphabet = string.ascii_letters + string.digits
    payment_id = "".join(secrets.choice(alphabet) for _ in range(15))

    # Active kartalarni bazadan olamiz (faqat ushbu do'konga biriktirilgan kartalar)
    card_query = db.query(Card).filter(Card.is_active == True)
    if store:
        active_cards = card_query.filter(Card.store_id == store.id).all()
    else:
        active_cards = card_query.filter(Card.store_id == None).all()

    # Agar do'konga karta kiritilmagan bo'lsa, to'lov card=null bo'lib yaratiladi
    if not active_cards:
        while db.query(Payment).filter(
            Payment.amount == amt,
            Payment.store_id == (store.id if store else None),
            Payment.status == "pending"
        ).first():
            amt += 100

        new_payment = Payment(
            store_id=store.id if store else None,
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
            "card_number": None,
            "card": None,
            "store": store.name if store else None,
            "message": "Payment created",
        }

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

    if not assigned_card:
        while db.query(Payment).filter(
            Payment.amount == amt,
            Payment.store_id == (store.id if store else None),
            Payment.status == "pending"
        ).first():
            amt += 100
        assigned_card = active_cards[0]

    new_payment = Payment(
        store_id=store.id if store else (assigned_card.store_id if assigned_card else None),
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
        "card_number": assigned_card.card_number,
        "card": {
            "name": assigned_card.name,
            "number": assigned_card.card_number,
        },
        "store": store.name if store else None,
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
    if current_time - payment.created_at > 1200 and payment.status == "pending":
        payment.status = "cancel"
        db.commit()

    response = {
        "ok": "true",
        "data": {
            "payment_id": payment.payment_id,
            "amount": payment.amount,
            "card_number": payment.card_number,
            "card_name": payment.card_name,
            "payment_status": payment.status,
            "store_id": payment.store_id,
        },
    }

    if payment.status in ["paid", "cancel"] and not payment.served:
        payment.served = True
        db.commit()

    return response


# --------------------------------------------------------
# Payments list for Dashboard
# --------------------------------------------------------
@app.get("/api/payments")
async def list_payments(
    store_id: Optional[int] = Query(None),
    x_store_id: Optional[int] = Header(None, alias="X-Store-Id"),
    user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    sid = store_id or x_store_id
    query = db.query(Payment)
    
    if sid:
        query = query.filter(Payment.store_id == sid)
    elif user:
        user_store_ids = [s.id for s in db.query(Store).filter(Store.user_id == user.id).all()]
        if user_store_ids:
            query = query.filter(Payment.store_id.in_(user_store_ids))

    payments = query.order_by(Payment.id.desc()).all()
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
                store_id=req.store_id,
                phone=clean_p,
                api_id=req.api_id or 24511179,
                api_hash=req.api_hash or "ac098d8c9f90857f2c443302d86a7288",
                status="pending_code",
                phone_code_hash=code_hash,
            )
            db.add(sess)
        else:
            if req.store_id:
                sess.store_id = req.store_id
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
                store_id=req.store_id,
                phone=clean_p,
                api_id=24511179,
                api_hash="ac098d8c9f90857f2c443302d86a7288",
                session_string=req.session_string.strip(),
                status="active",
            )
            db.add(sess)
        else:
            if req.store_id:
                sess.store_id = req.store_id
            sess.session_string = req.session_string.strip()
            sess.status = "active"

        db.commit()
        return {"status": "ok", "message": "StringSession orqali sessiya muvaffaqiyatli faollashtirildi!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sessions/qr/start")
@app.post("/api/sessions/qr/start")
async def qr_start_endpoint():
    try:
        data = await telegram_manager.start_qr_login()
        return {"status": "ok", **data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sessions/qr/check")
@app.post("/api/sessions/qr/check")
async def qr_check_endpoint(req: QRCheckReq, db: Session = Depends(get_db)):
    try:
        result = await telegram_manager.check_qr_login(req.token_id, req.password, store_id=req.store_id)
        if result.get("status") == "authorized" and result.get("phone") and req.store_id:
            sess = db.query(TGSession).filter(TGSession.phone == result["phone"]).first()
            if sess:
                sess.store_id = req.store_id
                db.commit()
        return result
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
            if req.store_id:
                sess.store_id = req.store_id
            db.commit()

        return {"status": "ok", "message": "Telegram sessiyasi muvaffaqiyatli ulandi!"}
    except SessionPasswordNeededError:
        return {"status": "2fa_required", "message": "Hisobingizda 2-bosqichli xavfsizlik (2FA) yoqilgan. Iltimos 2FA parolingizni kiriting."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/sessions")
@app.get("/api/sessions")
async def list_sessions(
    store_id: Optional[int] = Query(None),
    x_store_id: Optional[int] = Header(None, alias="X-Store-Id"),
    user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    try:
        sid = store_id or x_store_id
        query = db.query(TGSession)
        
        if sid:
            query = query.filter(TGSession.store_id == sid)
        elif user:
            user_store_ids = [s.id for s in db.query(Store).filter(Store.user_id == user.id).all()]
            if user_store_ids:
                query = query.filter(TGSession.store_id.in_(user_store_ids))

        sessions = query.all()
        stores_map = {st.id: st.name for st in db.query(Store).all()}

        return [
            {
                "id": s.id,
                "store_id": getattr(s, "store_id", None),
                "store_name": stores_map.get(getattr(s, "store_id", None), "Umumiy / Biriktirilmagan"),
                "phone": s.phone,
                "api_id": s.api_id,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ]
    except Exception as ex:
        print(f"[List Sessions Exception]: {ex}")
        sessions = db.query(TGSession).all()
        stores_map = {st.id: st.name for st in db.query(Store).all()}
        return [
            {
                "id": s.id,
                "store_id": getattr(s, "store_id", None),
                "store_name": stores_map.get(getattr(s, "store_id", None), "Umumiy / Biriktirilmagan"),
                "phone": s.phone,
                "api_id": s.api_id,
                "status": s.status,
                "created_at": s.created_at.isoformat() if getattr(s, "created_at", None) else None,
            }
            for s in sessions
        ]


@app.post("/sessions/{session_id}/bind")
@app.post("/api/sessions/{session_id}/bind")
async def bind_session(session_id: int, store_id: int = Body(..., embed=True), db: Session = Depends(get_db)):
    sess = db.query(TGSession).filter(TGSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Sessiya topilmadi")
    sess.store_id = store_id
    db.commit()
    return {"status": "ok", "message": "Sessiya do'konga muvaffaqiyatli biriktirildi"}


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
async def list_cards(
    store_id: Optional[int] = Query(None),
    x_store_id: Optional[int] = Header(None, alias="X-Store-Id"),
    user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    sid = store_id or x_store_id
    query = db.query(Card).filter(Card.is_active == True)
    
    if sid:
        query = query.filter(Card.store_id == sid)
    elif user:
        user_store_ids = [s.id for s in db.query(Store).filter(Store.user_id == user.id).all()]
        if user_store_ids:
            query = query.filter((Card.store_id.in_(user_store_ids)) | (Card.store_id == None))

    cards = query.all()
    return cards


@app.post("/cards")
@app.post("/api/cards")
async def add_card(card: CardReq, db: Session = Depends(get_db)):
    clean_num = card.card_number.strip()

    new_card = Card(
        store_id=card.store_id,
        name=card.name.strip().upper(),
        card_number=clean_num
    )
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


# --------------------------------------------------------
# SPA Catch-All Route & Static Files (React Router Support)
# --------------------------------------------------------
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

static_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

if os.path.exists(os.path.join(static_dist_path, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dist_path, "assets")), name="assets")

@app.get("/{full_path:path}")
async def catch_all_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("create") or full_path.startswith("status/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_file = os.path.join(static_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "PayProvider SaaS Platform Backend is active."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

