from datetime import datetime, timedelta
from typing import Optional, Union, Any
import jwt as pyjwt
from passlib.context import CryptContext
from ..config import settings

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7) # Default token valid for 7 days
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = pyjwt.encode(
        to_encode, 
        settings.JWT_SECRET, 
        algorithm="HS256"
    )
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = pyjwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=["HS256"]
        )
        return payload
    except pyjwt.PyJWTError:
        return None
