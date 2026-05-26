import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import (
    hash_password, verify_password, create_access_token, get_current_user
)
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.user import UserCreate, UserOut, Token
from app.services.email_service import send_password_reset_email
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


# ─── Register ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username, User.is_active == True).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id)
    return Token(access_token=token)


# ─── Me ───────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Forgot Password ──────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Always return 200 — never reveal whether an email is registered
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    # Invalidate all previous reset tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
    ).update({"used": True})

    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    db.add(PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=expires_at,
    ))
    db.commit()

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    send_password_reset_email(to=user.email, name=user.name, reset_url=reset_url)

    return {"message": "If that email is registered, a reset link has been sent."}


# ─── Reset Password ───────────────────────────────────────────────────────────

class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

    def validate_passwords(self) -> None:
        if self.password != self.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        if len(self.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if not any(c.isupper() for c in self.password):
            raise HTTPException(status_code=400, detail="Password must contain an uppercase letter")
        if not any(c.isdigit() for c in self.password):
            raise HTTPException(status_code=400, detail="Password must contain a number")


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload.validate_passwords()

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == payload.token
    ).first()

    if not record or not record.is_valid():
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )

    user = db.query(User).filter(User.id == record.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(payload.password)
    record.used = True
    db.commit()

    return {"message": "Password reset successfully. You can now sign in."}


# ─── Validate Reset Token (for frontend pre-check) ────────────────────────────

@router.get("/reset-password/validate")
def validate_reset_token(token: str, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()
    if not record or not record.is_valid():
        raise HTTPException(status_code=400, detail="Token is invalid or expired")
    return {"valid": True}
