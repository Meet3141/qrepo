import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.subject.repository import SubjectRepository, UnitRepository
from app.auth.repository import UserRepository
from app.subject.service import SubjectService
from app.subject.schemas import SubjectCreate, SubjectUpdate, UnitCreate, UnitUpdate
from app.core.exceptions import AppException

def verify_service():
    db = SessionLocal()
    subject_repo = SubjectRepository(db)
    unit_repo = UnitRepository(db)
    user_repo = UserRepository(db)
    service = SubjectService(subject_repo, unit_repo, user_repo)
    
    print("--- Starting Step 5 Service Verification ---")
    
    admin = user_repo.get_user_by_email("admin@test.com")
    faculty1 = user_repo.get_user_by_email("faculty@test.com")
    student = user_repo.get_user_by_email("student@test.com")
    
    if not admin or not faculty1 or not student:
        print("Missing test users. Make sure seed_test_users.py ran.")
        return
    
    # 1. Subject Creation with Invalid Faculty (Student)
    try:
        service.create_subject(SubjectCreate(name="Fail", code="FAIL", faculty_id=student.id))
        print("[FAIL] Created subject with a student assigned as faculty!")
    except AppException as e:
        if e.status_code == 400:
            print("[OK] Correctly rejected non-faculty user assignment.")
        else:
            print(f"[FAIL] Unexpected error: {e}")

    # 2. Subject Creation Success
    try:
        subject = service.create_subject(SubjectCreate(
            name="Service Test Subject",
            code="SRV101",
            faculty_id=faculty1.id
        ))
        print("[OK] Successfully created Subject via service.")
    except Exception as e:
        print(f"[FAIL] Subject creation failed: {e}")
        return

    # 3. Duplicate Subject Code
    try:
        service.create_subject(SubjectCreate(
            name="Another",
            code="SRV101",
            faculty_id=faculty1.id
        ))
        print("[FAIL] Allowed duplicate subject code.")
    except AppException as e:
        if e.status_code == 400:
            print("[OK] Correctly blocked duplicate subject code.")
        else:
            print(f"[FAIL] Unexpected error: {e}")

    # 4. Unit Creation (Authorized Faculty)
    try:
        unit = service.create_unit(subject.id, UnitCreate(
            unit_number=1,
            title="Service Unit",
            description="A test unit"
        ), current_user=faculty1)
        print("[OK] Authorized faculty successfully created a unit.")
    except Exception as e:
        print(f"[FAIL] Authorized faculty unit creation failed: {e}")

    # 5. Unit Creation (Unauthorized User - Student)
    try:
        service.create_unit(subject.id, UnitCreate(
            unit_number=2,
            title="Service Unit 2"
        ), current_user=student)
        print("[FAIL] Student was allowed to create a unit!")
    except AppException as e:
        if e.status_code == 403:
            print("[OK] Correctly blocked Student from managing units (ownership check).")
            # Note: In real app, RBAC blocks them at router, but service ownership check acts as fallback for non-faculty roles.
        else:
            print(f"[FAIL] Unexpected error: {e}")

    # Clean up
    service.delete_subject(subject.id)
    print("[OK] Cleaned up service test data.")
    
    db.close()
    print("--- Verification Complete ---")

if __name__ == "__main__":
    verify_service()
