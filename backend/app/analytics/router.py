import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.ai.models import QuestionDraft
from app.analytics.service import ELIGIBLE, AnalyticsService
from app.api.dependencies import RequireRole
from app.auth.constants import ROLE_ADMIN
from app.auth.models import User
from app.db.init_db import get_db
from app.permissions.catalog import ANALYTICS_VIEW
from app.permissions.dependencies import RequirePermission
from app.shared.csv_export import csv_response
from app.shared.responses import APIResponse

analytics_router = APIRouter()


@analytics_router.get("/admin/overview", response_model=APIResponse[dict], summary="Admin dashboard KPIs")
def admin_overview(current_user: User = Depends(RequireRole([ROLE_ADMIN])), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Admin overview", data=AnalyticsService(db).admin_overview())


@analytics_router.get("/admin/activity", response_model=APIResponse[list], summary="Recent platform activity")
def admin_activity(limit: int = Query(20, ge=1, le=100), current_user: User = Depends(RequireRole([ROLE_ADMIN])),
                   db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Recent activity", data=AnalyticsService(db).activity(limit))


@analytics_router.get("/faculty/overview", response_model=APIResponse[dict],
                      summary="Question bank, AI generation and paper analytics for the user's subjects")
def faculty_overview(subject_id: Optional[uuid.UUID] = None,
                     current_user: User = Depends(RequirePermission(ANALYTICS_VIEW)), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Faculty analytics",
                       data=AnalyticsService(db).faculty_overview(current_user, subject_id))


@analytics_router.get("/faculty/heatmap/export", summary="Export the topic x Bloom level heatmap as CSV")
def export_heatmap(subject_id: Optional[uuid.UUID] = None,
                   current_user: User = Depends(RequirePermission(ANALYTICS_VIEW)), db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    subject_ids = [s.id for s in service.subject_scope(current_user, subject_id)]
    accepted = db.execute(select(QuestionDraft).where(QuestionDraft.subject_id.in_(subject_ids),
                                                      QuestionDraft.faculty_review_status.in_(ELIGIBLE))).scalars().all() \
        if subject_ids else []
    heatmap = service.topic_heatmap(accepted, limit=None)
    levels = heatmap["bloom_levels"]
    rows = [[r["topic"], *(r["counts"][lvl] for lvl in levels), r["total"]] for r in heatmap["rows"]]
    return csv_response("qrepo-topic-bloom-heatmap.csv", ["Topic", *[lvl.title() for lvl in levels], "Total"], rows)
