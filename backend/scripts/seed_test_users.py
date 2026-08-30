import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.auth.models import User, Role
from app.auth.repository import UserRepository
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.core.security import get_password_hash

def seed_users():
    db = SessionLocal()
    repo = UserRepository(db)
    
    roles = [ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT]
    
    for r_name in roles:
        r_obj = db.query(Role).filter(Role.name == r_name).first()
        if not r_obj:
            r_obj = Role(name=r_name)
            db.add(r_obj)
            db.commit()
            db.refresh(r_obj)
            
        email = f"{r_name.lower()}@test.com"
        existing = repo.get_user_by_email(email)
        if existing:
            print(f"User {email} already exists.")
            continue
            
        repo.create_user(
            email=email,
            hashed_password=get_password_hash("Pass123!"),
            role_id=r_obj.id
        )
        print(f"Created user: {email} with role {r_name}")
        
    db.close()

if __name__ == "__main__":
    seed_users()
