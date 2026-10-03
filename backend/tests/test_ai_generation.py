"""
Sprint 6: end-to-end AI question generation, validation, repair, quality scoring, draft
persistence and faculty feedback.

Offline: Gemini is replaced by a scripted provider; persistence runs on an in-memory SQLite
database created from the production models, through the real repositories and API wiring.

    cd backend && python -m pytest tests/test_ai_generation.py -v
"""
import json
import unittest
import uuid

from ai_test_support import (
    FAKE_KEY, TOPIC, FakeDocumentRepo, FakeRepo, ScriptedProvider, SqliteWorld, batch_json, fake_doc,
    make_request, question, questions, user, valid_output,
)

from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select

from app.ai.context import AcademicContext, AcademicContextBuilder, SelectionStrategy, split_sections
from app.ai.exceptions import AIOutputValidationError, AIProviderError, AIRateLimitError, AITimeoutError
from app.ai.models import AIGeneration, DraftFeedback, QuestionDraft
from app.ai.prompts.question_generation_v1 import REPAIR_PREVIOUS_OUTPUT_MAX_CHARS, build_prompt, build_repair_prompt
from app.ai.quality import WEIGHTS, QualityEngine
from app.ai.repository import AIGenerationRepository
from app.ai.review import DraftReviewService
from app.ai.schemas import (
    QUESTION_BANK_ELIGIBLE, DraftReviewRequest, FacultyReviewStatus, GeneratedQuestion, ValidationStatus,
)
from app.ai.services import MAX_GENERATION_ATTEMPTS, QuestionGenerationService
from app.ai.validation import QuestionValidationEngine, ValidationIssue
from app.auth.constants import ROLE_ADMIN, ROLE_FACULTY, ROLE_HOD, ROLE_STUDENT
from app.core.exceptions import AppException
from app.document.repository import DocumentRepository
from app.subject.repository import SubjectRepository, UnitRepository

ENGINE = QuestionValidationEngine()


def validate(items, request=None, final=False):
    request = request or make_request(number_of_questions=len(items) if len(items) in (5, 6) else 5)
    raw = items if isinstance(items, str) else batch_json(items)
    return ENGINE.validate(raw, request, final_attempt=final)


def codes(report):
    return set(report.issue_codes)


class TextTests(unittest.TestCase):
    def test_stemming_matches_inflections(self):
        from app.ai.text import stem
        """Regression: 'trees' stemmed to 'tre' and never matched 'tree'."""
        for a, b in (("trees", "tree"), ("balanced", "balance"), ("nodes", "node"), ("classes", "class"),
                     ("queries", "query"), ("sorting", "sort"), ("indexes", "index"), ("searching", "search")):
            with self.subTest(pair=(a, b)):
                self.assertEqual(stem(a), stem(b))
        for keep in ("os", "bus", "class", "analysis"):
            self.assertEqual(stem(keep).rstrip("e"), stem(keep))

    def test_similarity_and_coverage(self):
        from app.ai.text import coverage, content_terms, similarity
        self.assertEqual(similarity("What is a BST?", "what is a bst"), 1.0)
        self.assertLess(similarity("Define a heap.", "Explain TCP congestion control."), 0.5)
        self.assertEqual(coverage(content_terms("Binary search trees"), "searching a binary tree"), 1.0)
        self.assertEqual(coverage([], "anything"), 1.0)


# --------------------------------------------------------------------------
# QuestionValidationEngine
# --------------------------------------------------------------------------

class ValidationEngineTests(unittest.TestCase):
    def test_valid_batches_pass_for_every_type_and_count(self):
        for qtype in ("MCQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"):
            for n in (5, 6):
                with self.subTest(qtype=qtype, n=n):
                    request = make_request(question_type=qtype, number_of_questions=n)
                    report = ENGINE.validate(valid_output(request), request, final_attempt=False)
                    self.assertEqual(report.status, ValidationStatus.PASS, report.issues)
                    self.assertEqual(len(report.batch.questions), n)

    def test_status_depends_on_attempt(self):
        bad = questions(4)
        self.assertEqual(validate(bad, final=False).status, ValidationStatus.REPAIR_REQUIRED)
        self.assertEqual(validate(bad, final=True).status, ValidationStatus.REJECTED)

    def test_malformed_output(self):
        for raw in ("", "not json", '{"questions": [', "```json\n{}\n```", "[]", "null", "{}"):
            with self.subTest(raw=raw):
                report = validate(raw)
                self.assertEqual(report.status, ValidationStatus.REPAIR_REQUIRED)
                self.assertIn("SCHEMA_INVALID", codes(report))
                self.assertIsNone(report.batch)

    def test_missing_fields(self):
        for field in ("question_text", "question_type", "difficulty", "bloom_level", "marks", "topic"):
            items = questions(5)
            del items[2][field]
            with self.subTest(field=field):
                report = validate(items)
                self.assertIn("SCHEMA_INVALID", codes(report))
                self.assertTrue(any(i.question_index == 2 and field in i.message for i in report.issues))

    def test_invalid_enums_and_no_coercion(self):
        for overrides in ({"question_type": "ESSAY"}, {"difficulty": "medium"}, {"bloom_level": "KNOW"},
                          {"correct_option_index": "1"}, {"marks": "2"}, {"options": "A,B,C,D"}):
            items = questions(5)
            items[0].update(overrides)
            with self.subTest(overrides=overrides):
                self.assertIn("SCHEMA_INVALID", codes(validate(items)))

    def test_forbidden_structural_fields(self):
        items = questions(5)
        items[1]["answer_key"] = "B"
        self.assertIn("FORBIDDEN_FIELD", codes(validate(items)))
        self.assertIn("FORBIDDEN_FIELD", codes(validate(json.dumps({"questions": questions(5), "note": "x"}))))

    def test_wrong_question_count(self):
        for n in (4, 6):
            with self.subTest(n=n):
                self.assertIn("QUESTION_COUNT", codes(validate(questions(n), make_request(number_of_questions=5))))

    def test_exact_and_near_duplicates(self):
        items = questions(5)
        items[3] = dict(items[0])
        self.assertIn("DUPLICATE_QUESTION", codes(validate(items)))

        items = questions(5)
        items[4] = dict(items[1], question_text=items[1]["question_text"].replace("visits", "visits all"))
        report = validate(items)
        self.assertIn("NEAR_DUPLICATE_QUESTION", codes(report))
        self.assertEqual(next(i for i in report.issues if i.code == "NEAR_DUPLICATE_QUESTION").question_index, 4)

        # Same topic, genuinely different questions: no duplicate flags
        self.assertFalse({"DUPLICATE_QUESTION", "NEAR_DUPLICATE_QUESTION"} & codes(validate(questions(6), make_request(number_of_questions=6))))

    def test_mcq_rules(self):
        cases = {
            "MCQ_OPTION_COUNT": {"options": ["A", "B", "C"]},
            "MCQ_EMPTY_OPTION": {"options": ["A", " ", "C", "D"]},
            "MCQ_DUPLICATE_OPTIONS": {"options": ["O(n)", "o(N)", "O(1)", "O(log n)"]},
            "MCQ_ANSWER_INDEX": {"correct_option_index": 4},
            "MCQ_MISSING_ANSWER": {"correct_option_index": None},
            "MCQ_UNEXPECTED_ANSWER": {"expected_answer": "B"},
        }
        for code, overrides in cases.items():
            items = questions(5)
            items[0].update(overrides)
            with self.subTest(code=code):
                self.assertIn(code, codes(validate(items)))
        items = questions(5)
        items[0]["options"] = ["A", "B", "C", "D", "E"]
        self.assertIn("MCQ_OPTION_COUNT", codes(validate(items)))
        items[0].update(options=None, correct_option_index=0)
        self.assertIn("MCQ_OPTION_COUNT", codes(validate(items)))

    def test_true_false_rules(self):
        request = make_request(question_type="TRUE_FALSE")
        for code, overrides in {"TF_OPTIONS": {"options": ["Yes", "No"]},
                                "TF_ANSWER": {"correct_option_index": 2},
                                "TF_UNEXPECTED_ANSWER": {"expected_answer": "True"}}.items():
            items = questions(5, "TRUE_FALSE")
            items[0].update(overrides)
            with self.subTest(code=code):
                self.assertIn(code, codes(validate(items, request)))

    def test_written_answer_rules(self):
        short = make_request(question_type="SHORT_ANSWER")
        long_ = make_request(question_type="LONG_ANSWER")
        for code, qtype, request, overrides in (
            ("MISSING_EXPECTED_ANSWER", "SHORT_ANSWER", short, {"expected_answer": None}),
            ("MISSING_EXPECTED_ANSWER", "SHORT_ANSWER", short, {"expected_answer": "  "}),
            ("WRITTEN_HAS_OPTIONS", "SHORT_ANSWER", short, {"options": ["A", "B"]}),
            ("ANSWER_LENGTH", "SHORT_ANSWER", short, {"expected_answer": "x" * 1001}),
            ("ANSWER_LENGTH", "LONG_ANSWER", long_, {"expected_answer": "Too brief."}),
        ):
            items = questions(5, qtype)
            items[1].update(overrides)
            with self.subTest(code=code, qtype=qtype):
                self.assertIn(code, codes(validate(items, request)))

    def test_parameter_compliance(self):
        for field, value, code in (("question_type", "SHORT_ANSWER", "QUESTION_TYPE_MISMATCH"),
                                   ("difficulty", "HARD", "DIFFICULTY_MISMATCH"),
                                   ("bloom_level", "REMEMBER", "BLOOM_LEVEL_MISMATCH"),
                                   ("topic", "Hash tables", "TOPIC_MISMATCH")):
            items = questions(5)
            items[2][field] = value
            with self.subTest(field=field):
                self.assertIn(code, codes(validate(items)))
        items = questions(5)
        items[0]["topic"] = "  binary SEARCH trees. "
        self.assertNotIn("TOPIC_MISMATCH", codes(validate(items)))

    def test_marks_and_length_bounds(self):
        for overrides, code in (({"question_text": "What is BST?"}, "QUESTION_LENGTH"),
                                (({"question_text": "Why " * 400}, "QUESTION_LENGTH")),
                                ({"question_text": "   "}, "EMPTY_QUESTION"),
                                ({"explanation": "e" * 1501}, "EXPLANATION_LENGTH")):
            items = questions(5)
            items[0].update(overrides)
            with self.subTest(overrides=str(overrides)[:40]):
                self.assertIn(code, codes(validate(items)))

    def test_issues_are_reported_per_question_without_content(self):
        items = questions(5)
        items[0]["question_text"] = "CONFIDENTIAL QUESTION?"
        items[0]["options"] = ["A", "B", "C"]
        report = validate(items)
        issue = next(i for i in report.issues if i.code == "MCQ_OPTION_COUNT")
        self.assertTrue(issue.describe().startswith("Question 1: "))
        self.assertTrue(all("CONFIDENTIAL" not in i.message for i in report.issues))


# --------------------------------------------------------------------------
# QualityEngine
# --------------------------------------------------------------------------

class QualityEngineTests(unittest.TestCase):
    engine = QualityEngine()

    def score(self, items, request=None):
        request = request or make_request()
        return self.engine.score_batch([GeneratedQuestion(**q) for q in items], request)

    def test_good_batch_scores_high_and_in_range(self):
        for qtype in ("MCQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"):
            result = self.score(questions(5, qtype), make_request(question_type=qtype))
            with self.subTest(qtype=qtype):
                self.assertGreaterEqual(result.score, 0.8)
                self.assertLessEqual(result.score, 1.0)
                self.assertEqual(len(result.questions), 5)

    def test_weights_and_signals(self):
        self.assertAlmostEqual(sum(WEIGHTS.values()), 1.0)
        signals = self.score(questions(5)).questions[0].signals
        self.assertEqual(set(signals), set(WEIGHTS))
        self.assertTrue(all(0.0 <= v <= 1.0 for v in signals.values()))

    def test_deterministic(self):
        self.assertEqual(self.score(questions(5)), self.score(questions(5)))

    def test_signals_penalise_defects(self):
        base = self.score(questions(5)).questions[0]
        defects = {
            "parameter_compliance": {"difficulty": "HARD", "bloom_level": "REMEMBER"},
            "answer_completeness": {"explanation": None},
            "topic_relevance": {"question_text": "Which protocol resolves IPv4 addresses to MAC addresses on a LAN?",
                                "options": ["ARP", "DNS", "DHCP", "ICMP"],
                                "explanation": "ARP maps network-layer addresses to link-layer addresses."},
            "length_sanity": {"question_text": "Define it now?"},
            "option_quality": {"options": ["A", "B", "C", "An extremely long and obviously correct option text"]},
        }
        for signal, overrides in defects.items():
            items = questions(5)
            items[0].update(overrides)
            worse = self.score(items).questions[0]
            with self.subTest(signal=signal):
                self.assertLess(worse.signals[signal], base.signals[signal])
                self.assertLess(worse.score, base.score)

    def test_duplicate_penalty(self):
        items = questions(5)
        items[4] = dict(items[0])
        result = self.score(items)
        self.assertEqual(result.questions[4].signals["uniqueness"], 0.0)
        self.assertLess(result.score, self.score(questions(5)).score)

    def test_empty_batch(self):
        self.assertEqual(QualityEngine().score_batch([], make_request()).score, 0.0)


# --------------------------------------------------------------------------
# Context engine: deterministic lexical selection
# --------------------------------------------------------------------------

def context_world(documents=(), max_chars=2000):
    subj = type("S", (), {})()
    subj.id, subj.name, subj.code, subj.faculty_id = uuid.uuid4(), "Data Structures", "CS201", None
    other = type("S", (), {})()
    other.id, other.name, other.code, other.faculty_id = uuid.uuid4(), "Networks", "CS301", None
    unit = type("U", (), {})()
    unit.id, unit.subject_id, unit.unit_number, unit.title, unit.description = uuid.uuid4(), subj.id, 3, "Trees", "BST and AVL"
    foreign = type("U", (), {})()
    foreign.id, foreign.subject_id, foreign.unit_number, foreign.title, foreign.description = uuid.uuid4(), other.id, 1, "OSI", None
    docs = [d(unit.id) for d in documents]
    builder = AcademicContextBuilder(FakeRepo([subj, other]), FakeRepo([unit, foreign]), FakeDocumentRepo(docs), max_chars)
    return builder, subj, unit, foreign


RELEVANT = ("Binary search trees store keys in sorted order. Searching a binary search tree compares the target "
            "with the root and descends left or right. ") * 3
IRRELEVANT = ("Hash tables map keys to buckets with a hash function. Collisions are resolved with chaining "
              "or open addressing. ") * 3


class ContextEngineTests(unittest.TestCase):
    def test_sections_are_bounded_and_small_paragraphs_merged(self):
        text = ("Sentence about trees. " * 120 + "\n\n") * 2 + "tiny\n\nalso tiny"
        sections = split_sections(text, max_chars=1200, min_chars=200)
        self.assertTrue(all(len(s) <= 1200 for s in sections))
        self.assertFalse(any(len(s) < 200 for s in sections[:-1]))
        self.assertIn("also tiny", sections[-1])
        self.assertTrue(all(len(s) <= 1200 for s in split_sections("x" * 5000)))

    def test_relevant_sections_selected_over_irrelevant(self):
        text = "\n\n".join([IRRELEVANT, IRRELEVANT, RELEVANT, IRRELEVANT])
        builder, subj, unit, _ = context_world([lambda u: fake_doc(u, text)], max_chars=600)
        ctx = builder.build(subj.id, unit.id, topic=TOPIC)
        self.assertEqual(ctx.selection_strategy, SelectionStrategy.LEXICAL)
        self.assertIn("Binary search trees store keys", ctx.source_excerpt)
        self.assertNotIn("Hash tables", ctx.source_excerpt)
        self.assertTrue(ctx.truncated)
        self.assertLess(ctx.sections_selected, ctx.sections_total)

    def test_topic_drives_selection(self):
        text = "\n\n".join([RELEVANT, IRRELEVANT])
        builder, subj, unit, _ = context_world([lambda u: fake_doc(u, text)], max_chars=600)
        self.assertIn("Hash tables", builder.build(subj.id, unit.id, topic="Hash tables and collisions").source_excerpt)

    def test_budget_never_exceeded(self):
        for budget in (300, 1000, 5000):
            builder, subj, unit, _ = context_world(
                [lambda u: fake_doc(u, (RELEVANT + "\n\n") * 200), lambda u: fake_doc(u, "x" * 50000, name="big.pdf")],
                max_chars=budget)
            ctx = builder.build(subj.id, unit.id, topic=TOPIC)
            with self.subTest(budget=budget):
                self.assertLessEqual(len(ctx.source_excerpt), budget)
                self.assertGreater(len(ctx.source_excerpt), 0)

    def test_oversized_single_section_is_cut_to_budget(self):
        builder, subj, unit, _ = context_world([lambda u: fake_doc(u, "binary search tree " * 400)], max_chars=500)
        ctx = builder.build(subj.id, unit.id, topic=TOPIC)
        self.assertLessEqual(len(ctx.source_excerpt), 500)
        self.assertTrue(ctx.truncated)

    def test_selected_sections_keep_reading_order(self):
        first = "Binary search tree insertion places a new key at a leaf. " * 3
        second = "Binary search tree deletion handles three cases. " * 3
        text = "\n\n".join([first, IRRELEVANT, second])
        builder, subj, unit, _ = context_world([lambda u: fake_doc(u, text)], max_chars=2000)
        excerpt = builder.build(subj.id, unit.id, topic=TOPIC).source_excerpt
        self.assertLess(excerpt.index("insertion"), excerpt.index("deletion"))

    def test_leading_fallback_when_no_overlap(self):
        builder, subj, unit, _ = context_world([lambda u: fake_doc(u, "Lorem ipsum dolor sit amet. " * 20)])
        ctx = builder.build(subj.id, unit.id, topic="Quantum chromodynamics")
        self.assertEqual(ctx.selection_strategy, SelectionStrategy.LEADING)
        self.assertTrue(ctx.context_available)

    def test_deterministic(self):
        text = "\n\n".join([IRRELEVANT, RELEVANT] * 5)
        builder, subj, unit, _ = context_world([lambda u: fake_doc(u, text)], max_chars=900)
        a = builder.build(subj.id, unit.id, topic=TOPIC)
        b = builder.build(subj.id, unit.id, topic=TOPIC)
        self.assertEqual(a.source_excerpt, b.source_excerpt)

    def test_only_completed_documents_are_used(self):
        builder, subj, unit, _ = context_world([
            lambda u: fake_doc(u, "PENDING binary search tree", status="PENDING"),
            lambda u: fake_doc(u, "FAILED binary search tree", status="FAILED"),
            lambda u: fake_doc(u, None), lambda u: fake_doc(u, "  "),
            lambda u: fake_doc(u, "Completed binary search tree notes"),
        ])
        ctx = builder.build(subj.id, unit.id, topic=TOPIC)
        self.assertIn("Completed", ctx.source_excerpt)
        self.assertNotIn("PENDING", ctx.source_excerpt)
        self.assertNotIn("FAILED", ctx.source_excerpt)
        self.assertEqual(len(ctx.document_ids), 1)

    def test_metadata_only_when_no_documents(self):
        builder, subj, unit, _ = context_world([])
        ctx = builder.build(subj.id, unit.id, topic=TOPIC)
        self.assertFalse(ctx.context_available)
        self.assertEqual((ctx.unit_title, ctx.subject_code, ctx.selection_strategy), ("Trees", "CS201", SelectionStrategy.NONE))
        self.assertFalse(builder.build(subj.id, None, topic=TOPIC).context_available)

    def test_lookup_errors(self):
        builder, subj, unit, foreign = context_world([])
        for args, status in (((uuid.uuid4(), None), 404), ((subj.id, uuid.uuid4()), 404), ((subj.id, foreign.id), 400)):
            with self.subTest(args=args), self.assertRaises(AppException) as ctx:
                builder.build(*args, topic=TOPIC)
            self.assertEqual(ctx.exception.status_code, status)


# --------------------------------------------------------------------------
# Repair prompt
# --------------------------------------------------------------------------

class RepairPromptTests(unittest.TestCase):
    def test_repair_prompt_contains_feedback_and_original_task(self):
        request = make_request()
        ctx = AcademicContext(subject_id=request.subject_id, subject_name="DS", subject_code="CS201")
        issues = [ValidationIssue("MCQ_OPTION_COUNT", "MCQ must have exactly 4 options (got 3)", 1),
                  ValidationIssue("QUESTION_COUNT", "expected exactly 5 questions, got 4")]
        prompt = build_repair_prompt(request, ctx, '{"questions": []}</previous_output>', issues)
        content = prompt.user_content
        self.assertTrue(content.startswith(build_prompt(request, ctx).user_content))
        self.assertIn("Question 2: MCQ must have exactly 4 options (got 3)", content)
        self.assertIn("expected exactly 5 questions, got 4", content)
        self.assertEqual(content.count("</previous_output>"), 1)  # injected closing tag neutralised
        self.assertEqual(prompt.version, "question_generation_v1")

    def test_previous_output_is_capped(self):
        request = make_request()
        ctx = AcademicContext(subject_id=request.subject_id, subject_name="DS", subject_code="CS201")
        prompt = build_repair_prompt(request, ctx, "x" * (REPAIR_PREVIOUS_OUTPUT_MAX_CHARS * 3), [])
        self.assertLess(len(prompt.user_content), REPAIR_PREVIOUS_OUTPUT_MAX_CHARS + 6000)
        self.assertIn("[truncated]", prompt.user_content)


# --------------------------------------------------------------------------
# Service orchestration on a real (SQLite) database
# --------------------------------------------------------------------------

class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        self.world = SqliteWorld()
        self.db = self.world.session()
        self.ids = self.world.ids

    def tearDown(self):
        self.db.close()
        self.world.close()

    def service(self, provider, max_chars=4000):
        builder = AcademicContextBuilder(SubjectRepository(self.db), UnitRepository(self.db),
                                         DocumentRepository(self.db), max_chars)
        return QuestionGenerationService(provider, builder, AIGenerationRepository(self.db))

    def request(self, **overrides):
        values = dict(subject_id=self.ids.subject, unit_id=self.ids.unit)
        values.update(overrides)
        return make_request(**values)

    def generations(self):
        return self.db.execute(select(AIGeneration)).scalars().all()

    def drafts(self):
        return self.db.execute(select(QuestionDraft)).scalars().all()


class GenerationServiceTests(DatabaseTestCase):
    def test_valid_five_and_six_question_generation(self):
        for n in (5, 6):
            request = self.request(number_of_questions=n)
            provider = ScriptedProvider(valid_output(request))
            generation = self.service(provider).generate(request, user(ROLE_FACULTY, self.ids.faculty))
            with self.subTest(n=n):
                self.assertEqual((generation.status, generation.validation_status), ("SUCCESS", "PASS"))
                self.assertEqual(len(generation.drafts), n)
                self.assertEqual([d.position for d in generation.drafts], list(range(1, n + 1)))
                self.assertTrue(all(d.faculty_review_status == "DRAFT" for d in generation.drafts))
                self.assertTrue(all(d.validation_status == "PASS" for d in generation.drafts))
                self.assertTrue(0 < generation.quality_score <= 1)
                self.assertEqual((generation.generation_attempts, generation.repair_attempted), (1, False))
                self.assertEqual(len(provider.prompts), 1)

    def test_db_connection_released_during_provider_call(self):
        """Regression: the read transaction used to stay open (idle in transaction) for the whole AI call."""
        request = self.request()
        observed = []
        db = self.db

        class Probe(ScriptedProvider):
            def generate_questions(probe, prompt):
                observed.append(db.in_transaction())
                return super().generate_questions(prompt)

        provider = Probe(batch_json(questions(4)), valid_output(request))
        self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
        self.assertEqual(observed, [False, False])

    def test_generation_record_metadata(self):
        request = self.request()
        generation = self.service(ScriptedProvider(valid_output(request))).generate(request, user(ROLE_ADMIN, self.ids.admin))
        self.assertEqual((generation.provider, generation.model_name, generation.prompt_version),
                         ("stub", "stub-model", "question_generation_v1"))
        self.assertEqual(generation.requested_by, self.ids.admin)
        self.assertEqual(generation.parameters_json["topic"], TOPIC)
        self.assertEqual(generation.question_count, 5)
        self.assertEqual(generation.questions_returned, 5)
        self.assertGreaterEqual(generation.latency_ms, 0)
        self.assertTrue(generation.context_available)
        self.assertEqual(generation.context_document_ids, [str(self.ids.documents[0])])

    def test_unit_document_context_reaches_prompt(self):
        request = self.request()
        provider = ScriptedProvider(valid_output(request))
        self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
        prompt = provider.prompts[0].user_content
        self.assertIn("In-order traversal of a binary search tree", prompt)
        self.assertIn("Data Structures (CS201)", prompt)
        self.assertIn("Unit 3: Trees", prompt)
        self.assertNotIn("PENDING DOCUMENT TEXT", prompt)

    def test_privacy_no_prompt_or_document_text_persisted(self):
        request = self.request()
        self.service(ScriptedProvider(valid_output(request))).generate(request, user(ROLE_ADMIN, self.ids.admin))
        stored = json.dumps([{c.name: str(getattr(g, c.name)) for c in AIGeneration.__table__.columns}
                             for g in self.generations()])
        for sensitive in ("In-order traversal", "assessment author", FAKE_KEY, "storage_path", "media/documents"):
            self.assertNotIn(sensitive, stored)

    def test_lookup_and_authorization_failures_call_nothing(self):
        cases = [
            (self.request(subject_id=uuid.uuid4()), user(ROLE_ADMIN, self.ids.admin), 404),
            (self.request(unit_id=uuid.uuid4()), user(ROLE_ADMIN, self.ids.admin), 404),
            (self.request(unit_id=self.ids.other_unit), user(ROLE_ADMIN, self.ids.admin), 400),
            (self.request(), user(ROLE_STUDENT, self.ids.student), 403),
            (self.request(), user(ROLE_FACULTY, self.ids.other_faculty), 403),
        ]
        for request, actor, status in cases:
            provider = ScriptedProvider(valid_output(request))
            with self.subTest(status=status, role=actor.role.name), self.assertRaises(AppException) as ctx:
                self.service(provider).generate(request, actor)
            self.assertEqual(ctx.exception.status_code, status)
            self.assertEqual(provider.prompts, [])
        self.assertEqual(self.generations(), [])

    def test_authorized_roles(self):
        for actor in (user(ROLE_ADMIN, self.ids.admin), user(ROLE_HOD, self.ids.hod), user(ROLE_FACULTY, self.ids.faculty)):
            request = self.request()
            with self.subTest(role=actor.role.name):
                self.assertEqual(self.service(ScriptedProvider(valid_output(request))).generate(request, actor).status, "SUCCESS")

    def test_repair_succeeds_after_invalid_first_output(self):
        request = self.request()
        for name, first in (("wrong count", batch_json(questions(4))),
                            ("malformed", '{"questions": ['),
                            ("bad MCQ", batch_json([question(0, options=["A", "B"])] + questions(5)[1:])),
                            ("duplicate", batch_json(questions(4) + [question(0)]))):
            provider = ScriptedProvider(first, valid_output(request))
            generation = self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
            with self.subTest(case=name):
                self.assertEqual((generation.status, generation.validation_status), ("SUCCESS", "PASS"))
                self.assertTrue(generation.repair_attempted)
                self.assertEqual(generation.generation_attempts, 2)
                self.assertEqual(len(provider.prompts), 2)
                self.assertIn("<validation_issues>", provider.prompts[1].user_content)
                self.assertIn("<previous_output>", provider.prompts[1].user_content)
                self.assertTrue(generation.validation_issue_codes)

    def test_repair_failure_is_rejected_and_recorded(self):
        request = self.request()
        provider = ScriptedProvider(batch_json(questions(4)), batch_json(questions(3)), valid_output(request))
        with self.assertRaises(AIOutputValidationError) as ctx:
            self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
        self.assertEqual(len(provider.prompts), MAX_GENERATION_ATTEMPTS)  # never a third call
        self.assertIn("repair", ctx.exception.message)
        [generation] = self.generations()
        self.assertEqual((generation.status, generation.validation_status, generation.error_category),
                         ("REJECTED", "REJECTED", "AI_OUTPUT_VALIDATION_ERROR"))
        self.assertEqual(set(generation.validation_issue_codes), {"QUESTION_COUNT", "MARK_DISTRIBUTION_MISMATCH"})
        self.assertEqual(self.drafts(), [])

    def test_provider_failures_are_recorded_and_not_repaired(self):
        cases = [(AITimeoutError("timeout"), "AI_TIMEOUT_ERROR"), (AIRateLimitError("429"), "AI_RATE_LIMIT_ERROR"),
                 (AIProviderError("500", retryable=True), "AI_PROVIDER_ERROR"),
                 (AIProviderError("503", retryable=True), "AI_PROVIDER_ERROR")]
        for error, category in cases:
            request = self.request()
            provider = ScriptedProvider(error, valid_output(request), attempts_per_call=3)
            with self.subTest(category=category), self.assertRaises(type(error)):
                self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
            generation = self.generations()[-1]
            self.assertEqual((generation.status, generation.error_category), ("FAILED", category))
            self.assertEqual(generation.provider_calls, 3)
            self.assertFalse(generation.repair_attempted)
            self.assertEqual(len(provider.prompts), 1)
        self.assertEqual(self.drafts(), [])

    def test_provider_failure_during_repair(self):
        request = self.request()
        provider = ScriptedProvider(batch_json(questions(4)), AIRateLimitError("429"))
        with self.assertRaises(AIRateLimitError):
            self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
        [generation] = self.generations()
        self.assertEqual((generation.status, generation.repair_attempted, generation.generation_attempts),
                         ("FAILED", True, 2))

    def test_logs_metadata_without_sensitive_content(self):
        request = self.request(topic="Binary search trees")
        provider = ScriptedProvider(batch_json(questions(4)), batch_json(questions(4)))
        with self.assertLogs("qrepo.ai", level="INFO") as logs, self.assertRaises(AIOutputValidationError):
            self.service(provider).generate(request, user(ROLE_ADMIN, self.ids.admin))
        output = "\n".join(logs.output)
        record = json.loads(output.rsplit("ai_generation ", 1)[1])
        for field in ("generation_id", "generated_at", "provider", "model", "prompt_version", "latency_ms",
                      "status", "error_category", "questions_requested"):
            self.assertIn(field, record)
        self.assertEqual(record["status"], "REJECTED")
        for sensitive in ("In-order traversal", "worst-case time complexity", FAKE_KEY):
            self.assertNotIn(sensitive, output)


# --------------------------------------------------------------------------
# Faculty review & feedback persistence
# --------------------------------------------------------------------------

class ReviewTests(DatabaseTestCase):
    def setUp(self):
        super().setUp()
        request = self.request()
        self.generation = self.service(ScriptedProvider(valid_output(request))).generate(
            request, user(ROLE_FACULTY, self.ids.faculty))
        self.draft = self.generation.drafts[0]
        self.reviews = DraftReviewService(AIGenerationRepository(self.db), SubjectRepository(self.db))
        self.faculty = user(ROLE_FACULTY, self.ids.faculty)

    def feedback(self):
        return self.db.execute(select(DraftFeedback)).scalars().all()

    def review(self, actor=None, **body):
        return self.reviews.review(self.draft.id, DraftReviewRequest(**body), actor or self.faculty)

    def test_accept(self):
        draft = self.review(action="ACCEPT", rating=5)
        self.assertEqual(draft.faculty_review_status, "VALIDATED")
        self.assertEqual(draft.reviewed_by, self.ids.faculty)
        self.assertIsNotNone(draft.reviewed_at)
        [fb] = self.feedback()
        self.assertEqual((fb.action, fb.rating, fb.previous_review_status), ("ACCEPT", 5, "DRAFT"))
        self.assertIsNone(fb.after_snapshot)

    def test_edit_keeps_ai_original_and_records_diff(self):
        original_text = self.draft.question_text
        draft = self.review(action="EDIT", edits={"question_text": "Which traversal order outputs BST keys ascending?",
                                                  "marks": 3}, comment="Tightened wording")
        self.assertEqual(draft.faculty_review_status, "EDITED")
        self.assertEqual(draft.question_text, "Which traversal order outputs BST keys ascending?")
        self.assertEqual(draft.marks, 3)
        self.assertEqual(draft.ai_original["question_text"], original_text)
        [fb] = self.feedback()
        self.assertEqual(fb.changed_fields, ["marks", "question_text"])
        self.assertEqual(fb.before_snapshot["question_text"], original_text)
        self.assertEqual(fb.after_snapshot["marks"], 3)
        self.assertEqual(fb.comment, "Tightened wording")

    def test_invalid_edit_is_rejected_without_side_effects(self):
        for edits, status in (({"correct_option_index": 9}, 422), ({"options": ["A", "B"]}, 422),
                              ({"question_text": ""}, 422), ({"question_text": self.draft.question_text}, 400)):
            with self.subTest(edits=edits), self.assertRaises(AppException) as ctx:
                self.review(action="EDIT", edits=edits)
            self.assertEqual(ctx.exception.status_code, status)
        self.db.refresh(self.draft)
        self.assertEqual(self.draft.faculty_review_status, "DRAFT")
        self.assertEqual(self.feedback(), [])

    def test_reject_with_reason(self):
        draft = self.review(action="REJECT", rejection_reason="AMBIGUOUS", comment="Two answers fit", rating=2)
        self.assertEqual(draft.faculty_review_status, "REJECTED")
        [fb] = self.feedback()
        self.assertEqual((fb.action, fb.rejection_reason, fb.rating), ("REJECT", "AMBIGUOUS", 2))

    def test_review_request_rules(self):
        for body in ({"action": "REJECT"}, {"action": "EDIT"}, {"action": "EDIT", "edits": {}},
                     {"action": "ACCEPT", "edits": {"marks": 2}}, {"action": "ACCEPT", "rejection_reason": "OTHER"},
                     {"action": "ACCEPT", "rating": 6}, {"action": "EDIT", "edits": {"question_type": "MCQ"}},
                     {"action": "PUBLISH"}):
            with self.subTest(body=body), self.assertRaises(ValidationError):
                DraftReviewRequest(**body)

    def test_review_history_is_append_only(self):
        self.review(action="REJECT", rejection_reason="OTHER")
        self.review(action="ACCEPT")
        history = self.reviews.repository.get_feedback(self.draft.id)
        self.assertEqual([f.action for f in history], ["REJECT", "ACCEPT"])
        self.assertEqual(history[1].previous_review_status, "REJECTED")

    def test_review_authorization(self):
        for actor in (user(ROLE_STUDENT, self.ids.student), user(ROLE_FACULTY, self.ids.other_faculty)):
            with self.subTest(role=actor.role.name), self.assertRaises(AppException) as ctx:
                self.review(actor=actor, action="ACCEPT")
            self.assertEqual(ctx.exception.status_code, 403)
        for actor in (user(ROLE_ADMIN, self.ids.admin), user(ROLE_HOD, self.ids.hod)):
            self.assertEqual(self.review(actor=actor, action="ACCEPT").faculty_review_status, "VALIDATED")

    def test_missing_draft(self):
        with self.assertRaises(AppException) as ctx:
            self.reviews.review(uuid.uuid4(), DraftReviewRequest(action="ACCEPT"), self.faculty)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_only_reviewed_drafts_are_question_bank_eligible(self):
        self.assertEqual(QUESTION_BANK_ELIGIBLE, {FacultyReviewStatus.VALIDATED, FacultyReviewStatus.EDITED})
        self.assertNotIn(FacultyReviewStatus(self.draft.faculty_review_status), QUESTION_BANK_ELIGIBLE)


# --------------------------------------------------------------------------
# API integration (real wiring; only DB session, auth and Gemini substituted)
# --------------------------------------------------------------------------

class APIIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.main import app
        from app.api.dependencies import get_current_user
        from app.ai.dependencies import get_ai_provider
        from app.db.init_db import get_db
        cls.app = app
        cls.deps = {"user": get_current_user, "provider": get_ai_provider, "db": get_db}
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

        self.app.dependency_overrides[self.deps["db"]] = override_db
        self.provider = None
        self.app.dependency_overrides[self.deps["provider"]] = lambda: self.provider
        self.act_as(ROLE_FACULTY, self.ids.faculty)

    def tearDown(self):
        self.app.dependency_overrides.clear()
        self.world.close()

    def act_as(self, role, user_id):
        actor = user(role, user_id)
        self.app.dependency_overrides[self.deps["user"]] = lambda: actor

    def body(self, **overrides):
        payload = dict(subject_id=str(self.ids.subject), unit_id=str(self.ids.unit), topic=TOPIC,
                       target_audience="Second-year B.Tech CSE", question_type="MCQ", mark_distribution={"2": 5},
                       difficulty="MEDIUM", bloom_level="APPLY")
        payload.update(overrides)
        return payload

    def generate(self, *outputs, **overrides):
        body = self.body(**overrides)
        if not outputs:
            count = sum(body["mark_distribution"].values())
            outputs = (batch_json(questions(count, body["question_type"])),)
        self.provider = ScriptedProvider(*outputs)
        return self.client.post("/api/v1/ai/questions/generate", json=body)

    def test_generate_five_and_six(self):
        for n in (5, 6):
            resp = self.generate(mark_distribution={"2": n})
            with self.subTest(n=n):
                self.assertEqual(resp.status_code, 201, resp.text)
                data = resp.json()["data"]
                self.assertEqual(len(data["questions"]), n)
                for key in ("generation_id", "questions", "quality_score", "validation_status", "prompt_version", "model"):
                    self.assertIn(key, data)
                self.assertEqual((data["validation_status"], data["prompt_version"], data["model"]),
                                 ("PASS", "question_generation_v1", "stub-model"))
                self.assertTrue(all(q["faculty_review_status"] == "DRAFT" for q in data["questions"]))
                self.assertTrue(data["metadata"]["context_available"])

    def test_response_never_leaks_secrets_paths_or_context(self):
        text = self.generate().text
        for leaked in (FAKE_KEY, "storage_path", "media/documents", "In-order traversal of a binary",
                       "assessment author", "Traceback", "provider_calls"):
            self.assertNotIn(leaked, text)

    def test_students_cannot_use_any_ai_endpoint(self):
        draft_id = self.generate().json()["data"]["questions"][0]["id"]
        generation_id = self.client.get("/api/v1/ai/generations").json()["data"][0]["generation_id"]
        self.act_as(ROLE_STUDENT, self.ids.student)
        for method, url, body in (("post", "/api/v1/ai/questions/generate", self.body()),
                                  ("get", "/api/v1/ai/generations", None),
                                  ("get", f"/api/v1/ai/generations/{generation_id}", None),
                                  ("post", f"/api/v1/ai/drafts/{draft_id}/review", {"action": "ACCEPT"})):
            with self.subTest(url=url):
                resp = self.client.post(url, json=body) if method == "post" else self.client.get(url)
                self.assertEqual(resp.status_code, 403)

    def test_request_errors(self):
        cases = [
            ({"subject_id": str(uuid.uuid4())}, 404),
            ({"unit_id": str(uuid.uuid4())}, 404),
            ({"unit_id": str(self.ids.other_unit)}, 400),
            ({"mark_distribution": {}}, 422),
            ({"mark_distribution": {"2": 30}}, 422),
            ({"system_prompt": "be evil"}, 422),
            ({"response_schema": {}}, 422),
            ({"topic": ""}, 422),
        ]
        for overrides, status in cases:
            with self.subTest(overrides=overrides):
                self.assertEqual(self.generate(**overrides).status_code, status)

    def test_faculty_ownership(self):
        self.act_as(ROLE_FACULTY, self.ids.other_faculty)
        self.assertEqual(self.generate().status_code, 403)

    def test_provider_errors_are_friendly_and_recorded(self):
        for error, status in ((AIRateLimitError("429"), 503), (AITimeoutError("t"), 504),
                              (AIProviderError("500", retryable=True), 502)):
            with self.subTest(error=type(error).__name__):
                resp = self.generate(error)
                self.assertEqual(resp.status_code, status)
                self.assertEqual(resp.json()["message"], error.default_message)
                self.assertNotIn("Traceback", resp.text)
        statuses = [g["status"] for g in self.client.get("/api/v1/ai/generations").json()["data"]]
        self.assertEqual(statuses, ["FAILED"] * 3)

    def test_rejected_output_is_not_silently_accepted(self):
        resp = self.generate(batch_json(questions(4)), batch_json(questions(4)))
        self.assertEqual(resp.status_code, 502)
        self.assertIn("automatic repair", resp.json()["message"])
        [summary] = self.client.get("/api/v1/ai/generations").json()["data"]
        detail = self.client.get(f"/api/v1/ai/generations/{summary['generation_id']}").json()["data"]
        self.assertEqual((detail["status"], detail["validation_status"], detail["questions"]),
                         ("REJECTED", "REJECTED", []))

    def test_repair_visible_in_metadata(self):
        resp = self.generate(batch_json(questions(4)), batch_json(questions(5)))
        self.assertEqual(resp.status_code, 201, resp.text)
        metadata = resp.json()["data"]["metadata"]
        self.assertEqual((metadata["repair_attempted"], metadata["generation_attempts"]), (True, 2))

    def test_generation_detail_and_listing_scope(self):
        generation_id = self.generate().json()["data"]["generation_id"]
        detail = self.client.get(f"/api/v1/ai/generations/{generation_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"]["parameters"]["topic"], TOPIC)
        self.assertEqual(len(self.client.get(f"/api/v1/ai/generations?subject_id={self.ids.subject}").json()["data"]), 1)

        self.act_as(ROLE_FACULTY, self.ids.other_faculty)
        self.assertEqual(self.client.get("/api/v1/ai/generations").json()["data"], [])
        self.assertEqual(self.client.get(f"/api/v1/ai/generations/{generation_id}").status_code, 403)
        self.assertEqual(self.client.get(f"/api/v1/ai/generations?subject_id={self.ids.subject}").status_code, 403)

        self.act_as(ROLE_HOD, self.ids.hod)
        self.assertEqual(len(self.client.get("/api/v1/ai/generations").json()["data"]), 1)
        self.assertEqual(self.client.get(f"/api/v1/ai/generations/{uuid.uuid4()}").status_code, 404)

    def test_review_flow_persists_feedback(self):
        drafts = self.generate().json()["data"]["questions"]
        review = lambda d, body: self.client.post(f"/api/v1/ai/drafts/{d['id']}/review", json=body)

        accepted = review(drafts[0], {"action": "ACCEPT", "rating": 4})
        edited = review(drafts[1], {"action": "EDIT", "edits": {"explanation": "In-order visits left, node, right."}})
        rejected = review(drafts[2], {"action": "REJECT", "rejection_reason": "OFF_TOPIC", "comment": "Not in syllabus"})
        invalid = review(drafts[3], {"action": "EDIT", "edits": {"correct_option_index": 7}})
        missing_reason = review(drafts[4], {"action": "REJECT"})

        self.assertEqual([r.status_code for r in (accepted, edited, rejected, invalid, missing_reason)],
                         [200, 200, 200, 422, 422])
        self.assertEqual([r.json()["data"]["faculty_review_status"] for r in (accepted, edited, rejected)],
                         ["VALIDATED", "EDITED", "REJECTED"])

        db = self.world.session()
        feedback = db.execute(select(DraftFeedback)).scalars().all()
        self.assertEqual(sorted(f.action for f in feedback), ["ACCEPT", "EDIT", "REJECT"])
        self.assertTrue(all(f.reviewer_id == self.ids.faculty for f in feedback))
        db.close()

        self.assertEqual(self.client.post(f"/api/v1/ai/drafts/{uuid.uuid4()}/review",
                                          json={"action": "ACCEPT"}).status_code, 404)
        self.act_as(ROLE_FACULTY, self.ids.other_faculty)
        self.assertEqual(review(drafts[4], {"action": "ACCEPT"}).status_code, 403)


if __name__ == "__main__":
    unittest.main(verbosity=2)
