import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.db.session import SessionLocal
from app.auth.repository import UserRepository
from app.auth.service import AuthService
from app.auth.schemas import LoginRequest
from app.subject.models import Subject, Unit
from app.document.models import Document


def reset_passwords():
    db = SessionLocal()
    repo = UserRepository(db)
    
    from app.core.security import get_password_hash
    new_hash = get_password_hash("Pass123!")
    
    for email in ["admin@test.com", "hod@test.com", "faculty@test.com", "student@test.com"]:
        user = repo.get_user_by_email(email)
        if user:
            user.hashed_password = new_hash
            print(f"Resetting password for {email}")
            
    db.commit()
    print("Passwords reset successfully.")
    db.close()

if __name__ == "__main__":
    reset_passwords()
