import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import re
import time
import secrets
import string
from typing import Dict, Optional
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TGSession, Payment, Card

DEV_API_ID = 24511179
DEV_API_HASH = "ac098d8c9f90857f2c443302d86a7288"

WEB_API_ID = 2040
WEB_API_HASH = "b18441a1ed609e10d6d11993446c022c"

OFFICIAL_API_ID = 6
OFFICIAL_API_HASH = "eb066357cf9304d306f0509f3015b7ae"


class TelegramManager:
    def __init__(self):
        self.clients: Dict[str, TelegramClient] = {}
        self.pending_logins: Dict[str, TelegramClient] = {}
        self.pending_qr_logins: Dict[str, dict] = {}

    def clean_phone(self, phone: str) -> str:
        cleaned = re.sub(r"[^\d+]", "", phone.strip())
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return cleaned

    def _create_client(self, session, api_id: int, api_hash: str):
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

    # --------------------------------------------------------
    # QR Code Login Flow
    # --------------------------------------------------------
    async def start_qr_login(self) -> dict:
        """Starts a QR code login session and returns QR URL and token_id."""
        alphabet = string.ascii_letters + string.digits
        token_id = "".join(secrets.choice(alphabet) for _ in range(12))

        try_credentials = [
            (DEV_API_ID, DEV_API_HASH),
            (WEB_API_ID, WEB_API_HASH),
        ]

        last_error = None
        for api_id, api_hash in try_credentials:
            client = self._create_client(StringSession(), api_id, api_hash)
            await client.connect()

            try:
                qr_login = await client.qr_login()
                self.pending_qr_logins[token_id] = {
                    "client": client,
                    "qr_login": qr_login,
                    "api_id": api_id,
                    "api_hash": api_hash,
                    "created_at": time.time(),
                }
                print(f"[TelegramManager] QR Login started using API_ID {api_id}, token_id={token_id}")
                return {
                    "token_id": token_id,
                    "url": qr_login.url,
                    "expires_in": 60,
                }
            except Exception as e:
                await client.disconnect()
                last_error = e

        raise ValueError(f"QR Kod yaratishda xatolik: {str(last_error)}")

    async def check_qr_login(self, token_id: str, password: Optional[str] = None, store_id: Optional[int] = None) -> dict:
        """Checks status of QR login session."""
        if token_id not in self.pending_qr_logins:
            return {"status": "expired", "message": "QR kod vaqti tugadi yoki topilmadi."}

        qr_data = self.pending_qr_logins[token_id]
        client: TelegramClient = qr_data["client"]
        qr_login = qr_data["qr_login"]
        api_id = qr_data.get("api_id", DEV_API_ID)
        api_hash = qr_data.get("api_hash", DEV_API_HASH)

        # 1. First check if client is already authorized
        try:
            if await client.is_user_authorized():
                me = await client.get_me()
                phone = self.clean_phone(me.phone) if me and me.phone else f"+User_{me.id if me else 'Active'}"
                session_str = client.session.save()

                if token_id in self.pending_qr_logins:
                    del self.pending_qr_logins[token_id]

                await self._attach_handler_and_start(phone, client)

                db: Session = SessionLocal()
                try:
                    sess = db.query(TGSession).filter(
                        (TGSession.phone == phone) | (TGSession.phone == phone.replace("+", ""))
                    ).first()
                    if not sess:
                        sess = TGSession(
                            store_id=store_id,
                            phone=phone,
                            api_id=api_id,
                            api_hash=api_hash,
                            session_string=session_str,
                            status="active",
                        )
                        db.add(sess)
                    else:
                        sess.phone = phone
                        if store_id:
                            sess.store_id = store_id
                        sess.session_string = session_str
                        sess.status = "active"
                    db.commit()
                finally:
                    db.close()

                return {
                    "status": "authorized",
                    "phone": phone,
                    "message": f"Telegram sessiyasi ({phone}) QR kod orqali muvaffaqiyatli ulandi!",
                }
        except Exception:
            pass

        # 300 sec (5 min) timeout check
        if time.time() - qr_data["created_at"] > 300:
            try:
                await client.disconnect()
            except Exception:
                pass
            if token_id in self.pending_qr_logins:
                del self.pending_qr_logins[token_id]
            return {"status": "expired", "message": "QR kod vaqti tugadi. Qayta yangilanmoqda..."}

        try:
            user = await asyncio.wait_for(qr_login.wait(), timeout=0.8)
            session_str = client.session.save()
            me = await client.get_me()
            phone = self.clean_phone(me.phone) if me and me.phone else f"+User_{user.id}"

            if token_id in self.pending_qr_logins:
                del self.pending_qr_logins[token_id]

            await self._attach_handler_and_start(phone, client)

            db: Session = SessionLocal()
            try:
                sess = db.query(TGSession).filter(
                    (TGSession.phone == phone) | (TGSession.phone == phone.replace("+", ""))
                ).first()
                if not sess:
                    sess = TGSession(
                        store_id=store_id,
                        phone=phone,
                        api_id=api_id,
                        api_hash=api_hash,
                        session_string=session_str,
                        status="active",
                    )
                    db.add(sess)
                else:
                    sess.phone = phone
                    if store_id:
                        sess.store_id = store_id
                    sess.session_string = session_str
                    sess.status = "active"
                db.commit()
            finally:
                db.close()

            return {
                "status": "authorized",
                "phone": phone,
                "message": f"Telegram sessiyasi ({phone}) QR kod orqali muvaffaqiyatli ulandi!",
            }
        except asyncio.TimeoutError:
            return {
                "status": "pending",
                "url": getattr(qr_login, "url", None),
                "message": "QR kod skan qilinishi kutilmoqda...",
            }
        except SessionPasswordNeededError:
            if password:
                try:
                    await client.sign_in(password=password.strip())
                    session_str = client.session.save()
                    me = await client.get_me()
                    phone = self.clean_phone(me.phone) if me and me.phone else "+2FAUser"

                    if token_id in self.pending_qr_logins:
                        del self.pending_qr_logins[token_id]

                    await self._attach_handler_and_start(phone, client)

                    db: Session = SessionLocal()
                    try:
                        sess = db.query(TGSession).filter(
                            (TGSession.phone == phone) | (TGSession.phone == phone.replace("+", ""))
                        ).first()
                        if not sess:
                            sess = TGSession(
                                store_id=store_id,
                                phone=phone,
                                api_id=api_id,
                                api_hash=api_hash,
                                session_string=session_str,
                                status="active",
                            )
                            db.add(sess)
                        else:
                            sess.phone = phone
                            if store_id:
                                sess.store_id = store_id
                            sess.session_string = session_str
                            sess.status = "active"
                        db.commit()
                    finally:
                        db.close()

                    return {
                        "status": "authorized",
                        "phone": phone,
                        "message": f"Telegram sessiyasi ({phone}) QR kod va 2FA parol orqali ulandi!",
                    }
                except Exception as ex:
                    return {"status": "2fa_error", "message": f"2FA Parol noto'g'ri: {str(ex)}"}
            else:
                return {"status": "2fa_required", "message": "2FA Parol talab etiladi."}
        except Exception as e:
            if "password" in str(e).lower() or "2fa" in str(e).lower():
                return {"status": "2fa_required", "message": "2FA Parol talab etiladi."}
            return {"status": "error", "message": str(e)}

    # --------------------------------------------------------
    # Phone OTP Login Flow
    # --------------------------------------------------------
    async def send_code(self, phone: str, api_id: Optional[int] = None, api_hash: Optional[str] = None, force_sms: bool = False) -> str:
        """Sends OTP code to ANY Telegram phone number."""
        phone = self.clean_phone(phone)
        use_api_id = api_id or DEV_API_ID
        use_api_hash = api_hash or DEV_API_HASH

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
            print(f"[TelegramManager] Code requested for {phone} using API_ID {use_api_id}")
            return res.phone_code_hash
        except Exception as e:
            await client.disconnect()
            if not api_id and use_api_id == DEV_API_ID:
                print(f"[TelegramManager] Retrying send_code with WEB_API_ID {WEB_API_ID}")
                return await self.send_code(phone, api_id=WEB_API_ID, api_hash=WEB_API_HASH, force_sms=force_sms)

            err_msg = str(e)
            if "FLOOD_WAIT" in err_msg:
                wait_sec = re.findall(r"\d+", err_msg)
                sec = wait_sec[0] if wait_sec else "60"
                raise ValueError(f"Telegram ushbu raqamga {sec} soniya cheklov qo'ydi. Iltimos {sec} soniyadan keyin qayta urining.")
            raise ValueError(f"Telegram kodini yuborishda xatolik: {err_msg}")

    async def sign_in(self, phone: str, code: str, phone_code_hash: str, password: Optional[str] = None, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> str:
        """Completes Telegram login for any phone number and returns StringSession."""
        phone = self.clean_phone(phone)
        use_api_id = api_id or DEV_API_ID
        use_api_hash = api_hash or DEV_API_HASH

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

        await self._attach_handler_and_start(phone, client)
        return session_str

    async def import_string_session(self, phone: str, session_str: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> bool:
        """Imports an existing StringSession directly."""
        phone = self.clean_phone(phone)
        use_api_id = api_id or DEV_API_ID
        use_api_hash = api_hash or DEV_API_HASH

        client = self._create_client(StringSession(session_str.strip()), use_api_id, use_api_hash)
        await client.connect()
        if not await client.is_user_authorized():
            await client.disconnect()
            raise ValueError("Berilgan StringSession yaroqsiz yoki avtorizatsiyadan o'tmagan.")

        await self._attach_handler_and_start(phone, client)
        return True

    async def load_active_sessions(self):
        """Loads and starts all active sessions from database on startup."""
        db: Session = SessionLocal()
        try:
            sessions = db.query(TGSession).filter(TGSession.status == "active").all()
            for s in sessions:
                if s.session_string and s.phone not in self.clients:
                    try:
                        client = self._create_client(StringSession(s.session_string), s.api_id or DEV_API_ID, s.api_hash or DEV_API_HASH)
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
                    detected_card_number = line.strip().split("*")[-1].strip()
                    break

        db: Session = SessionLocal()
        try:
            pending_payments = db.query(Payment).filter(Payment.status == "pending").all()
            matched = False

            for p in pending_payments:
                amount_formatted = f"{p.amount:,}".replace(",", ".") + ",00"

                if amount_formatted in text or str(p.amount) in text.replace(".", "").replace(",", ""):
                    if p.card_number:
                        p_card_clean = p.card_number.replace(" ", "")
                        if detected_card_number and (detected_card_number == p_card_clean or p_card_clean.endswith(detected_card_number)):
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
