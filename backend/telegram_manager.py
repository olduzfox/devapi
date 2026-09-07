import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import re
import time
from typing import Dict, Optional
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TGSession, Payment, Card

DEFAULT_API_ID = 24511179
DEFAULT_API_HASH = "ac098d8c9f90857f2c443302d86a7288"


class TelegramManager:
    def __init__(self):
        self.clients: Dict[str, TelegramClient] = {}
        self.pending_logins: Dict[str, TelegramClient] = {}
        self.loop = None

    def clean_phone(self, phone: str) -> str:
        cleaned = re.sub(r"[^\d+]", "", phone.strip())
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return cleaned

    def _create_client(self, session, api_id: int, api_hash: str):
        """Creates a Telethon TelegramClient with official desktop parameters to ensure SMS code delivery."""
        return TelegramClient(
            session,
            api_id,
            api_hash,
            device_model="Desktop",
            system_version="Windows 11",
            app_version="4.16.3 x64",
            lang_code="en",
            system_lang_code="en",
        )

    async def send_code(self, phone: str, api_id: Optional[int] = None, api_hash: Optional[str] = None, force_sms: bool = False) -> str:
        """Sends OTP code to Telegram phone number."""
        phone = self.clean_phone(phone)
        use_api_id = api_id or DEFAULT_API_ID
        use_api_hash = api_hash or DEFAULT_API_HASH

        # Clean old pending client if exists
        if phone in self.pending_logins:
            try:
                await self.pending_logins[phone].disconnect()
            except Exception:
                pass
            del self.pending_logins[phone]

        client = self._create_client(StringSession(), use_api_id, use_api_hash)
        await client.connect()
        
        try:
            res = await client.send_code_request(phone, force_sms=force_sms)
            self.pending_logins[phone] = client
            print(f"[TelegramManager] Code requested for {phone} (api_id={use_api_id})")
            return res.phone_code_hash
        except Exception as e:
            await client.disconnect()
            err_msg = str(e)
            if "FLOOD_WAIT" in err_msg:
                wait_sec = re.findall(r"\d+", err_msg)
                sec = wait_sec[0] if wait_sec else "60"
                raise ValueError(f"Telegram ushbu raqamga {sec} soniya cheklov qo'ydi. Iltimos {sec} soniyadan keyin qayta urining.")
            raise ValueError(f"Telegram kodini yuborishda xatolik: {err_msg}")

    async def sign_in(self, phone: str, code: str, phone_code_hash: str, password: Optional[str] = None, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> str:
        """Completes Telegram login and returns StringSession."""
        phone = self.clean_phone(phone)
        use_api_id = api_id or DEFAULT_API_ID
        use_api_hash = api_hash or DEFAULT_API_HASH

        if phone not in self.pending_logins:
            client = self._create_client(StringSession(), use_api_id, use_api_hash)
            await client.connect()
            self.pending_logins[phone] = client
        else:
            client = self.pending_logins[phone]

        try:
            await client.sign_in(phone=phone, code=code.strip(), phone_code_hash=phone_code_hash.strip())
        except SessionPasswordNeededError:
            if not password:
                raise SessionPasswordNeededError("2FA Parol talab etiladi")
            await client.sign_in(password=password.strip())
        except Exception as e:
            if "password" in str(e).lower() or "2fa" in str(e).lower() or "two-step" in str(e).lower():
                if not password:
                    raise SessionPasswordNeededError("2FA Parol talab etiladi")
                await client.sign_in(password=password.strip())
            else:
                raise e

        session_str = client.session.save()
        if phone in self.pending_logins:
            del self.pending_logins[phone]

        # Attach message handler and activate
        await self._attach_handler_and_start(phone, client)
        return session_str

    async def import_string_session(self, phone: str, session_str: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> bool:
        """Imports an existing StringSession directly without SMS OTP."""
        phone = self.clean_phone(phone)
        use_api_id = api_id or DEFAULT_API_ID
        use_api_hash = api_hash or DEFAULT_API_HASH

        client = self._create_client(StringSession(session_str.strip()), use_api_id, use_api_hash)
        await client.connect()
        if not await client.is_user_authorized():
            await client.disconnect()
            raise ValueError("Berilgan StringSession yaroqsiz yoki avtorizatsiyadan o'tmagan.")

        await self._attach_handler_and_start(phone, client)
        return True

    async def load_active_sessions(self):
        """Loads and starts all active sessions from the database on startup."""
        db: Session = SessionLocal()
        try:
            sessions = db.query(TGSession).filter(TGSession.status == "active").all()
            for s in sessions:
                if s.session_string and s.phone not in self.clients:
                    try:
                        client = self._create_client(StringSession(s.session_string), s.api_id, s.api_hash)
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
        phone = self.clean_phone(phone)
        if phone in self.clients:
            client = self.clients[phone]
            try:
                await client.disconnect()
            except Exception:
                pass
            del self.clients[phone]


# Singleton instance
telegram_manager = TelegramManager()
