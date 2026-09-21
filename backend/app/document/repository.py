import uuid
from typing import Optional, Sequence, Any, Dict, Union
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.document.models import Document
from app.document.schemas import DocumentCreate, DocumentUpdate

class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, document_id: uuid.UUID) -> Optional[Document]:
        stmt = select(Document).where(Document.id == document_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_unit_id(self, unit_id: uuid.UUID) -> Sequence[Document]:
        stmt = select(Document).where(Document.unit_id == unit_id).order_by(Document.created_at.desc())
        return self.db.execute(stmt).scalars().all()

    def get_all(self) -> Sequence[Document]:
        stmt = select(Document).order_by(Document.created_at.desc())
        return self.db.execute(stmt).scalars().all()

    def create(self, document: DocumentCreate) -> Optional[Document]:
        db_document = Document(**document.model_dump())
        try:
            self.db.add(db_document)
            self.db.commit()
            self.db.refresh(db_document)
            return db_document
        except IntegrityError:
            self.db.rollback()
            return None

    def update(self, document: Document, update_data: Union[DocumentUpdate, Dict[str, Any]]) -> Optional[Document]:
        if isinstance(update_data, dict):
            update_dict = update_data
        else:
            update_dict = update_data.model_dump(exclude_unset=True)
            
        for key, value in update_dict.items():
            setattr(document, key, value)
        
        try:
            self.db.commit()
            self.db.refresh(document)
            return document
        except IntegrityError:
            self.db.rollback()
            return None

    def delete(self, document: Document) -> None:
        self.db.delete(document)
        self.db.commit()
