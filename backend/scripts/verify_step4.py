import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import SessionLocal
from app.subject.repository import SubjectRepository, UnitRepository
from app.subject.schemas import SubjectCreate, SubjectUpdate, SubjectResponse, UnitCreate, UnitUpdate, UnitResponse
from app.auth.repository import UserRepository

def verify():
    db = SessionLocal()
    subject_repo = SubjectRepository(db)
    unit_repo = UnitRepository(db)
    user_repo = UserRepository(db)
    
    print("--- Starting Step 4 Verification ---")
    
    # Setup test faculty
    test_faculty = user_repo.get_user_by_email("faculty@test.com")
    if not test_faculty:
        print("Faculty user not found for testing.")
        db.close()
        return

    faculty_id = test_faculty.id
    
    # 1. Pydantic validation
    try:
        subject_create_schema = SubjectCreate(name="Test Subject", code="TEST101", description="A test subject", faculty_id=faculty_id)
        print("[OK] SubjectCreate schema validation passed.")
    except Exception as e:
        print(f"[FAIL] SubjectCreate validation: {e}")
        
    try:
        unit_create_schema = UnitCreate(unit_number=1, title="Test Unit 1", description="First unit")
        print("[OK] UnitCreate schema validation passed.")
    except Exception as e:
        print(f"[FAIL] UnitCreate validation: {e}")

    # 2. SubjectRepository.create()
    subject = subject_repo.create(
        name=subject_create_schema.name,
        code=subject_create_schema.code,
        description=subject_create_schema.description,
        faculty_id=subject_create_schema.faculty_id
    )
    if subject:
        print(f"[OK] Subject created successfully with ID: {subject.id}")
    else:
        print("[FAIL] Failed to create Subject.")
        db.close()
        return
        
    # 3. Duplicate code behavior
    duplicate = subject_repo.create(name="Another", code="TEST101", description="Dupe", faculty_id=faculty_id)
    if duplicate is None:
        print("[OK] Duplicate Subject code correctly rejected by Repository (IntegrityError handled).")
    else:
        print("[FAIL] Duplicate Subject code was NOT rejected.")

    # 4. SubjectRepository.get_by_id() and get_by_code()
    fetched_by_id = subject_repo.get_by_id(subject.id)
    fetched_by_code = subject_repo.get_by_code("TEST101")
    if fetched_by_id and fetched_by_code and fetched_by_id.id == fetched_by_code.id:
        print("[OK] get_by_id() and get_by_code() successfully retrieved the subject.")
    else:
        print("[FAIL] get_by_id() or get_by_code() failed.")
        
    # 5. SubjectRepository.update()
    updated_subject = subject_repo.update(subject, {"description": "Updated description"})
    if updated_subject.description == "Updated description":
        print("[OK] Subject successfully updated.")
    else:
        print("[FAIL] Subject update failed.")

    # 6. UnitRepository.create()
    unit1 = unit_repo.create(
        subject_id=subject.id,
        unit_number=unit_create_schema.unit_number,
        title=unit_create_schema.title,
        description=unit_create_schema.description
    )
    unit2 = unit_repo.create(
        subject_id=subject.id,
        unit_number=2,
        title="Test Unit 2",
        description="Second unit"
    )
    if unit1 and unit2:
        print(f"[OK] Units created successfully under Subject {subject.id}.")
    else:
        print("[FAIL] Unit creation failed.")

    # 7. UnitRepository.get_by_subject_id()
    units = unit_repo.get_by_subject_id(subject.id)
    if len(units) == 2:
        print("[OK] get_by_subject_id() retrieved the correct number of units.")
    else:
        print(f"[FAIL] get_by_subject_id() retrieved {len(units)} units, expected 2.")
        
    # 8. Schema Response Serialization
    try:
        # Pydantic v2 from_orm is replaced by model_validate
        response = SubjectResponse.model_validate(subject)
        print("[OK] SubjectResponse schema successfully serialized SQLAlchemy model (UUIDs, relationships).")
    except Exception as e:
        print(f"[FAIL] SubjectResponse serialization: {e}")

    # 9. Cascade Delete Behavior (Subject -> Unit)
    # The models use `cascade="all, delete-orphan"` and DB uses `ondelete='CASCADE'`
    # We should test DB layer cascade by calling subject_repo.delete()
    subject_repo.delete(subject)
    
    # Check if subject is gone
    if subject_repo.get_by_id(subject.id) is None:
        print("[OK] Subject successfully deleted.")
    else:
        print("[FAIL] Subject deletion failed.")
        
    # Check if units are gone
    remaining_units = unit_repo.get_by_subject_id(subject.id)
    if len(remaining_units) == 0:
        print("[OK] Subject -> Unit cascade deletion successfully wiped orphaned units.")
    else:
        print("[FAIL] Units were NOT deleted after Subject was deleted!")

    # Final cleanup just in case
    db.close()
    print("--- Verification Complete ---")

if __name__ == "__main__":
    verify()
