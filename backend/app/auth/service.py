from sqlalchemy import select
from sqlalchemy.orm import Session
from app.auth.schemas import UserCreate, UserResponse, LoginRequest, TokenResponse
from app.auth.repository import UserRepository
from app.auth.models import Role
from app.auth.constants import DEFAULT_ROLE
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.exceptions import AppException

class AuthService:
    def __init__(self, repo: UserRepository, db: Session):
        self.repo = repo
        self.db = db

    def register_user(self, user_in: UserCreate) -> UserResponse:
        # Check if email already exists
        existing_user = self.repo.get_user_by_email(user_in.email)
        if existing_user:
            raise AppException("Email already registered", status_code=400)
            
        # Get default role ID safely
        stmt = select(Role).where(Role.name == DEFAULT_ROLE)
        default_role = self.db.execute(stmt).scalar_one_or_none()
        
        if not default_role:
            raise AppException("System error: Default role not found", status_code=500)

        # Hash password and create user
        hashed_password = get_password_hash(user_in.password)
        new_user = self.repo.create_user(
            email=user_in.email, 
            hashed_password=hashed_password, 
            role_id=default_role.id
        )
        
        if not new_user:
            # Fallback for concurrent creation catching IntegrityError in repository
            raise AppException("Email already registered", status_code=400)
            
        return UserResponse.model_validate(new_user)

    def authenticate_user(self, login_in: LoginRequest) -> UserResponse:
        user = self.repo.get_user_by_email(login_in.email)
        
        # Generic error message to prevent email enumeration
        if not user:
            raise AppException("Invalid credentials", status_code=401)
            
        if not verify_password(login_in.password, user.hashed_password):
            raise AppException("Invalid credentials", status_code=401)
            
        if not user.is_active:
            raise AppException("User account is disabled", status_code=403)
            
        return UserResponse.model_validate(user)

    def create_user_token(self, user: UserResponse) -> TokenResponse:
        # Subject is explicitly coerced to string for JWT spec compliance
        token = create_access_token(subject=str(user.id))
        return TokenResponse(access_token=token)
