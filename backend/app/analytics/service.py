"""
Dashboard and analytics aggregations, computed from real QRepo records only.

QRepo does not record student attempts or marks, so there are no student-performance metrics
here; faculty analytics describe the question bank, AI generation outcomes and papers.
"""
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.models import AIGeneration, DraftFeedback, QuestionDraft
from app.ai.schemas import QUESTION_BANK_ELIGIBLE
from app.auth.constants import ROLE_ADMIN, ROLE_FACULTY, ROLE_HOD
from app.auth.models import Role, User
from app.core.config import settings
from app.core.exceptions import AppException
from app.department.models import Department
from app.document.models import Document
from app.papers.builder import BLOOM_ORDER, DIFFICULTY_ORDER, balanced_bloom_mix
from app.papers.models import Paper, PaperComment, PaperQuestion
from app.subject.models import Subject, Unit

TREND_DAYS = 14
TREND_WEEKS = 8
HEATMAP_TOPICS = 12
ELIGIBLE = sorted(s.value for s in QUESTION_BANK_ELIGIBLE)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """SQLite returns naive datetimes for timezone-aware columns; treat them as UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _pct(part: int, whole: int) -> Optional[float]:
    return round(part / whole, 3) if whole else None


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def _count(self, model, *where) -> int:
        stmt = select(func.count()).select_from(model)
        for clause in where:
            stmt = stmt.where(clause)
        return self.db.execute(stmt).scalar_one()

    # ── Admin ──────────────────────────────────────────────────────────

    def admin_overview(self) -> dict:
        now = _now()
        users = self.db.execute(select(User.is_active, User.created_at, Role.name)
                                .join(Role, User.role_id == Role.id, isouter=True)).all()
        documents = self.db.execute(select(Document.processing_status, Document.file_size)).all()
        generations = self.db.execute(select(AIGeneration.status, AIGeneration.latency_ms, AIGeneration.created_at,
                                             AIGeneration.questions_returned)).all()

        doc_status = Counter(s for s, _ in documents)
        storage_bytes = sum(size or 0 for _, size in documents)
        quota = settings.STORAGE_QUOTA_BYTES

        day0 = (now - timedelta(days=TREND_DAYS - 1)).date()
        trend = {day0 + timedelta(days=i): {"success": 0, "failed": 0, "latencies": []} for i in range(TREND_DAYS)}
        last_24h = [g for g in generations if _aware(g.created_at) >= now - timedelta(hours=24)]
        last_7d = [g for g in generations if _aware(g.created_at) >= now - timedelta(days=7)]
        for g in generations:
            day = _aware(g.created_at).date()
            if day in trend:
                trend[day]["success" if g.status == "SUCCESS" else "failed"] += 1
                trend[day]["latencies"].append(g.latency_ms)

        return {
            "users": {
                "total": len(users),
                "active": sum(1 for u in users if u.is_active),
                "new_last_7_days": sum(1 for u in users if _aware(u.created_at) >= now - timedelta(days=7)),
                "by_role": dict(Counter(u.name or "None" for u in users)),
            },
            "departments": self._count(Department),
            "subjects": self._count(Subject),
            "units": self._count(Unit),
            "documents": {
                "total": len(documents),
                "by_status": dict(doc_status),
                "storage_bytes": storage_bytes,
                "storage_quota_bytes": quota,
                "storage_used_ratio": round(storage_bytes / quota, 4) if quota else None,
            },
            "ai": {
                "generations_last_24h": len(last_24h),
                "failed_last_24h": sum(1 for g in last_24h if g.status != "SUCCESS"),
                "avg_latency_ms_last_7_days": round(sum(g.latency_ms for g in last_7d) / len(last_7d)) if last_7d else None,
                "success_rate_last_7_days": _pct(sum(1 for g in last_7d if g.status == "SUCCESS"), len(last_7d)),
                "questions_generated_total": sum(g.questions_returned or 0 for g in generations),
                "trend": [
                    {"date": d.isoformat(), "success": v["success"], "failed": v["failed"],
                     "avg_latency_ms": round(sum(v["latencies"]) / len(v["latencies"])) if v["latencies"] else None}
                    for d, v in sorted(trend.items())
                ],
            },
            "papers": {"by_status": dict(Counter(s for (s,) in self.db.execute(select(Paper.status)).all()))},
        }

    def activity(self, limit: int = 20) -> List[dict]:
        """Recent platform events merged from existing tables (newest first)."""
        events: List[dict] = []
        emails = {}

        def who(user_id) -> Optional[str]:
            if user_id is None:
                return None
            if user_id not in emails:
                user = self.db.get(User, user_id)
                emails[user_id] = user.email if user else None
            return emails[user_id]

        for user, role in self.db.execute(select(User, Role.name).join(Role, User.role_id == Role.id, isouter=True)
                                          .order_by(User.created_at.desc()).limit(limit)).all():
            events.append({"type": "user_created", "severity": "info", "at": _aware(user.created_at),
                           "message": f"New user: {user.email} ({role or 'no role'})", "actor": None})
        for doc in self.db.execute(select(Document).order_by(Document.created_at.desc()).limit(limit)).scalars():
            events.append({"type": "document_uploaded", "severity": "info", "at": _aware(doc.created_at),
                           "message": f"Document uploaded: {doc.file_name}", "actor": who(doc.uploaded_by)})
            if doc.processing_status == "FAILED":
                events.append({"type": "document_failed", "severity": "error",
                               "at": _aware(doc.processed_at or doc.updated_at),
                               "message": f"Document processing failed: {doc.file_name}", "actor": None})
        for g in self.db.execute(select(AIGeneration).order_by(AIGeneration.created_at.desc()).limit(limit)).scalars():
            topic = (g.parameters_json or {}).get("topic", "")
            if g.status == "SUCCESS":
                message, severity = f"AI generated {g.questions_returned} questions on '{topic}'", "info"
            else:
                message, severity = f"AI generation {g.status.lower()} for '{topic}' ({g.error_category or 'error'})", "warning"
            events.append({"type": "ai_generation", "severity": severity, "at": _aware(g.created_at),
                           "message": message, "actor": who(g.requested_by)})
        paper_kinds = {"SUBMITTED": "submitted for review", "APPROVED": "approved", "REJECTED": "rejected",
                       "CHANGES_REQUESTED": "returned for changes"}
        rows = self.db.execute(select(PaperComment, Paper.title).join(Paper, PaperComment.paper_id == Paper.id)
                               .where(PaperComment.kind.in_(list(paper_kinds))).order_by(PaperComment.created_at.desc())
                               .limit(limit)).all()
        for comment, title in rows:
            events.append({"type": f"paper_{comment.kind.lower()}",
                           "severity": "warning" if comment.kind == "REJECTED" else "info",
                           "at": _aware(comment.created_at), "message": f"Paper '{title}' {paper_kinds[comment.kind]}",
                           "actor": who(comment.author_id)})
        events.sort(key=lambda e: e["at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return events[:limit]

    # ── Faculty / HOD analytics ────────────────────────────────────────

    def subject_scope(self, actor: User, subject_id: Optional[uuid.UUID]) -> List[Subject]:
        role = actor.role.name if actor.role else None
        if subject_id:
            subject = self.db.get(Subject, subject_id)
            if not subject:
                raise AppException("Subject not found", status_code=404)
            if role == ROLE_FACULTY and subject.faculty_id != actor.id:
                raise AppException("You can only view analytics for subjects assigned to you", status_code=403)
            return [subject]
        stmt = select(Subject).order_by(Subject.code)
        if role == ROLE_FACULTY:
            stmt = stmt.where(Subject.faculty_id == actor.id)
        elif role not in (ROLE_ADMIN, ROLE_HOD):
            raise AppException("You do not have permission to view analytics", status_code=403)
        return list(self.db.execute(stmt).scalars().all())

    def faculty_overview(self, actor: User, subject_id: Optional[uuid.UUID] = None) -> dict:
        subjects = self.subject_scope(actor, subject_id)
        subject_ids = [s.id for s in subjects]
        drafts = self.db.execute(select(QuestionDraft).where(QuestionDraft.subject_id.in_(subject_ids))).scalars().all() \
            if subject_ids else []
        generations = self.db.execute(select(AIGeneration.status).where(AIGeneration.subject_id.in_(subject_ids))).all() \
            if subject_ids else []
        papers = self.db.execute(select(Paper).where(Paper.subject_id.in_(subject_ids))).scalars().all() \
            if subject_ids else []
        paper_questions = self.db.execute(
            select(PaperQuestion).join(Paper, PaperQuestion.paper_id == Paper.id)
            .where(Paper.subject_id.in_(subject_ids), Paper.status != "REJECTED")
        ).scalars().all() if subject_ids else []
        reasons = Counter(r for (r,) in self.db.execute(
            select(DraftFeedback.rejection_reason).join(QuestionDraft, DraftFeedback.draft_id == QuestionDraft.id)
            .where(QuestionDraft.subject_id.in_(subject_ids), DraftFeedback.rejection_reason.is_not(None))
        ).all()) if subject_ids else Counter()

        accepted = [d for d in drafts if d.faculty_review_status in ELIGIBLE]
        rejected = [d for d in drafts if d.faculty_review_status == "REJECTED"]
        pending = [d for d in drafts if d.faculty_review_status == "DRAFT"]
        reviewed = len(accepted) + len(rejected)
        quality = [d.quality_score for d in drafts if d.quality_score is not None]

        bank_bloom = {lvl: 0 for lvl in BLOOM_ORDER} | dict(Counter(d.bloom_level for d in accepted))
        paper_bloom = {lvl: 0 for lvl in BLOOM_ORDER} | dict(Counter(q.bloom_level for q in paper_questions))
        bank_diff = {lvl: 0 for lvl in DIFFICULTY_ORDER} | dict(Counter(d.difficulty for d in accepted))
        paper_diff = {lvl: 0 for lvl in DIFFICULTY_ORDER} | dict(Counter(q.difficulty for q in paper_questions))
        paper_status = Counter(p.status for p in papers)

        result = {
            "scope": {"subject_id": str(subject_id) if subject_id else None, "subject_count": len(subjects),
                      "subjects": [{"id": str(s.id), "code": s.code, "name": s.name} for s in subjects]},
            "kpis": {
                "questions_generated": len(drafts),
                "questions_accepted": len(accepted),
                "questions_rejected": len(rejected),
                "questions_pending_review": len(pending),
                "acceptance_rate": _pct(len(accepted), reviewed),
                "avg_quality_score": round(sum(quality) / len(quality), 3) if quality else None,
                "generations_total": len(generations),
                "generations_failed": sum(1 for (s,) in generations if s != "SUCCESS"),
                "papers_total": len(papers),
                "papers_approved": paper_status.get("APPROVED", 0),
                "papers_pending_review": paper_status.get("PENDING_REVIEW", 0),
            },
            "bloom_distribution": {"question_bank": bank_bloom, "papers": paper_bloom},
            "difficulty_distribution": {"question_bank": bank_diff, "papers": paper_diff},
            "trend": self._weekly_trend(drafts),
            "topic_heatmap": self.topic_heatmap(accepted),
            "rejection_reasons": dict(reasons.most_common()),
        }
        result["insights"] = self._insights(result, subjects, accepted, subject_id)
        return result

    @staticmethod
    def _weekly_trend(drafts: Iterable[QuestionDraft]) -> List[dict]:
        today = _now().date()
        start = today - timedelta(days=today.weekday()) - timedelta(weeks=TREND_WEEKS - 1)
        weeks: Dict[date, Counter] = {start + timedelta(weeks=i): Counter() for i in range(TREND_WEEKS)}
        for d in drafts:
            created = _aware(d.created_at).date()
            week = created - timedelta(days=created.weekday())
            if week in weeks:
                weeks[week]["generated"] += 1
                if d.faculty_review_status in ELIGIBLE:
                    weeks[week]["accepted"] += 1
        return [{"week_start": w.isoformat(), "generated": c["generated"], "accepted": c["accepted"]}
                for w, c in sorted(weeks.items())]

    @staticmethod
    def topic_heatmap(accepted: Iterable[QuestionDraft], limit: Optional[int] = HEATMAP_TOPICS) -> dict:
        """Accepted questions per topic x Bloom level: shows which cognitive levels each topic covers."""
        cells: Dict[str, Counter] = defaultdict(Counter)
        labels: Dict[str, str] = {}
        for d in accepted:
            key = " ".join(d.topic.lower().split())
            labels.setdefault(key, d.topic.strip())
            cells[key][d.bloom_level] += 1
        rows = sorted(cells.items(), key=lambda kv: (-sum(kv[1].values()), kv[0]))
        if limit:
            rows = rows[:limit]
        return {
            "bloom_levels": BLOOM_ORDER,
            "rows": [{"topic": labels[k], "counts": {lvl: c.get(lvl, 0) for lvl in BLOOM_ORDER},
                      "total": sum(c.values())} for k, c in rows],
        }

    def _insights(self, data: dict, subjects: List[Subject], accepted: List[QuestionDraft],
                  subject_id: Optional[uuid.UUID]) -> List[dict]:
        k = data["kpis"]
        insights: List[dict] = []
        if k["questions_generated"] == 0:
            return [{"severity": "info", "title": "No questions yet",
                     "message": "Generate and review AI questions to see analytics for your subjects."}]

        bank = data["bloom_distribution"]["question_bank"]
        total = sum(bank.values())
        if total >= 10:
            top_level, top_count = max(bank.items(), key=lambda kv: kv[1])
            share = top_count / total
            higher_order = sum(bank[lvl] for lvl in ("ANALYZE", "EVALUATE", "CREATE")) / total
            # Suggest a balanced paper for the subject with the most accepted questions
            per_subject = Counter(d.subject_id for d in accepted)
            target = subject_id or (per_subject.most_common(1)[0][0] if per_subject else None)
            action = None
            if target is not None and per_subject.get(target, 0) >= 5:
                action = {"type": "generate_balanced_paper", "subject_id": str(target),
                          "blueprint": {"question_count": min(10, per_subject[target]), "bloom_mix": balanced_bloom_mix()}}
            if share > 0.4:
                insights.append({"severity": "suggestion", "title": "Bloom levels are skewed",
                                 "message": f"{share:.0%} of accepted questions are {top_level.title()}. "
                                            "A balanced paper spreads questions across all six Bloom levels.",
                                 "action": action})
            elif higher_order < 0.15:
                insights.append({"severity": "suggestion", "title": "Few higher-order questions",
                                 "message": f"Only {higher_order:.0%} of accepted questions target Analyze, Evaluate "
                                            "or Create. Consider generating questions at those levels.",
                                 "action": action})
        reviewed = k["questions_accepted"] + k["questions_rejected"]
        if reviewed >= 10 and (k["acceptance_rate"] or 0) < 0.5:
            reasons = data["rejection_reasons"]
            top = next(iter(reasons), None)
            insights.append({"severity": "warning", "title": "Low acceptance rate",
                             "message": f"Only {k['acceptance_rate']:.0%} of reviewed AI questions were accepted"
                                        + (f"; the most common rejection reason is {top.replace('_', ' ').lower()}."
                                           if top else ".")})
        if k["questions_pending_review"] >= 20:
            insights.append({"severity": "info", "title": "Review backlog",
                             "message": f"{k['questions_pending_review']} AI questions are awaiting review."})
        if k["generations_total"] >= 5 and k["generations_failed"] / k["generations_total"] > 0.3:
            insights.append({"severity": "warning", "title": "Frequent generation failures",
                             "message": f"{k['generations_failed']} of {k['generations_total']} AI generations failed. "
                                        "Check AI configuration or try narrower topics."})
        return insights
