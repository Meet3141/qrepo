import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.api.dependencies import RequireRole
from app.auth.constants import ROLE_ADMIN, ROLE_FACULTY, ROLE_HOD
from app.auth.models import User
from app.db.init_db import get_db
from app.papers.pdf import render_paper_pdf
from app.papers.schemas import (
    CommentCreate, PaperCreate, PaperDetail, PaperListResponse, PaperStatus, PaperUpdate, ReviewRequest, SubmitRequest,
)
from app.papers.service import PaperService
from app.permissions.catalog import PAPERS_APPROVE, PAPERS_CREATE, PAPERS_SUBMIT_REVIEW
from app.permissions.dependencies import RequirePermission
from app.shared.responses import APIResponse

papers_router = APIRouter()

# Students never see papers (answer keys, unreleased exams)
STAFF = RequireRole([ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY])


@papers_router.get("", response_model=APIResponse[PaperListResponse], summary="List papers visible to the user")
def list_papers(
    status_filter: Optional[PaperStatus] = Query(None, alias="status"),
    subject_id: Optional[uuid.UUID] = None,
    search: Optional[str] = Query(None, max_length=255),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(STAFF),
    db: Session = Depends(get_db),
):
    items, total, counts = PaperService(db).list(current_user, status_filter, subject_id, search, page, page_size)
    return APIResponse(success=True, message="Papers retrieved",
                       data=PaperListResponse(items=items, total=total, page=page, page_size=page_size,
                                              status_counts=counts))


@papers_router.post("", response_model=APIResponse[PaperDetail], status_code=status.HTTP_201_CREATED,
                    summary="Create a paper; questions are auto-selected from the blueprint unless listed explicitly")
def create_paper(data: PaperCreate, current_user: User = Depends(RequirePermission(PAPERS_CREATE)),
                 db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Paper created", data=PaperService(db).create(data, current_user))


@papers_router.get("/{paper_id}", response_model=APIResponse[PaperDetail], summary="Get a paper with questions and review thread")
def get_paper(paper_id: uuid.UUID, current_user: User = Depends(STAFF), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Paper retrieved", data=PaperService(db).get(paper_id, current_user))


@papers_router.put("/{paper_id}", response_model=APIResponse[PaperDetail],
                   summary="Edit paper details/blueprint; optionally rebuild or set questions (draft papers only)")
def update_paper(paper_id: uuid.UUID, data: PaperUpdate, current_user: User = Depends(RequirePermission(PAPERS_CREATE)),
                 db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Paper updated", data=PaperService(db).update(paper_id, data, current_user))


@papers_router.delete("/{paper_id}", response_model=APIResponse[None], summary="Delete a paper")
def delete_paper(paper_id: uuid.UUID, current_user: User = Depends(STAFF), db: Session = Depends(get_db)):
    PaperService(db).delete(paper_id, current_user)
    return APIResponse(success=True, message="Paper deleted")


@papers_router.post("/{paper_id}/submit", response_model=APIResponse[PaperDetail], summary="Submit a paper for HOD review")
def submit_paper(paper_id: uuid.UUID, data: SubmitRequest = SubmitRequest(),
                 current_user: User = Depends(RequirePermission(PAPERS_SUBMIT_REVIEW)), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Paper submitted for review",
                       data=PaperService(db).submit(paper_id, data, current_user))


@papers_router.post("/{paper_id}/review", response_model=APIResponse[PaperDetail],
                    summary="Approve, reject or request changes on a paper under review")
def review_paper(paper_id: uuid.UUID, data: ReviewRequest, current_user: User = Depends(RequirePermission(PAPERS_APPROVE)),
                 db: Session = Depends(get_db)):
    messages = {"APPROVE": "Paper approved", "REJECT": "Paper rejected", "REQUEST_CHANGES": "Changes requested"}
    return APIResponse(success=True, message=messages[data.decision.value],
                       data=PaperService(db).review(paper_id, data, current_user))


@papers_router.post("/{paper_id}/comments", response_model=APIResponse[PaperDetail], status_code=status.HTTP_201_CREATED,
                    summary="Post a comment on a paper")
def comment_on_paper(paper_id: uuid.UUID, data: CommentCreate, current_user: User = Depends(STAFF),
                     db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Comment posted",
                       data=PaperService(db).add_comment(paper_id, data, current_user))


@papers_router.get("/{paper_id}/pdf", summary="Download the paper as PDF (answer key optional)")
def download_pdf(paper_id: uuid.UUID, include_answers: bool = False, current_user: User = Depends(STAFF),
                 db: Session = Depends(get_db)):
    paper, subject = PaperService(db).get_for_export(paper_id, current_user)
    pdf = render_paper_pdf(paper, subject, include_answers=include_answers)
    slug = re.sub(r"[^A-Za-z0-9]+", "-", f"{subject.code}-{paper.title}").strip("-")[:80] or "paper"
    suffix = "-answer-key" if include_answers else ""
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{slug}{suffix}.pdf"'})
