import uuid
from typing import Optional, List, Sequence
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
from app.subject.models import Subject, Unit, UnitTopic

class SubjectRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, subject_id: uuid.UUID) -> Optional[Subject]:
        stmt = select(Subject).where(Subject.id == subject_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_code(self, code: str) -> Optional[Subject]:
        stmt = select(Subject).where(Subject.code == code)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_all(self) -> Sequence[Subject]:
        stmt = select(Subject).order_by(Subject.name)
        return self.db.execute(stmt).scalars().all()

    def create(self, name: str, code: str, description: Optional[str] = None, faculty_id: Optional[uuid.UUID] = None) -> Optional[Subject]:
        db_subject = Subject(name=name, code=code, description=description, faculty_id=faculty_id)
        try:
            self.db.add(db_subject)
            self.db.commit()
            self.db.refresh(db_subject)
            return db_subject
        except IntegrityError:
            self.db.rollback()
            return None

    def update(self, subject: Subject, update_data: dict) -> Subject:
        for key, value in update_data.items():
            setattr(subject, key, value)
        try:
            self.db.commit()
            self.db.refresh(subject)
            return subject
        except IntegrityError:
            self.db.rollback()
            return None

    def delete(self, subject: Subject) -> None:
        self.db.delete(subject)
        self.db.commit()


class UnitRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, unit_id: uuid.UUID) -> Optional[Unit]:
        stmt = select(Unit).options(selectinload(Unit.topics)).where(Unit.id == unit_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_subject_id(self, subject_id: uuid.UUID) -> Sequence[Unit]:
        stmt = (select(Unit)
                .options(selectinload(Unit.topics))
                .where(Unit.subject_id == subject_id)
                .order_by(Unit.unit_number))
        return self.db.execute(stmt).scalars().all()

    def create(self, subject_id: uuid.UUID, unit_number: int, title: str, description: Optional[str] = None) -> Unit:
        db_unit = Unit(subject_id=subject_id, unit_number=unit_number, title=title, description=description)
        self.db.add(db_unit)
        self.db.commit()
        self.db.refresh(db_unit)
        return db_unit

    def update(self, unit: Unit, update_data: dict) -> Unit:
        for key, value in update_data.items():
            setattr(unit, key, value)
        self.db.commit()
        self.db.refresh(unit)
        return unit

    def delete(self, unit: Unit) -> None:
        self.db.delete(unit)
        self.db.commit()


class UnitTopicRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, topic_id: uuid.UUID) -> Optional[UnitTopic]:
        return self.db.execute(select(UnitTopic).where(UnitTopic.id == topic_id)).scalar_one_or_none()

    def get_by_unit_id(self, unit_id: uuid.UUID) -> Sequence[UnitTopic]:
        return self.db.execute(
            select(UnitTopic).where(UnitTopic.unit_id == unit_id).order_by(UnitTopic.order_index)
        ).scalars().all()

    def create(self, unit_id: uuid.UUID, title: str, description: Optional[str], order_index: int) -> UnitTopic:
        t = UnitTopic(unit_id=unit_id, title=title, description=description, order_index=order_index)
        self.db.add(t)
        self.db.commit()
        self.db.refresh(t)
        return t

    def update(self, topic: UnitTopic, data: dict) -> UnitTopic:
        for k, v in data.items():
            setattr(topic, k, v)
        self.db.commit()
        self.db.refresh(topic)
        return topic

    def delete(self, topic: UnitTopic) -> None:
        self.db.delete(topic)
        self.db.commit()
