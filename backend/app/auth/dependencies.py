from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.init_db import get_db
from app.auth.repository import UserRepository
from app.auth.service import AuthService

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repo = UserRepository(db)
    return AuthService(repo, db)
