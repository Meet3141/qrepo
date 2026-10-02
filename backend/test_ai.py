from app.ai.gemini import GeminiProvider
from app.ai.prompts.base import BuiltPrompt
from app.ai.config import get_ai_settings
import json

def test_provider():
    print("Testing GeminiProvider...")
    settings = get_ai_settings()
    provider = GeminiProvider(settings)
    
    prompt = BuiltPrompt(
        version="v1",
        system_instruction="You are a test assistant.",
        user_content="Generate exactly 1 MCQ question about Binary Trees in JSON format. {\"questions\": [{\"question_type\": \"MCQ\", \"marks\": 2.0}]}"
    )
    
    try:
        res = provider.generate_questions(prompt)
        print("Success!")
        print(res.raw_json)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_provider()
