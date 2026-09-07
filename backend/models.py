import time
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from datetime import datetime
from database import Base


class TGSession(Base):
    __tablename__ = "tg_sessions"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(50), unique=True, index=True, nullable=False)
    api_id = Column(Integer, nullable=False)
    api_hash = Column(String(100), nullable=False)
    session_string = Column(Text, nullable=True)
    status = Column(String(20), default="disconnected")  # 'active', 'disconnected', 'pending_code'
    phone_code_hash = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    card_number = Column(String(20), nullable=False)  # Oxirgi 4 raqam yoki to'liq karta
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(50), unique=True, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    card_number = Column(String(20), nullable=True)
    card_name = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")  # 'pending', 'paid', 'cancel'
    created_at = Column(Float, default=time.time)
    served = Column(Boolean, default=False)
