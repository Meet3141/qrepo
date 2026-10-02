from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.init_db import get_db
from app.subject.repository import SubjectRepository, UnitRepository, UnitTopicRepository
from app.auth.repository import UserRepository
from app.subject.service import SubjectService

def get_subject_service(db: Session = Depends(get_db)) -> SubjectService:
    subject_repo = SubjectRepository(db)
    unit_repo = UnitRepository(db)
    user_repo = UserRepository(db)
    return SubjectService(subject_repo, unit_repo, user_repo)

def get_unit_topic_repo(db: Session = Depends(get_db)) -> UnitTopicRepository:
    return UnitTopicRepository(db)
