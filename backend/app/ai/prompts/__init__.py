from app.ai.prompts.base import BuiltPrompt
from app.ai.prompts import question_generation_v1

# The active prompt template. Bump this (and add a new module) instead of editing a released version.
ACTIVE_QUESTION_PROMPT = question_generation_v1

__all__ = ["BuiltPrompt", "ACTIVE_QUESTION_PROMPT", "question_generation_v1"]
