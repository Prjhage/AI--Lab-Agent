from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .utils.auth_helpers import decode_access_token

# Token route endpoint URL mapping
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve the currently logged in user via JWT Bearer Token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    return user


def get_current_teacher(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to verify the logged in user has the Teacher role."""
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty permissions required to perform this action."
        )
    return current_user


def get_current_student(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to verify the logged in user has the Student role."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student permissions required to perform this action."
        )
    return current_user
