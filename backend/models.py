import time
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    stores = relationship("Store", back_populates="owner", cascade="all, delete-orphan")


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    api_key = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="stores")
    sessions = relationship("TGSession", back_populates="store", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="store", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="store", cascade="all, delete-orphan")


class TGSession(Base):
    __tablename__ = "tg_sessions"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    phone = Column(String(50), unique=True, index=True, nullable=False)
    api_id = Column(Integer, nullable=False)
    api_hash = Column(String(100), nullable=False)
    session_string = Column(Text, nullable=True)
    status = Column(String(20), default="disconnected")  # 'active', 'disconnected', 'pending_code'
    phone_code_hash = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="sessions")


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    name = Column(String(100), nullable=False)
    card_number = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    store = relationship("Store", back_populates="cards")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    payment_id = Column(String(50), unique=True, index=True, nullable=False)
    amount = Column(Integer, nullable=False)
    card_number = Column(String(50), nullable=True)
    card_name = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")  # 'pending', 'paid', 'cancel'
    created_at = Column(Float, default=time.time)
    served = Column(Boolean, default=False)

    store = relationship("Store", back_populates="payments")
