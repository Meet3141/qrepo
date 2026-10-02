"""add AI generation, question draft and draft feedback tables

Revision ID: b7d2f4a9c1e3
Revises: e34da500b4ce
Create Date: 2026-10-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d2f4a9c1e3'
down_revision: Union[str, Sequence[str], None] = 'e34da500b4ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ai_generations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('requested_by', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('unit_id', sa.Uuid(), nullable=True),
        sa.Column('parameters_json', sa.JSON(), nullable=False),
        sa.Column('prompt_version', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('validation_status', sa.String(length=20), nullable=True),
        sa.Column('error_category', sa.String(length=50), nullable=True),
        sa.Column('validation_issue_codes', sa.JSON(), nullable=True),
        sa.Column('question_count', sa.Integer(), nullable=False),
        sa.Column('questions_returned', sa.Integer(), nullable=False),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('generation_attempts', sa.Integer(), nullable=False),
        sa.Column('provider_calls', sa.Integer(), nullable=False),
        sa.Column('repair_attempted', sa.Boolean(), nullable=False),
        sa.Column('latency_ms', sa.Integer(), nullable=False),
        sa.Column('context_available', sa.Boolean(), nullable=False),
        sa.Column('context_chars', sa.Integer(), nullable=False),
        sa.Column('context_truncated', sa.Boolean(), nullable=False),
        sa.Column('context_sections_used', sa.Integer(), nullable=False),
        sa.Column('context_document_ids', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], name=op.f('fk_ai_generations_requested_by_users')),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], name=op.f('fk_ai_generations_subject_id_subjects'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id'], name=op.f('fk_ai_generations_unit_id_units'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_ai_generations')),
    )
    op.create_index(op.f('ix_ai_generations_requested_by'), 'ai_generations', ['requested_by'], unique=False)
    op.create_index(op.f('ix_ai_generations_subject_id'), 'ai_generations', ['subject_id'], unique=False)
    op.create_index(op.f('ix_ai_generations_unit_id'), 'ai_generations', ['unit_id'], unique=False)

    op.create_table(
        'question_drafts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('generation_id', sa.Uuid(), nullable=False),
        sa.Column('subject_id', sa.Uuid(), nullable=False),
        sa.Column('unit_id', sa.Uuid(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(length=20), nullable=False),
        sa.Column('topic', sa.String(length=300), nullable=False),
        sa.Column('difficulty', sa.String(length=20), nullable=False),
        sa.Column('bloom_level', sa.String(length=20), nullable=False),
        sa.Column('marks', sa.Float(), nullable=False),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('correct_option_index', sa.Integer(), nullable=True),
        sa.Column('expected_answer', sa.Text(), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('quality_signals', sa.JSON(), nullable=True),
        sa.Column('validation_status', sa.String(length=20), nullable=False),
        sa.Column('faculty_review_status', sa.String(length=20), nullable=False),
        sa.Column('ai_original', sa.JSON(), nullable=False),
        sa.Column('reviewed_by', sa.Uuid(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['generation_id'], ['ai_generations.id'], name=op.f('fk_question_drafts_generation_id_ai_generations'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], name=op.f('fk_question_drafts_subject_id_subjects'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id'], name=op.f('fk_question_drafts_unit_id_units'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], name=op.f('fk_question_drafts_reviewed_by_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_question_drafts')),
    )
    op.create_index(op.f('ix_question_drafts_generation_id'), 'question_drafts', ['generation_id'], unique=False)
    op.create_index(op.f('ix_question_drafts_subject_id'), 'question_drafts', ['subject_id'], unique=False)
    op.create_index(op.f('ix_question_drafts_unit_id'), 'question_drafts', ['unit_id'], unique=False)
    op.create_index(op.f('ix_question_drafts_faculty_review_status'), 'question_drafts', ['faculty_review_status'], unique=False)

    op.create_table(
        'draft_feedback',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('draft_id', sa.Uuid(), nullable=False),
        sa.Column('generation_id', sa.Uuid(), nullable=False),
        sa.Column('reviewer_id', sa.Uuid(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('rejection_reason', sa.String(length=50), nullable=True),
        sa.Column('comment', sa.String(length=1000), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('previous_review_status', sa.String(length=20), nullable=False),
        sa.Column('before_snapshot', sa.JSON(), nullable=False),
        sa.Column('after_snapshot', sa.JSON(), nullable=True),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['draft_id'], ['question_drafts.id'], name=op.f('fk_draft_feedback_draft_id_question_drafts'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['generation_id'], ['ai_generations.id'], name=op.f('fk_draft_feedback_generation_id_ai_generations'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], name=op.f('fk_draft_feedback_reviewer_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_draft_feedback')),
    )
    op.create_index(op.f('ix_draft_feedback_draft_id'), 'draft_feedback', ['draft_id'], unique=False)
    op.create_index(op.f('ix_draft_feedback_generation_id'), 'draft_feedback', ['generation_id'], unique=False)
    op.create_index(op.f('ix_draft_feedback_reviewer_id'), 'draft_feedback', ['reviewer_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_draft_feedback_reviewer_id'), table_name='draft_feedback')
    op.drop_index(op.f('ix_draft_feedback_generation_id'), table_name='draft_feedback')
    op.drop_index(op.f('ix_draft_feedback_draft_id'), table_name='draft_feedback')
    op.drop_table('draft_feedback')
    op.drop_index(op.f('ix_question_drafts_faculty_review_status'), table_name='question_drafts')
    op.drop_index(op.f('ix_question_drafts_unit_id'), table_name='question_drafts')
    op.drop_index(op.f('ix_question_drafts_subject_id'), table_name='question_drafts')
    op.drop_index(op.f('ix_question_drafts_generation_id'), table_name='question_drafts')
    op.drop_table('question_drafts')
    op.drop_index(op.f('ix_ai_generations_unit_id'), table_name='ai_generations')
    op.drop_index(op.f('ix_ai_generations_subject_id'), table_name='ai_generations')
    op.drop_index(op.f('ix_ai_generations_requested_by'), table_name='ai_generations')
    op.drop_table('ai_generations')
