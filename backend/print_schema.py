import json
from app.ai.schemas import GeneratedQuestionBatch
from app.ai.gemini import _clean_schema

schema = GeneratedQuestionBatch.model_json_schema()
clean_schema = _clean_schema(schema)
print(json.dumps(clean_schema, indent=2))
