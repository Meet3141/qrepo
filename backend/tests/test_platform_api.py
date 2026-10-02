"""
Platform APIs: user management, departments & faculty, permission matrix, question papers
(build, review workflow, comments, PDF) and analytics.

Runs against an in-memory SQLite database built from the production models, through the real
API wiring with real JWTs (only the DB session is substituted).

    cd backend && python -m pytest tests/test_platform_api.py -v
"""
import csv
import io
import random
import unittest
import uuid

from ai_test_support import SqliteWorld

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.ai.models import AIGeneration, QuestionDraft
from app.auth.models import User
from app.core.security import create_access_token, get_password_hash
from app.papers.builder import allocate, build_paper, dedupe
from app.papers.models import Paper
from app.papers.schemas import PaperBlueprint

WORDS = ("heap stack queue graph trie hash array list tree node edge vertex cycle path sort merge quick "
         "bubble radix bucket search binary linear index pointer memory cache page frame thread process lock "
         "mutex signal socket packet router switch protocol header payload checksum parity buffer stream "
         "token parser lexer grammar compiler linker loader kernel driver interrupt register").split()


def distinct_text(i: int) -> str:
    words = random.Random(i).sample(WORDS, 9)  # deterministic, genuinely varied wording
    return " ".join(words).capitalize() + "?"


class PlatformTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.main import app
        from app.db.init_db import get_db
        cls.app = app
        cls.get_db = staticmethod(get_db)  # a plain function on a class would become a bound method
        cls.client = TestClient(app)

    def setUp(self):
        self.world = SqliteWorld()
        self.ids = self.world.ids

        def override_db():
            db = self.world.session()
            try:
                yield db
            finally:
                db.close()

        self.app.dependency_overrides[self.get_db] = override_db
        self.as_user(self.ids.admin)

    def tearDown(self):
        self.app.dependency_overrides.clear()
        self.world.close()

    # helpers ---------------------------------------------------------------

    def as_user(self, user_id):
        self.token = create_access_token(subject=str(user_id))

    def req(self, method, url, **kwargs):
        headers = {"Authorization": f"Bearer {self.token}"}
        return self.client.request(method, f"/api/v1{url}", headers=headers, **kwargs)

    def ok(self, method, url, status=200, **kwargs):
        resp = self.req(method, url, **kwargs)
        self.assertEqual(resp.status_code, status, resp.text)
        return resp.json()["data"]

    def db(self):
        return self.world.session()

    def seed_bank(self, specs, subject_id=None, unit_id=None, requested_by=None, topic="Data structures", start=0):
        """specs: list of (difficulty, bloom_level, review_status[, question_type])."""
        db = self.db()
        generation = AIGeneration(
            requested_by=requested_by or self.ids.faculty, subject_id=subject_id or self.ids.subject,
            unit_id=unit_id or self.ids.unit, parameters_json={"topic": topic}, prompt_version="question_generation_v1",
            provider="stub", model_name="stub-model", status="SUCCESS", validation_status="PASS",
            question_count=len(specs), questions_returned=len(specs), quality_score=0.9,
            generation_attempts=1, provider_calls=1, repair_attempted=False, latency_ms=1200,
            context_available=True, context_chars=100, context_truncated=False, context_sections_used=1)
        db.add(generation)
        db.flush()
        ids = []
        for i, spec in enumerate(specs, start=start):
            difficulty, bloom, review = spec[:3]
            qtype = spec[3] if len(spec) > 3 else "MCQ"
            q = dict(question_text=distinct_text(i), question_type=qtype, topic=topic, difficulty=difficulty,
                     bloom_level=bloom, marks=2.0,
                     options=["A one", "B two", "C three", "D four"] if qtype == "MCQ" else None,
                     correct_option_index=1 if qtype == "MCQ" else None,
                     expected_answer=None if qtype == "MCQ" else "Model answer text for marking.",
                     explanation="Because of the invariant.")
            draft = QuestionDraft(generation_id=generation.id, subject_id=generation.subject_id, unit_id=generation.unit_id,
                                  position=i + 1, quality_score=0.5 + (i % 5) / 10, quality_signals={},
                                  validation_status="PASS", faculty_review_status=review, ai_original=q, **q)
            db.add(draft)
            db.flush()
            ids.append(draft.id)
        db.commit()
        db.close()
        return ids

    def make_user(self, email, role, **extra):
        db = self.db()
        from app.auth.models import Role
        role_id = db.execute(select(Role.id).where(Role.name == role)).scalar_one()
        user = User(email=email, hashed_password=get_password_hash("Pass123!"), role_id=role_id, is_active=True, **extra)
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()
        return user_id


# ═══════════════════════════════════════════════════════════════════════════
# Users
# ═══════════════════════════════════════════════════════════════════════════

class UserManagementTests(PlatformTestCase):
    def test_only_admins_manage_users(self):
        for user_id in (self.ids.hod, self.ids.faculty, self.ids.student):
            self.as_user(user_id)
            with self.subTest(user=user_id):
                self.assertEqual(self.req("GET", "/users").status_code, 403)
                self.assertEqual(self.req("POST", "/users", json={"email": "x@y.com", "password": "Pass123!",
                                                                    "role": "Faculty"}).status_code, 403)
        self.assertEqual(self.client.get("/api/v1/users").status_code, 401)

    def test_list_search_filter_and_paginate(self):
        data = self.ok("GET", "/users?page_size=2")
        self.assertEqual((data["total"], len(data["items"]), data["page_size"]), (5, 2, 2))
        self.assertEqual(self.ok("GET", "/users?role=Faculty")["total"], 2)
        self.assertEqual([u["email"] for u in self.ok("GET", "/users?search=STUDENT")["items"]], ["student@ai.test"])
        self.assertTrue(all("hashed_password" not in u for u in data["items"]))

    def test_create_user_and_login(self):
        created = self.ok("POST", "/users", 201, json={"email": "New.Prof@qrepo.edu", "password": "Secret12!",
                                                        "full_name": "  Dr. New  ", "role": "HOD"})
        self.assertEqual((created["role"]["name"], created["full_name"], created["is_active"]), ("HOD", "Dr. New", True))
        login = self.client.post("/api/v1/auth/login", json={"email": "New.Prof@qrepo.edu", "password": "Secret12!"})
        self.assertEqual(login.status_code, 200)

    def test_create_validation(self):
        self.ok("POST", "/users", 201, json={"email": "taken@qrepo.edu", "password": "Pass123!", "role": "Faculty"})
        cases = [
            ({"email": "TAKEN@QRepo.edu", "password": "Pass123!", "role": "Faculty"}, 409),  # case-insensitive duplicate
            ({"email": "weak@qrepo.edu", "password": "password", "role": "Faculty"}, 422),
            ({"email": "role@qrepo.edu", "password": "Pass123!", "role": "Overlord"}, 422),
            ({"email": "dept@qrepo.edu", "password": "Pass123!", "role": "Faculty", "department_id": str(uuid.uuid4())}, 404),
            ({"email": "extra@qrepo.edu", "password": "Pass123!", "role": "Faculty", "is_superuser": True}, 422),
        ]
        for body, status in cases:
            with self.subTest(body=body):
                self.assertEqual(self.req("POST", "/users", json=body).status_code, status)

    def test_update_role_status_and_password(self):
        user = self.ok("POST", "/users", 201, json={"email": "learner@qrepo.edu", "password": "Pass123!", "role": "Student"})
        updated = self.ok("PUT", f"/users/{user['id']}", json={"role": "Faculty", "is_active": False,
                                                                "password": "Changed1!"})
        self.assertEqual((updated["role"]["name"], updated["is_active"]), ("Faculty", False))
        login = self.client.post("/api/v1/auth/login", json={"email": "learner@qrepo.edu", "password": "Changed1!"})
        self.assertEqual(login.status_code, 403)  # correct password, but deactivated

    def test_admin_lockout_guards(self):
        self.assertEqual(self.req("PUT", f"/users/{self.ids.admin}", json={"role": "Faculty"}).status_code, 409)
        self.assertEqual(self.req("PUT", f"/users/{self.ids.admin}", json={"is_active": False}).status_code, 409)
        self.assertEqual(self.req("DELETE", f"/users/{self.ids.admin}").status_code, 409)
        # With a second admin, the first can be demoted by the second
        second = self.make_user("admin2@ai.test", "Admin")
        self.as_user(second)
        self.ok("PUT", f"/users/{self.ids.admin}", json={"role": "HOD"})
        self.assertEqual(self.req("PUT", f"/users/{second}", json={"is_active": False}).status_code, 409)

    def test_delete_only_without_records(self):
        fresh = self.make_user("fresh@ai.test", "Student")
        self.ok("DELETE", f"/users/{fresh}")
        self.assertEqual(self.req("GET", f"/users/{fresh}").status_code, 404)
        resp = self.req("DELETE", f"/users/{self.ids.faculty}")  # assigned a subject + uploaded documents
        self.assertEqual(resp.status_code, 409)
        self.assertIn("Deactivate", resp.json()["message"])

    def test_export_csv_neutralises_formulas(self):
        self.ok("POST", "/users", 201, json={"email": "csv@qrepo.edu", "password": "Pass123!", "role": "Student",
                                             "full_name": "=HYPERLINK(\"http://evil\")"})
        resp = self.req("GET", "/users/export")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/csv", resp.headers["content-type"])
        rows = list(csv.reader(io.StringIO(resp.content.decode("utf-8-sig"))))
        self.assertEqual(rows[0][:3], ["Email", "Name", "Role"])
        self.assertIn("'=HYPERLINK(\"http://evil\")", [r[1] for r in rows])

    def test_roles_listing(self):
        self.assertEqual([r["name"] for r in self.ok("GET", "/roles")], ["Admin", "HOD", "Faculty", "Student"])
        self.as_user(self.ids.student)
        self.assertEqual(self.req("GET", "/roles").status_code, 403)


# ═══════════════════════════════════════════════════════════════════════════
# Departments & faculty
# ═══════════════════════════════════════════════════════════════════════════

class DepartmentTests(PlatformTestCase):
    def create_dept(self, **overrides):
        body = {"name": "Computer Science", "code": "cse", "hod_id": str(self.ids.hod)}
        body.update(overrides)
        return self.ok("POST", "/departments", 201, json=body)

    def test_create_list_counts(self):
        dept = self.create_dept()
        self.assertEqual((dept["code"], dept["hod"]["email"]), ("CSE", "hod@ai.test"))
        self.ok("PUT", f"/users/{self.ids.faculty}", json={"department_id": dept["id"]})
        [listed] = self.ok("GET", "/departments")
        # faculty member + HOD (auto-joined); the faculty member's subject counts for the department
        self.assertEqual((listed["faculty_count"], listed["member_count"], listed["subject_count"]), (1, 2, 1))

    def test_validation(self):
        self.create_dept()
        self.assertEqual(self.req("POST", "/departments", json={"name": "computer science", "code": "X1"}).status_code, 409)
        self.assertEqual(self.req("POST", "/departments", json={"name": "Other", "code": "CSE"}).status_code, 409)
        self.assertEqual(self.req("POST", "/departments", json={"name": "Maths", "code": "MTH",
                                                                "hod_id": str(self.ids.faculty)}).status_code, 422)
        self.assertEqual(self.req("POST", "/departments", json={"name": "Physics", "code": "PHY",
                                                                "hod_id": str(self.ids.hod)}).status_code, 409)
        self.assertEqual(self.req("POST", "/departments", json={"name": "Bad", "code": "has space"}).status_code, 422)

    def test_update_and_delete_keeps_members(self):
        dept = self.create_dept()
        self.ok("PUT", f"/users/{self.ids.faculty}", json={"department_id": dept["id"]})
        updated = self.ok("PUT", f"/departments/{dept['id']}", json={"name": "CSE Dept", "hod_id": None})
        self.assertEqual((updated["name"], updated["hod"]), ("CSE Dept", None))
        self.ok("DELETE", f"/departments/{dept['id']}")
        self.assertIsNone(self.ok("GET", f"/users/{self.ids.faculty}")["department"])

    def test_hod_reads_but_cannot_administer(self):
        dept = self.create_dept()
        self.as_user(self.ids.hod)
        self.assertEqual(len(self.ok("GET", "/departments")), 1)
        self.assertEqual(self.req("POST", "/departments", json={"name": "X", "code": "XX"}).status_code, 403)
        self.assertEqual(self.req("DELETE", f"/departments/{dept['id']}").status_code, 403)
        self.as_user(self.ids.faculty)
        self.assertEqual(self.req("GET", "/departments").status_code, 403)

    def test_export(self):
        self.create_dept()
        rows = list(csv.reader(io.StringIO(self.req("GET", "/departments/export").content.decode("utf-8-sig"))))
        self.assertEqual(rows[1][:3], ["CSE", "Computer Science", "hod@ai.test"])


class FacultyManagementTests(PlatformTestCase):
    def setUp(self):
        super().setUp()
        self.dept = self.ok("POST", "/departments", 201, json={"name": "CSE", "code": "CSE", "hod_id": str(self.ids.hod)})
        self.other = self.ok("POST", "/departments", 201, json={"name": "ECE", "code": "ECE"})
        self.ok("PUT", f"/users/{self.ids.faculty}", json={"department_id": self.dept["id"]})
        self.ok("PUT", f"/users/{self.ids.other_faculty}", json={"department_id": self.other["id"]})

    def test_hod_sees_only_own_department(self):
        self.as_user(self.ids.hod)
        data = self.ok("GET", "/faculty")
        self.assertEqual([f["email"] for f in data["items"]], ["faculty@ai.test"])
        self.assertEqual([d["code"] for d in data["departments"]], ["CSE"])
        self.assertEqual(self.req("GET", f"/faculty?department_id={self.other['id']}").status_code, 403)
        self.as_user(self.ids.admin)
        self.assertEqual(len(self.ok("GET", "/faculty")["items"]), 2)

    def test_hod_without_department_sees_nobody(self):
        other_hod = self.make_user("hod2@ai.test", "HOD")
        self.as_user(other_hod)
        self.assertEqual(self.ok("GET", "/faculty")["items"], [])

    def test_stats_reflect_real_activity(self):
        self.seed_bank([("EASY", "REMEMBER", "VALIDATED"), ("MEDIUM", "APPLY", "REJECTED"), ("HARD", "ANALYZE", "DRAFT")])
        self.as_user(self.ids.hod)
        [row] = self.ok("GET", "/faculty")["items"]
        self.assertEqual((row["subjects_assigned"], row["questions_generated"], row["questions_accepted"],
                          row["acceptance_rate"]), (1, 3, 1, 0.5))

    def test_hod_adds_and_manages_faculty(self):
        self.as_user(self.ids.hod)
        added = self.ok("POST", "/faculty", 201, json={"email": "newfac@qrepo.edu", "full_name": "New Faculty",
                                                       "password": "Pass123!"})
        self.assertEqual(added["department_id"], self.dept["id"])  # defaults to the HOD's department
        self.assertEqual(self.req("POST", "/faculty", json={"email": "x@qrepo.edu", "full_name": "X Y", "password": "Pass123!",
                                                            "department_id": self.other["id"]}).status_code, 403)
        deactivated = self.ok("PATCH", f"/faculty/{added['id']}", json={"is_active": False})
        self.assertFalse(deactivated["is_active"])
        self.assertEqual(self.req("PATCH", f"/faculty/{self.ids.other_faculty}", json={"is_active": False}).status_code, 403)
        self.assertEqual(self.req("PATCH", f"/faculty/{added['id']}", json={"department_id": self.other["id"]}).status_code, 403)
        self.assertEqual(self.req("PATCH", f"/faculty/{self.ids.student}", json={"is_active": False}).status_code, 404)

    def test_faculty_and_students_cannot_manage_faculty(self):
        for user_id in (self.ids.faculty, self.ids.student):
            self.as_user(user_id)
            self.assertEqual(self.req("GET", "/faculty").status_code, 403)

    def test_export(self):
        self.as_user(self.ids.hod)
        resp = self.req("GET", "/faculty/export")
        rows = list(csv.reader(io.StringIO(resp.content.decode("utf-8-sig"))))
        self.assertEqual(rows[0][0:2], ["Name", "Email"])
        self.assertEqual([r[1] for r in rows[1:]], ["faculty@ai.test"])


# ═══════════════════════════════════════════════════════════════════════════
# Permission matrix
# ═══════════════════════════════════════════════════════════════════════════

class PermissionMatrixTests(PlatformTestCase):
    def cell(self, matrix, key, role):
        row = next(r for r in matrix["permissions"] if r["key"] == key)
        return next(c for c in row["cells"] if c["role"] == role)

    def test_defaults_match_previous_rbac(self):
        m = self.ok("GET", "/permissions/matrix")
        self.assertEqual([r["name"] for r in m["roles"]], ["Admin", "HOD", "Faculty", "Student"])
        self.assertTrue(self.cell(m, "documents.upload", "Faculty")["allowed"])
        self.assertFalse(self.cell(m, "papers.approve", "Faculty")["allowed"])
        self.assertTrue(self.cell(m, "papers.approve", "HOD")["allowed"])
        admin, student = self.cell(m, "papers.approve", "Admin"), self.cell(m, "documents.upload", "Student")
        self.assertEqual((admin["allowed"], admin["editable"]), (True, False))
        self.assertEqual((student["allowed"], student["editable"]), (False, False))

    def test_save_is_enforced(self):
        # Revoke AI generation from Faculty: the generate endpoint now refuses them
        self.ok("PUT", "/permissions/matrix", json={"changes": [{"permission": "ai.generate_questions", "role": "Faculty",
                                                                 "allowed": False}]})
        self.as_user(self.ids.faculty)
        body = {"subject_id": str(self.ids.subject), "topic": "Trees", "target_audience": "UG",
                "question_type": "MCQ", "difficulty": "EASY", "bloom_level": "APPLY"}
        self.assertEqual(self.req("POST", "/ai/questions/generate", json=body).status_code, 403)
        self.assertNotIn("ai.generate_questions", self.ok("GET", "/permissions/me"))
        # Revoke document upload too
        self.as_user(self.ids.admin)
        self.ok("PUT", "/permissions/matrix", json={"changes": [{"permission": "documents.upload", "role": "Faculty",
                                                                 "allowed": False}]})
        self.as_user(self.ids.faculty)
        resp = self.req("POST", f"/units/{self.ids.unit}/documents", files={"file": ("a.txt", b"hi", "text/plain")})
        self.assertEqual(resp.status_code, 403)

    def test_invalid_changes_rejected(self):
        for change in ({"permission": "papers.approve", "role": "Admin", "allowed": False},
                       {"permission": "papers.approve", "role": "Student", "allowed": True},
                       {"permission": "nuke.everything", "role": "HOD", "allowed": True},
                       {"permission": "papers.approve", "role": "Reviewer", "allowed": True}):
            with self.subTest(change=change):
                self.assertEqual(self.req("PUT", "/permissions/matrix", json={"changes": [change]}).status_code, 422)

    def test_reset_and_admin_only(self):
        self.ok("PUT", "/permissions/matrix", json={"changes": [{"permission": "papers.approve", "role": "Faculty",
                                                                 "allowed": True}]})
        m = self.ok("GET", "/permissions/matrix")
        self.assertFalse(self.cell(m, "papers.approve", "Faculty")["is_default"])
        m = self.ok("POST", "/permissions/matrix/reset")
        self.assertFalse(self.cell(m, "papers.approve", "Faculty")["allowed"])
        self.as_user(self.ids.hod)
        self.assertEqual(self.req("GET", "/permissions/matrix").status_code, 403)
        self.assertIn("papers.approve", self.ok("GET", "/permissions/me"))


# ═══════════════════════════════════════════════════════════════════════════
# Papers
# ═══════════════════════════════════════════════════════════════════════════

BALANCED_BANK = [(d, b, "VALIDATED") for d in ("EASY", "MEDIUM", "HARD")
                 for b in ("REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE")] * 2


class PaperBuilderTests(unittest.TestCase):
    def test_allocate_largest_remainder(self):
        self.assertEqual(allocate(10, {"EASY": 30, "MEDIUM": 50, "HARD": 20}), {"EASY": 3, "MEDIUM": 5, "HARD": 2})
        self.assertEqual(sum(allocate(7, {"A": 33, "B": 33, "C": 34}).values()), 7)

    def test_dedupe_keeps_best_and_drops_near_duplicates(self):
        from types import SimpleNamespace as NS
        a = NS(id=1, question_text="What is the height of a balanced binary tree?", quality_score=0.6, created_at=1)
        b = NS(id=2, question_text="What is the height of a balanced binary tree ?", quality_score=0.9, created_at=2)
        c = NS(id=3, question_text="Define a hash collision.", quality_score=0.5, created_at=3)
        self.assertEqual([d.id for d in dedupe([a, b, c])], [2, 3])


class PaperWorkflowTests(PlatformTestCase):
    def create_paper(self, status=201, **overrides):
        body = {"title": "Midterm DS", "subject_id": str(self.ids.subject), "exam_type": "Midterm",
                "duration_minutes": 90, "blueprint": {"question_count": 10}}
        body.update(overrides)
        resp = self.req("POST", "/papers", json=body)
        self.assertEqual(resp.status_code, status, resp.text)
        return resp.json()["data"]

    def setUp(self):
        super().setUp()
        self.accepted = self.seed_bank(BALANCED_BANK)
        self.pending = self.seed_bank([("EASY", "REMEMBER", "DRAFT"), ("EASY", "REMEMBER", "REJECTED")], start=100)
        self.as_user(self.ids.faculty)

    def test_balanced_build_uses_only_accepted_questions(self):
        paper = self.create_paper(blueprint={"question_count": 10,
                                             "difficulty_mix": {"EASY": 30, "MEDIUM": 50, "HARD": 20}})
        self.assertEqual(paper["status"], "DRAFT")
        self.assertEqual(paper["question_count"], 10)
        self.assertEqual(paper["distribution"]["difficulty"], {"EASY": 30.0, "MEDIUM": 50.0, "HARD": 20.0})
        self.assertEqual(paper["distribution"]["total_marks"], 20.0)
        used = {q["source_draft_id"] for q in paper["questions"]}
        self.assertTrue(used <= {str(i) for i in self.accepted})
        self.assertFalse(used & {str(i) for i in self.pending})
        self.assertEqual(len({q["question_text"] for q in paper["questions"]}), 10)
        # ordered easy -> hard
        order = [q["difficulty"] for q in paper["questions"]]
        self.assertEqual(order, sorted(order, key=["EASY", "MEDIUM", "HARD"].index))

    def test_bloom_mix_and_determinism(self):
        mix = {"REMEMBER": 20, "UNDERSTAND": 20, "APPLY": 20, "ANALYZE": 20, "EVALUATE": 10, "CREATE": 10}
        a = self.create_paper(blueprint={"question_count": 10, "bloom_mix": mix})
        b = self.create_paper(blueprint={"question_count": 10, "bloom_mix": mix})
        self.assertEqual(a["distribution"]["bloom"], {k: float(v) for k, v in mix.items()})
        self.assertEqual([q["source_draft_id"] for q in a["questions"]], [q["source_draft_id"] for q in b["questions"]])

    def test_shortfall_warnings_and_empty_bank(self):
        paper = self.create_paper(blueprint={"question_count": 50})
        self.assertEqual(paper["question_count"], 36)
        self.assertTrue(any("Only 36 of 50" in w for w in paper["warnings"]))
        resp = self.req("POST", "/papers", json={"title": "Empty", "subject_id": str(self.ids.subject),
                                                 "blueprint": {"question_types": ["LONG_ANSWER"]}})
        self.assertEqual(resp.status_code, 422)
        self.assertIn("No accepted questions", resp.json()["message"])

    def test_blueprint_validation(self):
        for blueprint in ({"difficulty_mix": {"EASY": 50, "HARD": 20}}, {"bloom_mix": {"APPLY": 101}},
                          {"question_count": 0}, {"magic": True}):
            with self.subTest(blueprint=blueprint):
                self.assertEqual(self.req("POST", "/papers", json={"title": "Bad", "subject_id": str(self.ids.subject),
                                                                   "blueprint": blueprint}).status_code, 422)

    def test_explicit_selection_requires_accepted_questions(self):
        paper = self.create_paper(question_draft_ids=[str(i) for i in self.accepted[:3]])
        self.assertEqual([q["source_draft_id"] for q in paper["questions"]], [str(i) for i in self.accepted[:3]])
        self.create_paper(422, question_draft_ids=[str(self.pending[0])])
        self.create_paper(422, question_draft_ids=[str(self.accepted[0])] * 2)

    def test_snapshot_is_immutable(self):
        paper = self.create_paper(question_draft_ids=[str(self.accepted[0])])
        db = self.db()
        draft = db.get(QuestionDraft, self.accepted[0])
        draft.question_text = "CHANGED AFTER BUILD"
        db.commit()
        db.close()
        self.assertNotEqual(self.ok("GET", f"/papers/{paper['id']}")["questions"][0]["question_text"], "CHANGED AFTER BUILD")

    def test_access_scoping(self):
        paper = self.create_paper()
        self.as_user(self.ids.other_faculty)
        self.assertEqual(self.req("GET", f"/papers/{paper['id']}").status_code, 403)
        self.assertEqual(self.ok("GET", "/papers")["total"], 0)
        self.create_paper(403)  # not their subject
        self.as_user(self.ids.student)
        for method, url in (("GET", "/papers"), ("GET", f"/papers/{paper['id']}"), ("GET", f"/papers/{paper['id']}/pdf"),
                            ("POST", "/papers")):
            self.assertEqual(self.req(method, url, json={}).status_code, 403, url)
        self.as_user(self.ids.hod)
        listing = self.ok("GET", "/papers")
        self.assertEqual((listing["total"], listing["status_counts"]["DRAFT"]), (1, 1))

    def test_edit_rebuild_and_metadata(self):
        paper = self.create_paper()
        updated = self.ok("PUT", f"/papers/{paper['id']}", json={
            "title": "Midterm DS (v2)", "duration_minutes": 120, "instructions": "Answer all.",
            "blueprint": {"question_count": 6, "difficulty_mix": {"HARD": 100}}, "rebuild": True})
        self.assertEqual((updated["title"], updated["duration_minutes"], updated["question_count"]),
                         ("Midterm DS (v2)", 120, 6))
        self.assertEqual(updated["distribution"]["difficulty"]["HARD"], 100.0)
        self.assertEqual(self.req("PUT", f"/papers/{paper['id']}",
                                  json={"rebuild": True, "question_draft_ids": [str(self.accepted[0])]}).status_code, 422)

    def test_full_review_workflow(self):
        paper = self.create_paper()
        pid = paper["id"]
        self.assertTrue(paper["can_submit"])
        submitted = self.ok("POST", f"/papers/{pid}/submit", json={"note": "Ready for review"})
        self.assertEqual((submitted["status"], submitted["can_edit"]), ("PENDING_REVIEW", False))
        self.assertEqual(self.req("PUT", f"/papers/{pid}", json={"title": "Sneaky edit"}).status_code, 409)
        self.assertEqual(self.req("DELETE", f"/papers/{pid}").status_code, 409)
        self.assertEqual(self.req("POST", f"/papers/{pid}/review", json={"decision": "APPROVE"}).status_code, 403)

        self.as_user(self.ids.hod)
        self.assertTrue(self.ok("GET", f"/papers/{pid}")["can_review"])
        self.assertEqual(self.req("POST", f"/papers/{pid}/review", json={"decision": "REJECT"}).status_code, 422)
        changes = self.ok("POST", f"/papers/{pid}/review",
                          json={"decision": "REQUEST_CHANGES", "comment": "Add more HARD analysis questions"})
        self.assertEqual(changes["status"], "CHANGES_REQUESTED")
        self.ok("POST", f"/papers/{pid}/comments", 201, json={"body": "See unit 3 syllabus."})

        self.as_user(self.ids.faculty)
        self.ok("PUT", f"/papers/{pid}", json={"blueprint": {"question_count": 8}, "rebuild": True})
        resubmitted = self.ok("POST", f"/papers/{pid}/submit")
        self.assertEqual((resubmitted["status"], resubmitted["version"]), ("PENDING_REVIEW", 2))

        self.as_user(self.ids.hod)
        approved = self.ok("POST", f"/papers/{pid}/review", json={"decision": "APPROVE", "comment": "Looks good"})
        self.assertEqual((approved["status"], approved["reviewed_by"]["email"]), ("APPROVED", "hod@ai.test"))
        self.assertEqual([c["kind"] for c in approved["comments"]],
                         ["SUBMITTED", "CHANGES_REQUESTED", "COMMENT", "SUBMITTED", "APPROVED"])
        self.assertEqual(self.req("POST", f"/papers/{pid}/review", json={"decision": "APPROVE"}).status_code, 409)

        self.as_user(self.ids.faculty)
        self.assertEqual(self.req("PUT", f"/papers/{pid}", json={"title": "After approval"}).status_code, 409)
        self.assertEqual(self.req("DELETE", f"/papers/{pid}").status_code, 403)
        self.as_user(self.ids.admin)
        self.ok("DELETE", f"/papers/{pid}")

    def test_reviewers_cannot_approve_their_own_paper(self):
        self.as_user(self.ids.hod)
        paper = self.create_paper()
        self.ok("POST", f"/papers/{paper['id']}/submit")
        self.assertFalse(self.ok("GET", f"/papers/{paper['id']}")["can_review"])
        self.assertEqual(self.req("POST", f"/papers/{paper['id']}/review", json={"decision": "APPROVE"}).status_code, 403)

    def test_matrix_can_grant_faculty_approval(self):
        # HOD drafts a paper for the faculty member's subject and submits it
        self.as_user(self.ids.hod)
        paper = self.create_paper()
        self.ok("POST", f"/papers/{paper['id']}/submit")
        # By default the subject's faculty member can see it but not approve it
        self.as_user(self.ids.faculty)
        self.assertFalse(self.ok("GET", f"/papers/{paper['id']}")["can_review"])
        self.assertEqual(self.req("POST", f"/papers/{paper['id']}/review", json={"decision": "APPROVE"}).status_code, 403)
        # Admin grants Faculty the approval permission in the Role Matrix
        self.as_user(self.ids.admin)
        self.ok("PUT", "/permissions/matrix", json={"changes": [{"permission": "papers.approve", "role": "Faculty",
                                                                 "allowed": True}]})
        self.as_user(self.ids.faculty)
        self.assertEqual(self.ok("POST", f"/papers/{paper['id']}/review", json={"decision": "APPROVE"})["status"], "APPROVED")

    def test_reject_is_terminal(self):
        paper = self.create_paper()
        self.ok("POST", f"/papers/{paper['id']}/submit")
        self.as_user(self.ids.hod)
        self.ok("POST", f"/papers/{paper['id']}/review", json={"decision": "REJECT", "comment": "Off syllabus"})
        self.as_user(self.ids.faculty)
        self.assertEqual(self.req("POST", f"/papers/{paper['id']}/submit").status_code, 409)
        self.ok("DELETE", f"/papers/{paper['id']}")

    def test_pdf_download(self):
        paper = self.create_paper(instructions="Answer ALL questions. Use ≤ 2 pages per answer — α, β.")
        plain = self.req("GET", f"/papers/{paper['id']}/pdf")
        keyed = self.req("GET", f"/papers/{paper['id']}/pdf?include_answers=true")
        for resp in (plain, keyed):
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.headers["content-type"], "application/pdf")
            self.assertTrue(resp.content.startswith(b"%PDF"))
        self.assertIn("CS201-Midterm-DS.pdf", plain.headers["content-disposition"])
        self.assertIn("answer-key", keyed.headers["content-disposition"])
        self.assertGreater(len(keyed.content), len(plain.content))

    def test_comments(self):
        paper = self.create_paper()
        self.assertEqual(self.req("POST", f"/papers/{paper['id']}/comments", json={"body": ""}).status_code, 422)
        data = self.ok("POST", f"/papers/{paper['id']}/comments", 201, json={"body": "Draft ready soon"})
        self.assertEqual((data["comments"][-1]["kind"], data["comments"][-1]["author"]["email"]),
                         ("COMMENT", "faculty@ai.test"))


# ═══════════════════════════════════════════════════════════════════════════
# Analytics
# ═══════════════════════════════════════════════════════════════════════════

class AnalyticsTests(PlatformTestCase):
    def test_admin_overview_counts_real_records(self):
        self.seed_bank([("EASY", "APPLY", "VALIDATED")] * 3)
        data = self.ok("GET", "/analytics/admin/overview")
        self.assertEqual((data["users"]["total"], data["users"]["active"], data["users"]["by_role"]["Faculty"]), (5, 5, 2))
        self.assertEqual((data["subjects"], data["units"], data["departments"]), (2, 2, 0))
        self.assertEqual(data["documents"]["total"], 2)
        self.assertEqual(data["documents"]["storage_bytes"], 20)
        self.assertEqual(data["ai"]["generations_last_24h"], 1)
        self.assertEqual(len(data["ai"]["trend"]), 14)
        self.assertEqual(data["ai"]["trend"][-1]["success"], 1)
        for user_id in (self.ids.hod, self.ids.faculty, self.ids.student):
            self.as_user(user_id)
            self.assertEqual(self.req("GET", "/analytics/admin/overview").status_code, 403)

    def test_activity_feed(self):
        self.seed_bank([("EASY", "APPLY", "VALIDATED")])
        events = self.ok("GET", "/analytics/admin/activity?limit=50")
        types = {e["type"] for e in events}
        self.assertTrue({"user_created", "document_uploaded", "ai_generation"} <= types)
        times = [e["at"] for e in events]
        self.assertEqual(times, sorted(times, reverse=True))

    def test_faculty_overview(self):
        self.seed_bank([("EASY", "REMEMBER", "VALIDATED")] * 8 + [("HARD", "ANALYZE", "EDITED")] * 2
                       + [("MEDIUM", "APPLY", "REJECTED")] * 3 + [("EASY", "APPLY", "DRAFT")])
        self.as_user(self.ids.faculty)
        data = self.ok("GET", "/analytics/faculty/overview")
        k = data["kpis"]
        self.assertEqual((k["questions_generated"], k["questions_accepted"], k["questions_rejected"],
                          k["questions_pending_review"]), (14, 10, 3, 1))
        self.assertAlmostEqual(k["acceptance_rate"], round(10 / 13, 3))
        self.assertEqual(data["bloom_distribution"]["question_bank"]["REMEMBER"], 8)
        self.assertEqual(data["topic_heatmap"]["rows"][0]["counts"]["REMEMBER"], 8)
        self.assertEqual(data["trend"][-1]["generated"], 14)
        skew = next(i for i in data["insights"] if i["title"] == "Bloom levels are skewed")
        self.assertEqual(skew["action"]["type"], "generate_balanced_paper")
        self.assertEqual(sum(skew["action"]["blueprint"]["bloom_mix"].values()), 100)

    def test_faculty_scope_and_export(self):
        self.seed_bank([("EASY", "REMEMBER", "VALIDATED")])
        self.as_user(self.ids.other_faculty)
        self.assertEqual(self.ok("GET", "/analytics/faculty/overview")["kpis"]["questions_generated"], 0)
        self.assertEqual(self.req("GET", f"/analytics/faculty/overview?subject_id={self.ids.subject}").status_code, 403)
        self.as_user(self.ids.student)
        self.assertEqual(self.req("GET", "/analytics/faculty/overview").status_code, 403)
        self.as_user(self.ids.faculty)
        rows = list(csv.reader(io.StringIO(self.req("GET", "/analytics/faculty/heatmap/export").content.decode("utf-8-sig"))))
        self.assertEqual(rows[0], ["Topic", "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create", "Total"])
        self.assertEqual(rows[1], ["Data structures", "1", "0", "0", "0", "0", "0", "1"])

    def test_balanced_draft_from_insight(self):
        """The 'Generate Balanced Draft' action produces a paper using the suggested blueprint."""
        self.seed_bank(BALANCED_BANK)
        self.seed_bank([("EASY", "REMEMBER", "VALIDATED")] * 30, start=200)
        self.as_user(self.ids.faculty)
        insight = next(i for i in self.ok("GET", "/analytics/faculty/overview")["insights"] if i.get("action"))
        action = insight["action"]
        paper = self.ok("POST", "/papers", 201, json={"title": "Balanced draft", "subject_id": action["subject_id"],
                                                      "blueprint": action["blueprint"]})
        self.assertGreaterEqual(len([v for v in paper["distribution"]["bloom"].values() if v > 0]), 5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
