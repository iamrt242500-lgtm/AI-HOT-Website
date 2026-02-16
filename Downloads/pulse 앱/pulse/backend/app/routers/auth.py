"""
Authentication Router
Handles login and user authentication
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import AuthCredentials, AuthTokenResponse, UserResponse, UserSummaryResponse
from app.auth import create_access_token, hash_password, verify_password, verify_token

router = APIRouter()
security = HTTPBearer()


def _issue_auth_token(user: User) -> AuthTokenResponse:
    access_token = create_access_token(data={"sub": str(user.id)})
    return AuthTokenResponse(
        access_token=access_token,
        user=UserSummaryResponse(id=user.id, email=user.email),
    )


@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: AuthCredentials, db: Session = Depends(get_db)):
    """
    Create a new user account and return JWT access token.
    """
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EMAIL_ALREADY_EXISTS",
                "message": "An account with this email already exists",
            },
        )

    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_auth_token(user)


@router.post("/login", response_model=AuthTokenResponse)
async def login(request: AuthCredentials, db: Session = Depends(get_db)):
    """
    Authenticate an existing user and return JWT access token.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password",
            },
        )

    return _issue_auth_token(user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Resolve current authenticated user from Bearer token.
    Usage: current_user: User = Depends(get_current_user)
    """
    token = credentials.credentials

    payload = verify_token(token)
    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    try:
        parsed_user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    user = db.query(User).filter(User.id == parsed_user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user.
    """
    return current_user
