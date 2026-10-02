"""
Question paper lifecycle:

    DRAFT ──submit──▶ PENDING_REVIEW ──approve──▶ APPROVED (finalized, frozen)
      ▲                    │  └────reject────▶ REJECTED (terminal)
      └──── resubmit ── CHANGES_REQUESTED ◀── request changes

Access: Admin/HOD see and manage all papers; Faculty see papers for subjects assigned to them
and papers they created. Reviewers cannot approve their own paper (Admin excepted).
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Sequence, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.ai.models import QuestionDraft
from app.ai.schemas import QUESTION_BANK_ELIGIBLE
from app.auth.constants import ROLE_ADMIN, ROLE_FACULTY, ROLE_HOD
from app.auth.models import User
from app.core.exceptions import AppException
from app.papers.builder import build_paper, distribution
from app.papers.models import Paper, PaperComment, PaperQuestion
from app.papers.schemas import (
    EDITABLE_STATUSES, CommentCreate, PaperBlueprint, CommentKind, CommentResponse, Distribution, PaperCreate, PaperDetail,
    PaperQuestionResponse, PaperStatus, PaperSummary, PaperUpdate, PersonRef, ReviewDecision, ReviewRequest,
    SubmitRequest,
)
from app.permissions.catalog import PAPERS_APPROVE, PAPERS_CREATE, PAPERS_SUBMIT_REVIEW
from app.permissions.service import PermissionService
from app.subject.models import Subject

QUESTION_FIELDS = ("question_text", "question_type", "topic", "difficulty", "bloom_level", "marks", "options",
                   "correct_option_index", "expected_answer", "explanation")
_DECISION = {
    ReviewDecision.APPROVE: (PaperStatus.APPROVED, CommentKind.APPROVED),
    ReviewDecision.REJECT: (PaperStatus.REJECTED, CommentKind.REJECTED),
    ReviewDecision.REQUEST_CHANGES: (PaperStatus.CHANGES_REQUESTED, CommentKind.CHANGES_REQUESTED),
}


def _role(user: User) -> Optional[str]:
    return user.role.name if user.role else None


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PaperService:
    def __init__(self, db: Session):
        self.db = db
        self.permissions = PermissionService(db)

    # ── Access ─────────────────────────────────────────────────────────

    def _subject(self, subject_id: uuid.UUID) -> Subject:
        subject = self.db.get(Subject, subject_id)
        if not subject:
            raise AppException("Subject not found", status_code=404)
        return subject

    def _can_view(self, paper: Paper, subject: Subject, actor: User) -> bool:
        role = _role(actor)
        if role in (ROLE_ADMIN, ROLE_HOD):
            return True
        return role == ROLE_FACULTY and (subject.faculty_id == actor.id or paper.created_by == actor.id)

    def _can_manage_subject(self, subject: Subject, actor: User) -> bool:
        role = _role(actor)
        return role in (ROLE_ADMIN, ROLE_HOD) or (role == ROLE_FACULTY and subject.faculty_id == actor.id)

    def _can_edit(self, paper: Paper, subject: Subject, actor: User) -> bool:
        return (PaperStatus(paper.status) in EDITABLE_STATUSES
                and self.permissions.has_permission(actor.role, PAPERS_CREATE)
                and (self._can_manage_subject(subject, actor) or paper.created_by == actor.id))

    def _can_review(self, paper: Paper, actor: User) -> bool:
        return (paper.status == PaperStatus.PENDING_REVIEW.value
                and self.permissions.has_permission(actor.role, PAPERS_APPROVE)
                and (paper.created_by != actor.id or _role(actor) == ROLE_ADMIN))

    def _can_submit(self, paper: Paper, subject: Subject, actor: User) -> bool:
        return (self._can_edit(paper, subject, actor) and bool(paper.questions)
                and self.permissions.has_permission(actor.role, PAPERS_SUBMIT_REVIEW))

    def _can_delete(self, paper: Paper, subject: Subject, actor: User) -> bool:
        if paper.status == PaperStatus.PENDING_REVIEW.value:
            return False  # reviewer is acting on it; request changes or reject first
        if paper.status == PaperStatus.APPROVED.value:
            return _role(actor) == ROLE_ADMIN
        return _role(actor) in (ROLE_ADMIN, ROLE_HOD) or paper.created_by == actor.id or subject.faculty_id == actor.id

    def _load(self, paper_id: uuid.UUID, actor: User) -> Tuple[Paper, Subject]:
        paper = self.db.execute(
            select(Paper).options(selectinload(Paper.questions), selectinload(Paper.comments)).where(Paper.id == paper_id)
        ).scalar_one_or_none()
        if not paper:
            raise AppException("Paper not found", status_code=404)
        subject = self._subject(paper.subject_id)
        if not self._can_view(paper, subject, actor):
            raise AppException("You do not have access to this paper", status_code=403)
        return paper, subject

    # ── Question selection ─────────────────────────────────────────────

    def _eligible_drafts(self, subject_id: uuid.UUID) -> List[QuestionDraft]:
        return list(self.db.execute(
            select(QuestionDraft).where(
                QuestionDraft.subject_id == subject_id,
                QuestionDraft.faculty_review_status.in_([s.value for s in QUESTION_BANK_ELIGIBLE]),
            )
        ).scalars().all())

    def _explicit_selection(self, subject_id: uuid.UUID, draft_ids: List[uuid.UUID]) -> List[QuestionDraft]:
        if len(set(draft_ids)) != len(draft_ids):
            raise AppException("question_draft_ids contains duplicates", status_code=422)
        drafts = {d.id: d for d in self._eligible_drafts(subject_id)}
        missing = [str(i) for i in draft_ids if i not in drafts]
        if missing:
            raise AppException(
                "Only faculty-accepted questions from this subject can be used: " + ", ".join(missing[:5]),
                status_code=422)
        return [drafts[i] for i in draft_ids]

    def _replace_questions(self, paper: Paper, drafts: Sequence[QuestionDraft]) -> None:
        paper.questions.clear()
        self.db.flush()
        for position, draft in enumerate(drafts, start=1):
            paper.questions.append(PaperQuestion(
                position=position, source_draft_id=draft.id, unit_id=draft.unit_id,
                **{f: getattr(draft, f) for f in QUESTION_FIELDS}))

    def _select(self, paper: Paper, blueprint, draft_ids: Optional[List[uuid.UUID]]) -> List[str]:
        if draft_ids:
            self._replace_questions(paper, self._explicit_selection(paper.subject_id, draft_ids))
            return []
        result = build_paper(self._eligible_drafts(paper.subject_id), blueprint)
        self._replace_questions(paper, result.selected)
        return result.warnings

    # ── Queries ────────────────────────────────────────────────────────

    def _people(self, ids) -> Dict[uuid.UUID, User]:
        ids = {i for i in ids if i}
        if not ids:
            return {}
        return {u.id: u for u in self.db.execute(select(User).where(User.id.in_(ids))).scalars().all()}

    def _summary(self, paper: Paper, subject: Optional[Subject], people: Dict) -> dict:
        creator = people.get(paper.created_by)
        return dict(
            id=paper.id, title=paper.title, subject_id=paper.subject_id,
            subject_code=subject.code if subject else None, subject_name=subject.name if subject else None,
            exam_type=paper.exam_type, duration_minutes=paper.duration_minutes, status=paper.status,
            version=paper.version, question_count=len(paper.questions),
            total_marks=round(sum(q.marks for q in paper.questions), 2),
            created_by=PersonRef.model_validate(creator) if creator else None,
            submitted_at=paper.submitted_at, reviewed_at=paper.reviewed_at,
            created_at=paper.created_at, updated_at=paper.updated_at,
        )

    def _scope_filter(self, stmt, actor: User):
        role = _role(actor)
        if role in (ROLE_ADMIN, ROLE_HOD):
            return stmt
        if role == ROLE_FACULTY:
            owned = select(Subject.id).where(Subject.faculty_id == actor.id)
            return stmt.where(or_(Paper.subject_id.in_(owned), Paper.created_by == actor.id))
        raise AppException("You do not have permission to view papers", status_code=403)

    def list(self, actor: User, status: Optional[PaperStatus] = None, subject_id: Optional[uuid.UUID] = None,
             search: Optional[str] = None, page: int = 1, page_size: int = 20):
        base = self._scope_filter(select(Paper), actor)
        if subject_id:
            base = base.where(Paper.subject_id == subject_id)
        if search:
            base = base.where(func.lower(Paper.title).like(f"%{search.strip().lower()}%"))

        status_counts = self._status_counts(base)

        stmt = base.where(Paper.status == status.value) if status else base
        total = self.db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
        papers = self.db.execute(
            stmt.options(selectinload(Paper.questions)).order_by(Paper.updated_at.desc())
            .offset((page - 1) * page_size).limit(page_size)
        ).scalars().all()
        subjects = {s.id: s for s in self.db.execute(
            select(Subject).where(Subject.id.in_({p.subject_id for p in papers}))).scalars().all()} if papers else {}
        people = self._people(p.created_by for p in papers)
        items = [PaperSummary(**self._summary(p, subjects.get(p.subject_id), people)) for p in papers]
        return items, total, status_counts

    def _status_counts(self, base) -> Dict[str, int]:
        sub = base.subquery()
        rows = self.db.execute(select(sub.c.status, func.count()).group_by(sub.c.status)).all()
        counts = {s.value: 0 for s in PaperStatus}
        counts.update({status: n for status, n in rows})
        return counts

    def detail(self, paper: Paper, subject: Subject, actor: User, warnings: Optional[List[str]] = None) -> PaperDetail:
        people = self._people([paper.created_by, paper.reviewed_by, *(c.author_id for c in paper.comments)])
        comments = [
            CommentResponse(id=c.id, kind=c.kind, body=c.body, paper_version=c.paper_version, created_at=c.created_at,
                            author=PersonRef.model_validate(people[c.author_id]) if c.author_id in people else None)
            for c in paper.comments
        ]
        reviewer = people.get(paper.reviewed_by)
        return PaperDetail(
            **self._summary(paper, subject, people),
            instructions=paper.instructions, blueprint=paper.blueprint,
            questions=[PaperQuestionResponse.model_validate(q) for q in paper.questions],
            comments=comments, distribution=Distribution(**distribution(paper.questions)),
            reviewed_by=PersonRef.model_validate(reviewer) if reviewer else None,
            warnings=warnings or [],
            can_edit=self._can_edit(paper, subject, actor), can_review=self._can_review(paper, actor),
            can_submit=self._can_submit(paper, subject, actor), can_delete=self._can_delete(paper, subject, actor),
        )

    def get(self, paper_id: uuid.UUID, actor: User) -> PaperDetail:
        paper, subject = self._load(paper_id, actor)
        return self.detail(paper, subject, actor)

    def get_for_export(self, paper_id: uuid.UUID, actor: User) -> Tuple[Paper, Subject]:
        return self._load(paper_id, actor)

    # ── Mutations ──────────────────────────────────────────────────────

    def create(self, data: PaperCreate, actor: User) -> PaperDetail:
        subject = self._subject(data.subject_id)
        if not self._can_manage_subject(subject, actor):
            raise AppException("You can only create papers for subjects assigned to you", status_code=403)
        paper = Paper(
            title=data.title, subject_id=subject.id, created_by=actor.id, exam_type=data.exam_type,
            duration_minutes=data.duration_minutes, instructions=data.instructions or None,
            blueprint=data.blueprint.model_dump(mode="json"), status=PaperStatus.DRAFT.value, version=1,
        )
        self.db.add(paper)
        self.db.flush()
        warnings = self._select(paper, data.blueprint, data.question_draft_ids)
        if not paper.questions:
            self.db.rollback()
            raise AppException(warnings[0] if warnings else "No questions could be selected", status_code=422)
        self.db.commit()
        paper, subject = self._load(paper.id, actor)
        return self.detail(paper, subject, actor, warnings)

    def update(self, paper_id: uuid.UUID, data: PaperUpdate, actor: User) -> PaperDetail:
        paper, subject = self._load(paper_id, actor)
        if not self._can_edit(paper, subject, actor):
            raise AppException(
                "This paper cannot be edited" + ("" if PaperStatus(paper.status) in EDITABLE_STATUSES
                                                 else f" while it is {paper.status.replace('_', ' ').lower()}"),
                status_code=409 if PaperStatus(paper.status) not in EDITABLE_STATUSES else 403)
        changes = data.model_dump(exclude_unset=True, exclude={"blueprint", "question_draft_ids", "rebuild"})
        for field, value in changes.items():
            if field == "instructions":
                paper.instructions = value or None
            elif value is not None:
                setattr(paper, field, value)
        warnings: List[str] = []
        if data.blueprint is not None:
            paper.blueprint = data.blueprint.model_dump(mode="json")
        if data.rebuild or data.question_draft_ids:
            blueprint = data.blueprint or PaperBlueprint.model_validate(paper.blueprint)
            warnings = self._select(paper, blueprint, data.question_draft_ids)
            if not paper.questions:
                self.db.rollback()
                raise AppException(warnings[0] if warnings else "No questions could be selected", status_code=422)
        self.db.commit()
        paper, subject = self._load(paper_id, actor)
        return self.detail(paper, subject, actor, warnings)

    def delete(self, paper_id: uuid.UUID, actor: User) -> None:
        paper, subject = self._load(paper_id, actor)
        if not self._can_delete(paper, subject, actor):
            if paper.status == PaperStatus.PENDING_REVIEW.value:
                raise AppException("A paper under review cannot be deleted", status_code=409)
            raise AppException("You do not have permission to delete this paper", status_code=403)
        self.db.delete(paper)
        self.db.commit()

    def submit(self, paper_id: uuid.UUID, data: SubmitRequest, actor: User) -> PaperDetail:
        paper, subject = self._load(paper_id, actor)
        if PaperStatus(paper.status) not in EDITABLE_STATUSES:
            raise AppException(f"Only draft papers can be submitted (status is {paper.status})", status_code=409)
        if not self._can_submit(paper, subject, actor):
            raise AppException("You do not have permission to submit this paper for review", status_code=403)
        if paper.status == PaperStatus.CHANGES_REQUESTED.value:
            paper.version += 1
        paper.status = PaperStatus.PENDING_REVIEW.value
        paper.submitted_at = _now()
        paper.reviewed_by = None
        paper.reviewed_at = None
        paper.comments.append(PaperComment(author_id=actor.id, kind=CommentKind.SUBMITTED.value,
                                           body=data.note or None, paper_version=paper.version))
        self.db.commit()
        paper, subject = self._load(paper_id, actor)
        return self.detail(paper, subject, actor)

    def review(self, paper_id: uuid.UUID, data: ReviewRequest, actor: User) -> PaperDetail:
        paper, subject = self._load(paper_id, actor)
        if paper.status != PaperStatus.PENDING_REVIEW.value:
            raise AppException(f"Only papers pending review can be reviewed (status is {paper.status})", status_code=409)
        if not self.permissions.has_permission(actor.role, PAPERS_APPROVE):
            raise AppException("You do not have permission to review papers", status_code=403)
        if paper.created_by == actor.id and _role(actor) != ROLE_ADMIN:
            raise AppException("You cannot review your own paper", status_code=403)
        new_status, kind = _DECISION[data.decision]
        paper.status = new_status.value
        paper.reviewed_by = actor.id
        paper.reviewed_at = _now()
        paper.comments.append(PaperComment(author_id=actor.id, kind=kind.value, body=data.comment or None,
                                           paper_version=paper.version))
        self.db.commit()
        paper, subject = self._load(paper_id, actor)
        return self.detail(paper, subject, actor)

    def add_comment(self, paper_id: uuid.UUID, data: CommentCreate, actor: User) -> PaperDetail:
        paper, subject = self._load(paper_id, actor)
        paper.comments.append(PaperComment(author_id=actor.id, kind=CommentKind.COMMENT.value, body=data.body,
                                           paper_version=paper.version))
        self.db.commit()
        paper, subject = self._load(paper_id, actor)
        return self.detail(paper, subject, actor)
