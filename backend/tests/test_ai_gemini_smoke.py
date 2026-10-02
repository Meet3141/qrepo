"""
Optional live Gemini smoke test. Skipped unless explicitly enabled — it calls the real API
and consumes quota. The key is read from the environment / backend .env, never hardcoded.

    RUN_GEMINI_SMOKE=1 GEMINI_API_KEY=... GEMINI_MODEL=... python -m pytest tests/test_ai_gemini_smoke.py -v
"""
import os
import sys
import unittest
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

from app.ai.config import AISettings
from app.ai.context import AcademicContext
from app.ai.gemini import GeminiProvider
from app.ai.prompts.question_generation_v1 import build_prompt
from app.ai.schemas import QuestionGenerationRequest
from app.ai.quality import QualityEngine
from app.ai.validation import QuestionValidationEngine


@unittest.skipUnless(os.environ.get("RUN_GEMINI_SMOKE") == "1", "set RUN_GEMINI_SMOKE=1 to call the real Gemini API")
class GeminiLiveSmokeTest(unittest.TestCase):
    def test_health_and_generation(self):
        settings = AISettings()
        if not settings.GEMINI_API_KEY or not settings.GEMINI_MODEL:
            self.skipTest("GEMINI_API_KEY / GEMINI_MODEL not configured")
        provider = GeminiProvider(settings)

        self.assertTrue(provider.health_check().available)

        request = QuestionGenerationRequest(
            subject_id=uuid.uuid4(), topic="Binary search trees", target_audience="Second-year undergraduates",
            question_type="MCQ", number_of_questions=5, difficulty="EASY", bloom_level="UNDERSTAND",
        )
        context = AcademicContext(subject_id=request.subject_id, subject_name="Data Structures", subject_code="CS201")
        response = provider.generate_questions(build_prompt(request, context))
        report = QuestionValidationEngine().validate(response.raw_json, request, final_attempt=True)
        # A live model may legitimately need the repair step; report issues rather than hide them
        self.assertTrue(report.passed, [i.describe() for i in report.issues])
        score = QualityEngine().score_batch(report.batch.questions, request).score
        print(f"live smoke: latency={response.latency_ms}ms quality={score}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
