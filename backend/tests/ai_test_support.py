"""
Shared helpers for the AI test suites. Fully offline: Gemini is mocked, and persistence tests
use an in-memory SQLite database built from the real SQLAlchemy models.
"""
import json
import os
import sys
import uuid
from types import SimpleNamespace

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

# Core settings are required at import time by app.main; dummy values keep these tests DB-free
for _k, _v in {
    "DATABASE_URL": "sqlite://",
    "SECRET_KEY": "test-secret",
    "ALGORITHM": "HS256",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
}.items():
    os.environ.setdefault(_k, _v)

from google.genai import errors as genai_errors
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.ai.config import AISettings
from app.ai.exceptions import AIException
from app.ai.gemini import GeminiProvider
from app.ai.provider import AIProvider, ProviderHealth, ProviderResponse
from app.ai.schemas import QuestionGenerationRequest, QuestionType
from app.auth.constants import ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT
from app.db.base import Base
import app.main  # noqa: F401  registers every model on Base.metadata
from app.auth.models import Role, User
from app.subject.models import Subject, Unit
from app.document.models import Document

FAKE_KEY = "AIzaFAKE-test-key-0123456789"
FAKE_MODEL = "gemini-test-model"
TOPIC = "Binary search trees"


def make_settings(**overrides) -> AISettings:
    values = dict(GEMINI_API_KEY=FAKE_KEY, GEMINI_MODEL=FAKE_MODEL, GEMINI_RETRY_BASE_DELAY_SECONDS=0.01,
                  GEMINI_RETRY_MAX_DELAY_SECONDS=0.05)
    values.update(overrides)
    return AISettings(_env_file=None, **values)


def make_request(**overrides) -> QuestionGenerationRequest:
    values = dict(
        subject_id=uuid.uuid4(), unit_id=None, topic=TOPIC,
        target_audience="Second-year B.Tech CSE", question_type="MCQ",
        difficulty="MEDIUM", bloom_level="APPLY",
        mark_distribution={"2": 5}
    )
    if "number_of_questions" in overrides:
        # Translate to mark_distribution for legacy test overrides
        n = overrides.pop("number_of_questions")
        marks = overrides.pop("marks_per_question", None)
        if marks is None:
            qtype = overrides.get("question_type", values["question_type"])
            marks = {"MCQ": 2, "TRUE_FALSE": 1, "SHORT_ANSWER": 5, "LONG_ANSWER": 10}.get(qtype, 2)
        if "mark_distribution" not in overrides:
            overrides["mark_distribution"] = {str(marks): n}
    values.update(overrides)
    return QuestionGenerationRequest(**values)


# --------------------------------------------------------------------------
# Valid, mutually distinct questions for each type
# --------------------------------------------------------------------------

_STEMS = [
    ("What is the worst-case time complexity of searching an unbalanced binary search tree with n nodes?",
     ["O(1)", "O(log n)", "O(n)", "O(n log n)"], 2),
    ("Which traversal of a binary search tree visits the keys in ascending sorted order?",
     ["Pre-order", "In-order", "Post-order", "Level-order"], 1),
    ("When deleting a node with two children from a binary search tree, which node usually replaces it?",
     ["Its parent", "Its in-order successor", "The root", "Its left child's left child"], 1),
    ("Inserting the keys 10, 20, 30 and 40 in that order into an empty binary search tree produces which shape?",
     ["A complete tree", "A right-skewed chain", "A left-skewed chain", "A perfectly balanced tree"], 1),
    ("Which ordering property must hold at every node of a binary search tree?",
     ["Left subtree keys < node key < right subtree keys", "Both children are leaves",
      "The tree height is at most log n", "Keys are stored only in leaves"], 0),
    ("How many levels does a perfectly balanced binary search tree containing fifteen nodes have?",
     ["Three", "Four", "Five", "Fifteen"], 1),
]


def question(i: int, qtype: str = "MCQ", **overrides) -> dict:
    text, options, answer = _STEMS[i % len(_STEMS)]
    q = dict(question_text=text, question_type=qtype, topic=TOPIC, difficulty="MEDIUM", bloom_level="APPLY",
             marks=2, options=None, correct_option_index=None, expected_answer=None,
             explanation="Follows directly from the binary search tree ordering invariant.")
    if qtype == "MCQ":
        q.update(options=list(options), correct_option_index=answer)
    elif qtype == "TRUE_FALSE":
        q.update(question_text=f"True or false: {text[0].lower()}{text[1:-1]} is determined by key order.",
                 options=["True", "False"], correct_option_index=0, marks=1)
    elif qtype == "SHORT_ANSWER":
        q.update(expected_answer=f"Answer: {options[answer]}, because of the BST ordering property.", marks=5)
    elif qtype == "LONG_ANSWER":
        q.update(expected_answer=(f"Model answer: {options[answer]}. A complete answer defines the binary search tree "
                                  "invariant, walks through a worked example, and analyses time complexity."), marks=10)
    q.update(overrides)
    return q


def questions(n: int = 5, qtype: str = "MCQ") -> list:
    return [question(i, qtype) for i in range(n)]


def batch_json(items) -> str:
    return json.dumps({"questions": list(items)})


def valid_output(request: QuestionGenerationRequest) -> str:
    qtype = request.question_type.value
    items = [question(i, qtype, difficulty=request.difficulty.value, bloom_level=request.bloom_level.value,
                      topic=request.topic) for i in range(request.number_of_questions)]
    return batch_json(items)


# --------------------------------------------------------------------------
# Provider fakes
# --------------------------------------------------------------------------

def api_error(code: int, message: str = "error", status: str = "ERROR"):
    cls = genai_errors.ClientError if 400 <= code < 500 else genai_errors.ServerError
    return cls(code, {"error": {"code": code, "message": message, "status": status}})


def gemini_response(text=None, finish_reason: str = "STOP", candidates=True):
    cands = [SimpleNamespace(finish_reason=SimpleNamespace(value=finish_reason))] if candidates else []
    return SimpleNamespace(text=text, candidates=cands, prompt_feedback=None)


class FakeModels:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    def get(self, model):
        outcome = self.outcomes.pop(0) if self.outcomes else None
        if isinstance(outcome, Exception):
            raise outcome
        return SimpleNamespace(name=model)


def make_provider(outcomes, sleeps=None, **settings_overrides):
    client = SimpleNamespace(models=FakeModels(outcomes))
    sleeps = sleeps if sleeps is not None else []
    provider = GeminiProvider(make_settings(**settings_overrides), client=client, sleep=sleeps.append)
    return provider, client.models, sleeps


class ScriptedProvider(AIProvider):
    """Returns (or raises) scripted outcomes in order; records every prompt it receives."""
    name = "stub"
    model = "stub-model"

    def __init__(self, *outcomes, attempts_per_call: int = 1):
        self.outcomes = list(outcomes)
        self.prompts = []
        self.attempts_per_call = attempts_per_call

    def generate_questions(self, prompt):
        self.prompts.append(prompt)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, AIException):
            outcome.attempts = outcome.attempts or self.attempts_per_call
            raise outcome
        return ProviderResponse(raw_json=outcome, provider=self.name, model=self.model,
                                latency_ms=5, attempts=self.attempts_per_call)

    def health_check(self):
        return ProviderHealth(available=True, provider=self.name, model=self.model, latency_ms=1)


def user(role, user_id=None):
    return SimpleNamespace(id=user_id or uuid.uuid4(), is_active=True, role=SimpleNamespace(name=role))


# --------------------------------------------------------------------------
# Repository fakes (context-engine unit tests)
# --------------------------------------------------------------------------

class FakeRepo:
    def __init__(self, items=()):
        self.items = {i.id: i for i in items}

    def get_by_id(self, item_id):
        return self.items.get(item_id)

    def get_all(self):
        return list(self.items.values())


class FakeDocumentRepo:
    def __init__(self, documents=()):
        self.documents = list(documents)

    def get_by_unit_id(self, unit_id):
        return [d for d in self.documents if d.unit_id == unit_id]


def fake_doc(unit_id, text, status="COMPLETED", name="notes.pdf"):
    return SimpleNamespace(id=uuid.uuid4(), unit_id=unit_id, processing_status=status,
                           extracted_text=text, file_name=name)


# --------------------------------------------------------------------------
# Real SQLite database built from the production models
# --------------------------------------------------------------------------

class SqliteWorld:
    """In-memory database seeded with roles, users, two subjects, units and documents."""

    def __init__(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        db = self.Session()

        roles = {name: Role(name=name) for name in (ROLE_ADMIN, ROLE_HOD, ROLE_FACULTY, ROLE_STUDENT)}
        db.add_all(roles.values())
        db.flush()

        def mk_user(email, role):
            u = User(email=email, hashed_password="x", role_id=roles[role].id, is_active=True)
            db.add(u)
            return u

        self.admin = mk_user("admin@ai.test", ROLE_ADMIN)
        self.hod = mk_user("hod@ai.test", ROLE_HOD)
        self.faculty = mk_user("faculty@ai.test", ROLE_FACULTY)
        self.other_faculty = mk_user("faculty2@ai.test", ROLE_FACULTY)
        self.student = mk_user("student@ai.test", ROLE_STUDENT)
        db.flush()

        self.subject = Subject(name="Data Structures", code="CS201", faculty_id=self.faculty.id)
        self.other_subject = Subject(name="Computer Networks", code="CS301", faculty_id=self.other_faculty.id)
        db.add_all([self.subject, self.other_subject])
        db.flush()

        self.unit = Unit(subject_id=self.subject.id, unit_number=3, title="Trees",
                         description="Binary search trees, AVL trees and traversals")
        self.other_unit = Unit(subject_id=self.other_subject.id, unit_number=1, title="OSI model")
        db.add_all([self.unit, self.other_unit])
        db.flush()

        relevant = ("A binary search tree keeps keys ordered: every key in the left subtree is smaller than the node "
                    "and every key in the right subtree is larger. In-order traversal of a binary search tree "
                    "therefore yields sorted keys.")
        irrelevant = "Hash tables use a hash function to map keys to buckets and resolve collisions by chaining."
        self.documents = [
            Document(unit_id=self.unit.id, file_name="trees.pdf", file_type="application/pdf", file_size=10,
                     storage_path="media/documents/trees.pdf", processing_status="COMPLETED",
                     extracted_text=f"{irrelevant}\n\n{relevant}", uploaded_by=self.faculty.id),
            Document(unit_id=self.unit.id, file_name="draft.pdf", file_type="application/pdf", file_size=10,
                     storage_path="media/documents/draft.pdf", processing_status="PENDING",
                     extracted_text="PENDING DOCUMENT TEXT", uploaded_by=self.faculty.id),
        ]
        db.add_all(self.documents)
        db.commit()

        self.ids = SimpleNamespace(
            admin=self.admin.id, hod=self.hod.id, faculty=self.faculty.id, other_faculty=self.other_faculty.id,
            student=self.student.id, subject=self.subject.id, other_subject=self.other_subject.id,
            unit=self.unit.id, other_unit=self.other_unit.id,
            documents=[d.id for d in self.documents],
        )
        db.close()

    def session(self):
        return self.Session()

    def close(self):
        self.engine.dispose()
