import os
import sys

# Ensure backend directory is in the path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app.db.session import SessionLocal
from app.auth.models import Role

def seed_roles():
    db = SessionLocal()
    roles_to_seed = ["Admin", "HOD", "Faculty", "Student"]
    try:
        for role_name in roles_to_seed:
            existing_role = db.query(Role).filter(Role.name == role_name).first()
            if not existing_role:
                new_role = Role(name=role_name, description=f"{role_name} role")
                db.add(new_role)
                print(f"Added role: {role_name}")
            else:
                print(f"Role {role_name} already exists.")
        db.commit()
        print("Roles seeding complete!")
    except Exception as e:
        print(f"Error seeding roles: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_roles()
