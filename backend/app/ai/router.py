import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.dependencies import RequireRole
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY
from app.auth.models import User
from app.ai.dependencies import get_ai_provider, get_draft_review_service, get_question_generation_service
from app.ai.models import AIGeneration
from app.ai.provider import AIProvider
from app.ai.review import DraftReviewService
from app.ai.schemas import (
    AIHealthResponse,
    DraftReviewRequest,
    GenerationMetadataPublic,
    GenerationSummaryResponse,
    QuestionDraftResponse,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
)
from app.ai.services import QuestionGenerationService
from app.permissions.catalog import AI_GENERATE_QUESTIONS
from app.permissions.dependencies import RequirePermission
from app.shared.responses import APIResponse

ai_router = APIRouter()

# Students never reach generation, drafts or answer keys
AI_ROLES = [ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY]


def to_generation_response(generation: AIGeneration) -> QuestionGenerationResponse:
    return QuestionGenerationResponse(
        generation_id=generation.id,
        status=generation.status,
        validation_status=generation.validation_status,
        quality_score=generation.quality_score,
        prompt_version=generation.prompt_version,
        model=generation.model_name,
        parameters=generation.parameters_json,
        questions=[QuestionDraftResponse.model_validate(d) for d in generation.drafts],
        metadata=GenerationMetadataPublic(
            generated_at=generation.created_at,
            latency_ms=generation.latency_ms,
            questions_requested=generation.question_count,
            questions_returned=generation.questions_returned,
            generation_attempts=generation.generation_attempts,
            repair_attempted=generation.repair_attempted,
            context_available=generation.context_available,
            context_truncated=generation.context_truncated,
            context_sections_used=generation.context_sections_used,
        ),
    )


@ai_router.post(
    "/questions/generate",
    response_model=APIResponse[QuestionGenerationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Generate validated question drafts for faculty review"
)
def generate_questions(
    request: QuestionGenerationRequest,
    current_user: User = Depends(RequirePermission(AI_GENERATE_QUESTIONS)),
    service: QuestionGenerationService = Depends(get_question_generation_service),
):
    # Sync endpoint: the provider call blocks, so FastAPI runs it in the threadpool
    generation = service.generate(request, current_user)
    return APIResponse(success=True, message="Questions generated successfully",
                       data=to_generation_response(generation))


@ai_router.get(
    "/generations",
    response_model=APIResponse[List[GenerationSummaryResponse]],
    summary="List recent generations visible to the current user"
)
def list_generations(
    subject_id: Optional[uuid.UUID] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(RequireRole(AI_ROLES)),
    service: DraftReviewService = Depends(get_draft_review_service),
):
    generations = service.list_generations(current_user, subject_id, limit)
    data = [
        GenerationSummaryResponse(
            generation_id=g.id, subject_id=g.subject_id, unit_id=g.unit_id, status=g.status,
            validation_status=g.validation_status, quality_score=g.quality_score,
            question_count=g.question_count, parameters=g.parameters_json, created_at=g.created_at,
        )
        for g in generations
    ]
    return APIResponse(success=True, message="Generations retrieved", data=data)


@ai_router.get(
    "/generations/{generation_id}",
    response_model=APIResponse[QuestionGenerationResponse],
    summary="Get a generation with its question drafts"
)
def get_generation(
    generation_id: uuid.UUID,
    current_user: User = Depends(RequireRole(AI_ROLES)),
    service: DraftReviewService = Depends(get_draft_review_service),
):
    generation = service.get_generation(generation_id, current_user)
    return APIResponse(success=True, message="Generation retrieved", data=to_generation_response(generation))


@ai_router.post(
    "/drafts/{draft_id}/review",
    response_model=APIResponse[QuestionDraftResponse],
    summary="Accept, edit or reject a question draft (stores faculty feedback)"
)
def review_draft(
    draft_id: uuid.UUID,
    request: DraftReviewRequest,
    current_user: User = Depends(RequireRole(AI_ROLES)),
    service: DraftReviewService = Depends(get_draft_review_service),
):
    draft = service.review(draft_id, request, current_user)
    return APIResponse(success=True, message="Review saved", data=QuestionDraftResponse.model_validate(draft))


@ai_router.get(
    "/health",
    response_model=APIResponse[AIHealthResponse],
    summary="Check AI provider availability (Admin only)"
)
def ai_health(
    current_user: User = Depends(RequireRole([ROLE_ADMIN])),
    provider: AIProvider = Depends(get_ai_provider),
):
    health = provider.health_check()
    data = AIHealthResponse(available=health.available, latency_ms=health.latency_ms,
                            error_category=health.error_category)
    return APIResponse(success=True, message="AI provider health", data=data)
