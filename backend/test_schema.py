import sys, os
sys.path.insert(0, os.path.abspath('.'))
from app.ai.dependencies import get_ai_provider
from app.ai.prompts import ACTIVE_QUESTION_PROMPT
from app.ai.schemas import QuestionGenerationRequest
from app.ai.context import AcademicContext

req = QuestionGenerationRequest(
    subject_id='f488ee53-97cd-4dc0-ab25-dfe280b2fcf4',
    topic='binary search',
    target_audience='CS undergrad',
    question_type='SHORT_ANSWER',
    number_of_questions=5,
    difficulty='EASY',
    bloom_level='REMEMBER'
)
from app.ai.context import AcademicContextBuilder
from app.subject.repository import SubjectRepository, UnitRepository
from app.document.repository import DocumentRepository
from app.db.session import SessionLocal

db = SessionLocal()
ctx_builder = AcademicContextBuilder(
    subject_repo=SubjectRepository(db),
    unit_repo=UnitRepository(db),
    document_repo=DocumentRepository(db),
    max_chars=12000
)
ctx = ctx_builder.build('f488ee53-97cd-4dc0-ab25-dfe280b2fcf4', None, 'binary search')


prompt = ACTIVE_QUESTION_PROMPT.build_prompt(req, ctx)
provider = get_ai_provider()

print("Generating with provider:", provider.model)
try:
    resp = provider.generate_questions(prompt)
    print("SUCCESS")
except Exception as e:
    print("FAILED:", type(e).__name__)
    print("Detail:", getattr(e, 'internal_detail', str(e)))
