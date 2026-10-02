from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.init_db import get_db
from app.ai import get_provider
from app.ai.config import get_ai_settings
from app.ai.context import AcademicContextBuilder
from app.ai.provider import AIProvider
from app.ai.repository import AIGenerationRepository
from app.ai.review import DraftReviewService
from app.ai.services import QuestionGenerationService
from app.document.repository import DocumentRepository
from app.subject.repository import SubjectRepository, UnitRepository


def get_ai_provider() -> AIProvider:
    return get_provider()


def get_question_generation_service(
    db: Session = Depends(get_db),
    provider: AIProvider = Depends(get_ai_provider),
) -> QuestionGenerationService:
    context_builder = AcademicContextBuilder(
        subject_repo=SubjectRepository(db),
        unit_repo=UnitRepository(db),
        document_repo=DocumentRepository(db),
        max_chars=get_ai_settings().AI_CONTEXT_MAX_CHARS,
    )
    return QuestionGenerationService(provider, context_builder, AIGenerationRepository(db))


def get_draft_review_service(db: Session = Depends(get_db)) -> DraftReviewService:
    return DraftReviewService(AIGenerationRepository(db), SubjectRepository(db))
