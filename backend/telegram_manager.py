import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import re
import time
from typing import Dict, Optional
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TGSession, Payment, Card


class TelegramManager:
    def __init__(self):
        self.clients: Dict[str, TelegramClient] = {}
        self.pending_logins: Dict[str, TelegramClient] = {}
        self.loop = None

    def get_event_loop(self):
        try:
            return asyncio.get_running_loop()
        except RuntimeError:
            if self.loop and self.loop.is_running():
                return self.loop
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            return self.loop

    async def send_code(self, phone: str, api_id: int, api_hash: str) -> str:
        """Sends OTP code to the Telegram phone number."""
        client = TelegramClient(StringSession(), api_id, api_hash)
        await client.connect()
        res = await client.send_code_request(phone)
        self.pending_logins[phone] = client
        return res.phone_code_hash

    async def sign_in(self, phone: str, code: str, phone_code_hash: str, password: Optional[str] = None) -> str:
        """Completes Telegram login and returns exported StringSession string."""
        if phone not in self.pending_logins:
            raise ValueError("No pending login session found for this phone number. Please request code first.")

        client = self.pending_logins[phone]
        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        except Exception as e:
            if "Two-steps verification" in str(e) or "2FA" in str(e) or "password" in str(e).lower():
                if not password:
                    raise ValueError("2FA Password required for this account.")
                await client.sign_in(password=password)
            else:
                raise e

        session_str = client.session.save()
        del self.pending_logins[phone]
        
        # Start monitoring with this client
        await self._attach_handler_and_start(phone, client)
        return session_str

    async def load_active_sessions(self):
        """Loads and starts all active sessions from the database on startup."""
        db: Session = SessionLocal()
        try:
            sessions = db.query(TGSession).filter(TGSession.status == "active").all()
            for s in sessions:
                if s.session_string and s.phone not in self.clients:
                    try:
                        client = TelegramClient(StringSession(s.session_string), s.api_id, s.api_hash)
                        await client.connect()
                        if await client.is_user_authorized():
                            await self._attach_handler_and_start(s.phone, client)
                            print(f"[TelegramManager] Active session restored for {s.phone}")
                        else:
                            s.status = "disconnected"
                            db.commit()
                    except Exception as ex:
                        print(f"[TelegramManager Error] Failed to restore session {s.phone}: {ex}")
        finally:
            db.close()

    async def _attach_handler_and_start(self, phone: str, client: TelegramClient):
        self.clients[phone] = client

        @client.on(events.NewMessage(from_users="humocardbot"))
        async def humocard_handler(event):
            text = event.raw_text
            await self.process_telegram_message(text)

    async def process_telegram_message(self, text: str):
        """Core parser for Telegram payment messages (humocardbot format)."""
        try:
            print(f"[Telegram Message Received]:\n{text.encode('ascii', errors='backslashreplace').decode('ascii')}")
        except Exception:
            pass
        if "To'ldirish" not in text:
            return False

        # Extract last 4 digits of card from message (e.g. 💳 *4271)
        detected_card_number = None
        if "💳" in text:
            for line in text.split("\n"):
                if "💳" in line and "*" in line:
                    detected_card_number = line.split("*")[-1].strip()
                    break

        db: Session = SessionLocal()
        try:
            pending_payments = db.query(Payment).filter(Payment.status == "pending").all()
            matched = False

            for p in pending_payments:
                # Format amount: e.g. 10000 -> 10.000,00
                amount_formatted = f"{p.amount:,}".replace(",", ".") + ",00"

                if amount_formatted in text or str(p.amount) in text.replace(".", "").replace(",", ""):
                    if p.card_number:
                        if detected_card_number and detected_card_number == p.card_number:
                            p.status = "paid"
                            matched = True
                    else:
                        p.status = "paid"
                        matched = True

            if matched:
                db.commit()
                print(f"[TelegramManager] Payment matched and marked as PAID!")
            return matched
        finally:
            db.close()

    async def disconnect_session(self, phone: str):
        if phone in self.clients:
            client = self.clients[phone]
            await client.disconnect()
            del self.clients[phone]


# Singleton instance
telegram_manager = TelegramManager()
