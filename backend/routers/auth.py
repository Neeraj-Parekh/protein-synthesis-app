"""
Authentication and authorization router
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
import string
import os
from datetime import datetime, timedelta

from models.user import (
    UserDB, UserSessionDB, UserCreate, UserUpdate, TokenResponse, LoginRequest,
    PasswordResetRequest, PasswordResetConfirm, ChangePasswordRequest,
    UserResponse, AuthUtils, UserRole, UserStatus
)
from database import get_db

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = AuthUtils.verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if user is None:
        raise credentials_exception

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )

    return user

# Dependency to get current admin user
async def get_current_admin(current_user: UserDB = Depends(get_current_user)):
    """Get current admin user"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_current_admin_user(current_user: UserDB = Depends(get_current_user)) -> UserDB:
    """Dependency to get current admin user"""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Admin access required."
        )
    return current_user

@router.post("/register", response_model=UserResponse, tags=["Authentication"])
async def register_user(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Register a new user account.

    Creates a new user account with the provided information. An email verification
    link will be sent to the provided email address.

    **Note**: Password must be at least 8 characters long.
    """
    # Check if user already exists
    existing_user = db.query(UserDB).filter(
        or_(UserDB.email == user_data.email, UserDB.username == user_data.username)
    ).first()

    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Hash password
    hashed_password = AuthUtils.hash_password(user_data.password)

    # Generate verification token
    verification_token = AuthUtils.generate_verification_token()

    # Create user
    db_user = UserDB(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role.value,
        verification_token=verification_token,
        preferences=user_data.preferences or {}
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Send verification email (in background)
    background_tasks.add_task(send_verification_email, db_user.email, verification_token)

    return UserResponse(
        id=db_user.id,
        email=db_user.email,
        username=db_user.username,
        full_name=db_user.full_name,
        role=db_user.role,
        status=db_user.status,
        is_verified=db_user.is_verified,
        last_login=db_user.last_login,
        created_at=db_user.created_at,
        updated_at=db_user.updated_at,
        preferences=db_user.preferences
    )

@router.post("/login", response_model=TokenResponse, tags=["Authentication"])
async def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return access token.

    Authenticates the user with the provided credentials and returns an access token
    for subsequent API requests. The token should be included in the Authorization
    header as `Bearer <token>`.

    **Security Note**: Accounts are temporarily locked after 5 failed login attempts.
    """
    # Find user by email or username
    user = db.query(UserDB).filter(
        or_(UserDB.email == login_data.username_or_email,
            UserDB.username == login_data.username_or_email)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked due to too many failed attempts"
        )

    # Verify password
    if not AuthUtils.verify_password(login_data.password, user.hashed_password):
        # Increment login attempts
        user.login_attempts += 1

        # Lock account after 5 failed attempts
        if user.login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    # Reset login attempts on successful login
    user.login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()

    # Create access token
    access_token_expires = timedelta(minutes=AuthUtils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthUtils.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Create session record
    session_id = secrets.token_urlsafe(32)
    session_expires = datetime.utcnow() + access_token_expires

    db_session = UserSessionDB(
        id=session_id,
        user_id=user.id,
        token=access_token,
        expires_at=session_expires,
        is_active=True
    )
    db.add(db_session)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=int(access_token_expires.total_seconds()),
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            status=user.status,
            is_verified=user.is_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
            preferences=user.preferences
        )
    )

@router.post("/logout")
async def logout_user(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user by deactivating their session"""
    # Deactivate all active sessions for this user
    db.query(UserSessionDB).filter(
        UserSessionDB.user_id == current_user.id,
        UserSessionDB.is_active == True
    ).update({"is_active": False})

    db.commit()

    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserDB = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        status=current_user.status,
        is_verified=current_user.is_verified,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        preferences=current_user.preferences
    )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    update_data = user_update.dict(exclude_unset=True)

    # Check if email/username is already taken by another user
    if "email" in update_data:
        existing = db.query(UserDB).filter(
            UserDB.email == update_data["email"],
            UserDB.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )

    if "username" in update_data:
        existing = db.query(UserDB).filter(
            UserDB.username == update_data["username"],
            UserDB.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Update user
    for field, value in update_data.items():
        setattr(current_user, field, value)

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        status=current_user.status,
        is_verified=current_user.is_verified,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        preferences=current_user.preferences
    )

@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not AuthUtils.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Hash new password
    hashed_new_password = AuthUtils.hash_password(password_data.new_password)

    # Update password
    current_user.hashed_password = hashed_new_password
    current_user.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
async def forgot_password(
    reset_request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Request password reset"""
    user = db.query(UserDB).filter(UserDB.email == reset_request.email).first()

    if user:
        # Generate reset token
        reset_token = AuthUtils.generate_reset_token()

        # Save reset token
        from models.user import PasswordResetDB
        db_reset = PasswordResetDB(
            user_id=user.id,
            reset_token=reset_token,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.add(db_reset)
        db.commit()

        # Send reset email
        background_tasks.add_task(send_password_reset_email, user.email, reset_token)

    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(reset_data: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using token"""
    from models.user import PasswordResetDB
    
    # Find valid reset token
    reset_record = db.query(PasswordResetDB).filter(
        PasswordResetDB.reset_token == reset_data.token,
        PasswordResetDB.is_used == False,
        PasswordResetDB.expires_at > datetime.utcnow()
    ).first()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = db.query(UserDB).filter(UserDB.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = AuthUtils.hash_password(reset_data.new_password)
    user.updated_at = datetime.utcnow()
    
    # Mark reset token as used
    reset_record.is_used = True
    
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.post("/verify-email/{token}")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email with token"""
    # Decode token
    payload = AuthUtils.verify_token(token)
    if not payload or payload.get("type") != "verification":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    # Find user by token
    user = db.query(UserDB).filter(UserDB.verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )

    # Mark as verified
    user.is_verified = True
    user.verification_token = None
    user.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Email verified successfully"}

@router.get("/users", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(UserDB).offset(skip).limit(limit).all()

    return [
        UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            status=user.status,
            is_verified=user.is_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
            preferences=user.preferences
        ) for user in users
    ]

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: UserDB = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update user (admin only)"""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_data = user_update.dict(exclude_unset=True)

    # Update user
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        status=user.status,
        is_verified=user.is_verified,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at,
        preferences=user.preferences
    )

# Email utility functions
def send_verification_email(email: str, token: str):
    """Send email verification link"""
    try:
        # Email configuration from environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        sender_email = os.getenv("SMTP_USERNAME")
        sender_password = os.getenv("SMTP_PASSWORD")
        
        if not sender_email or not sender_password:
            raise ValueError("SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables.")

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = "Verify Your Email - Protein Synthesis App"

        body = f"""
        Welcome to Protein Synthesis Web Application!

        Please verify your email by clicking the link below:
        http://localhost:3000/verify-email/{token}

        This link will expire in 24 hours.

        If you didn't create an account, please ignore this email.
        """

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, email, text)
        server.quit()

    except Exception as e:
        print(f"Failed to send verification email: {e}")

def send_password_reset_email(email: str, token: str):
    """Send password reset email"""
    try:
        # Email configuration from environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        sender_email = os.getenv("SMTP_USERNAME")
        sender_password = os.getenv("SMTP_PASSWORD")
        
        if not sender_email or not sender_password:
            raise ValueError("SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables.")

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = "Reset Your Password - Protein Synthesis App"

        body = f"""
        Password Reset Request

        You requested a password reset for your Protein Synthesis account.

        Click the link below to reset your password:
        http://localhost:3000/reset-password/{token}

        This link will expire in 1 hour.

        If you didn't request this reset, please ignore this email.
        """

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, email, text)
        server.quit()

    except Exception as e:
        print(f"Failed to send password reset email: {e}")