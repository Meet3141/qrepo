import uuid
from typing import Sequence
from app.subject.repository import SubjectRepository, UnitRepository
from app.auth.repository import UserRepository
from app.subject.models import Subject, Unit
from app.subject.schemas import SubjectCreate, SubjectUpdate, UnitCreate, UnitUpdate
from app.core.exceptions import AppException
from app.auth.constants import ROLE_FACULTY, ROLE_ADMIN, ROLE_HOD
from app.auth.models import User

class SubjectService:
    def __init__(
        self,
        subject_repo: SubjectRepository,
        unit_repo: UnitRepository,
        user_repo: UserRepository
    ):
        self.subject_repo = subject_repo
        self.unit_repo = unit_repo
        self.user_repo = user_repo

    # -----------------------------
    # Faculty Validation Helpers
    # -----------------------------
    def _validate_faculty(self, faculty_id: uuid.UUID) -> None:
        user = self.user_repo.get_user_by_id(faculty_id)
        if not user:
            raise AppException("Faculty user not found", status_code=404)
        if not user.role or user.role.name != ROLE_FACULTY:
            raise AppException("Assigned user must have the Faculty role", status_code=400)

    def _verify_faculty_ownership(self, subject: Subject, current_user: User) -> None:
        """
        Enforces that if the current user is a Faculty, they can only manage 
        units for the subjects explicitly assigned to them.
        Admins and HODs inherently have global access.
        """
        # Global access roles can bypass this check
        if current_user.role and current_user.role.name in [ROLE_ADMIN, ROLE_HOD]:
            return
            
        # Faculty role checks
        if current_user.role and current_user.role.name == ROLE_FACULTY:
            if subject.faculty_id != current_user.id:
                raise AppException("You can only manage units for subjects assigned to you", status_code=403)
            return # Faculty is authorized

        # If it reaches here, the user is a Student or someone else entirely unauthorized to manage units
        raise AppException("You do not have permission to manage units", status_code=403)

    # -----------------------------
    # Subject Business Logic
    # -----------------------------
    def get_subject(self, subject_id: uuid.UUID) -> Subject:
        subject = self.subject_repo.get_by_id(subject_id)
        if not subject:
            raise AppException("Subject not found", status_code=404)
        return subject

    def get_subjects(self) -> Sequence[Subject]:
        return self.subject_repo.get_all()

    def create_subject(self, data: SubjectCreate) -> Subject:
        if data.faculty_id:
            self._validate_faculty(data.faculty_id)
            
        existing = self.subject_repo.get_by_code(data.code)
        if existing:
            raise AppException("Subject with this code already exists", status_code=400)
            
        subject = self.subject_repo.create(
            name=data.name,
            code=data.code,
            description=data.description,
            faculty_id=data.faculty_id
        )
        if not subject:
            raise AppException("Failed to create subject", status_code=500)
        return subject

    def update_subject(self, subject_id: uuid.UUID, data: SubjectUpdate) -> Subject:
        subject = self.get_subject(subject_id)
        
        update_data = data.model_dump(exclude_unset=True)
        
        if "faculty_id" in update_data and update_data["faculty_id"] is not None:
            self._validate_faculty(update_data["faculty_id"])
            
        if "code" in update_data and update_data["code"] != subject.code:
            existing = self.subject_repo.get_by_code(update_data["code"])
            if existing:
                raise AppException("Subject with this code already exists", status_code=400)
                
        updated_subject = self.subject_repo.update(subject, update_data)
        if not updated_subject:
            raise AppException("Failed to update subject", status_code=500)
            
        return updated_subject

    def delete_subject(self, subject_id: uuid.UUID) -> None:
        subject = self.get_subject(subject_id)
        self.subject_repo.delete(subject)


    # -----------------------------
    # Unit Business Logic
    # -----------------------------
    def get_unit(self, unit_id: uuid.UUID) -> Unit:
        unit = self.unit_repo.get_by_id(unit_id)
        if not unit:
            raise AppException("Unit not found", status_code=404)
        return unit

    def get_units_by_subject(self, subject_id: uuid.UUID) -> Sequence[Unit]:
        # Verifies subject exists first
        self.get_subject(subject_id)
        return self.unit_repo.get_by_subject_id(subject_id)

    def create_unit(self, subject_id: uuid.UUID, data: UnitCreate, current_user: User) -> Unit:
        subject = self.get_subject(subject_id)
        self._verify_faculty_ownership(subject, current_user)
        
        unit = self.unit_repo.create(
            subject_id=subject.id,
            unit_number=data.unit_number,
            title=data.title,
            description=data.description
        )
        return unit

    def update_unit(self, unit_id: uuid.UUID, data: UnitUpdate, current_user: User) -> Unit:
        unit = self.get_unit(unit_id)
        subject = self.get_subject(unit.subject_id)
        self._verify_faculty_ownership(subject, current_user)
        
        update_data = data.model_dump(exclude_unset=True)
        updated_unit = self.unit_repo.update(unit, update_data)
        return updated_unit

    def delete_unit(self, unit_id: uuid.UUID, current_user: User) -> None:
        unit = self.get_unit(unit_id)
        subject = self.get_subject(unit.subject_id)
        self._verify_faculty_ownership(subject, current_user)
        
        self.unit_repo.delete(unit)
