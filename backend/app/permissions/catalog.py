"""
Permission catalog: every permission node the Role Matrix can edit, with its default roles.

Defaults reproduce QRepo's previous hardcoded RBAC exactly, so an empty role_permissions table
changes nothing. Admin always holds every permission (prevents lock-out). Students can never
be granted these nodes: every one of them exposes documents, answer keys or other staff data.
"""
from dataclasses import dataclass
from typing import FrozenSet, List
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT

STAFF_ROLES = frozenset({ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY})


@dataclass(frozen=True)
class PermissionNode:
    key: str
    label: str
    group: str
    default_roles: FrozenSet[str]
    grantable_roles: FrozenSet[str] = STAFF_ROLES


DOCUMENTS_UPLOAD = "documents.upload"
DOCUMENTS_DELETE = "documents.delete"
PAPERS_CREATE = "papers.create"
PAPERS_SUBMIT_REVIEW = "papers.submit_review"
PAPERS_APPROVE = "papers.approve"
ANALYTICS_VIEW = "analytics.view"
AI_GENERATE_QUESTIONS = "ai.generate_questions"

CATALOG: List[PermissionNode] = [
    PermissionNode(DOCUMENTS_UPLOAD, "Upload course documents", "Document Handling", STAFF_ROLES),
    PermissionNode(DOCUMENTS_DELETE, "Delete repository documents", "Document Handling", STAFF_ROLES),
    PermissionNode(PAPERS_CREATE, "Create and edit question papers", "Assessment Workflow", STAFF_ROLES),
    PermissionNode(PAPERS_SUBMIT_REVIEW, "Initiate paper review", "Assessment Workflow", STAFF_ROLES),
    PermissionNode(PAPERS_APPROVE, "Approve final papers", "Assessment Workflow", frozenset({ROLE_ADMIN, ROLE_HOD})),
    PermissionNode(ANALYTICS_VIEW, "View assessment analytics", "Assessment Workflow", STAFF_ROLES),
    PermissionNode(AI_GENERATE_QUESTIONS, "Generate draft questions with AI", "AI Capabilities", STAFF_ROLES),
]

BY_KEY = {node.key: node for node in CATALOG}

# Roles whose column is fixed in the matrix
LOCKED_ALLOWED_ROLES = frozenset({ROLE_ADMIN})
NEVER_GRANTABLE_ROLES = frozenset({ROLE_STUDENT})
