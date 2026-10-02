import sys
import os

# Ensure backend directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.auth.repository import UserRepository
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.core.security import get_password_hash
from app.document.models import Document  # Required for mapper initialization

def seed_users():
    db = SessionLocal()
    repo = UserRepository(db)
    
    roles = [ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT]
    default_password = "Pass123!"
    
    print("--- Seeding Test Users ---")
    for r_name in roles:
        email = f"{r_name.lower()}@test.com"
        existing = repo.get_user_by_email(email)
        if existing:
            print(f"User {email} already exists.")
            continue
            
        r_obj = db.query(Role).filter(Role.name == r_name).first()
        if not r_obj:
            print(f"Role {r_name} not found! Please run 'python -m app.db.seed' first.")
            continue
            
        repo.create_user(
            email=email,
            hashed_password=get_password_hash(default_password),
            role_id=r_obj.id,
            full_name=f"Demo {r_name}"
        )
        print(f"Created user: {email} (Password: {default_password}) with role {r_name}")
        
    db.close()
    print("User seeding completed.")

if __name__ == "__main__":
    seed_users()
