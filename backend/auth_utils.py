import hmac
import hashlib
import json
import base64
import time
import secrets
from typing import Optional

SECRET_KEY = "devapi_super_secret_jwt_key_payprovider_2026_istep"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}${pw_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, pw_hash_hex = stored_hash.split('$')
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(pw_hash_hex)
        actual_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(expected_hash, actual_hash)
    except Exception:
        return False


def generate_api_key() -> str:
    return f"sk_live_{secrets.token_hex(16)}"


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data.encode('utf-8'))


def create_access_token(payload: dict, expires_in: int = 2592000) -> str:
    """Creates a signed JWT token valid for 30 days by default."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload_copy = payload.copy()
    payload_copy.update({"iat": now, "exp": now + expires_in})

    header_b64 = _b64_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = _b64_encode(json.dumps(payload_copy).encode('utf-8'))

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(_b64_decode(payload_b64).decode('utf-8'))
        if payload.get("exp") and time.time() > payload["exp"]:
            return None

        return payload
    except Exception:
        return None
