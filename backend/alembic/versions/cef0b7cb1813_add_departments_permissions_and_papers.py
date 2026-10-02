"""add departments permissions and papers

Revision ID: cef0b7cb1813
Revises: b7d2f4a9c1e3
Create Date: 2026-10-02 18:46:22.431234

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cef0b7cb1813'
down_revision: Union[str, Sequence[str], None] = 'b7d2f4a9c1e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('departments',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('description', sa.String(length=500), nullable=True),
    sa.Column('hod_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['hod_id'], ['users.id'], name=op.f('fk_departments_hod_id_users'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_departments')),
    sa.UniqueConstraint('name', name=op.f('uq_departments_name'))
    )
    op.create_index(op.f('ix_departments_code'), 'departments', ['code'], unique=True)
    op.create_index(op.f('ix_departments_hod_id'), 'departments', ['hod_id'], unique=False)
    op.create_table('role_permissions',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('role_id', sa.Integer(), nullable=False),
    sa.Column('permission_key', sa.String(length=100), nullable=False),
    sa.Column('allowed', sa.Boolean(), nullable=False),
    sa.Column('updated_by', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name=op.f('fk_role_permissions_role_id_roles'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], name=op.f('fk_role_permissions_updated_by_users'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_role_permissions')),
    sa.UniqueConstraint('role_id', 'permission_key', name='uq_role_permissions_role_id_permission_key')
    )
    op.create_index(op.f('ix_role_permissions_role_id'), 'role_permissions', ['role_id'], unique=False)
    op.create_table('papers',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('subject_id', sa.Uuid(), nullable=False),
    sa.Column('created_by', sa.Uuid(), nullable=False),
    sa.Column('exam_type', sa.String(length=50), nullable=False),
    sa.Column('duration_minutes', sa.Integer(), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('blueprint', sa.JSON(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('reviewed_by', sa.Uuid(), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_papers_created_by_users')),
    sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], name=op.f('fk_papers_reviewed_by_users')),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], name=op.f('fk_papers_subject_id_subjects'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_papers'))
    )
    op.create_index(op.f('ix_papers_created_by'), 'papers', ['created_by'], unique=False)
    op.create_index(op.f('ix_papers_status'), 'papers', ['status'], unique=False)
    op.create_index(op.f('ix_papers_subject_id'), 'papers', ['subject_id'], unique=False)
    op.create_table('paper_comments',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('paper_id', sa.Uuid(), nullable=False),
    sa.Column('author_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('body', sa.Text(), nullable=True),
    sa.Column('paper_version', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['author_id'], ['users.id'], name=op.f('fk_paper_comments_author_id_users')),
    sa.ForeignKeyConstraint(['paper_id'], ['papers.id'], name=op.f('fk_paper_comments_paper_id_papers'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_paper_comments'))
    )
    op.create_index(op.f('ix_paper_comments_author_id'), 'paper_comments', ['author_id'], unique=False)
    op.create_index(op.f('ix_paper_comments_paper_id'), 'paper_comments', ['paper_id'], unique=False)
    op.create_table('paper_questions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('paper_id', sa.Uuid(), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('source_draft_id', sa.Uuid(), nullable=True),
    sa.Column('unit_id', sa.Uuid(), nullable=True),
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
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['paper_id'], ['papers.id'], name=op.f('fk_paper_questions_paper_id_papers'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['source_draft_id'], ['question_drafts.id'], name=op.f('fk_paper_questions_source_draft_id_question_drafts'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['unit_id'], ['units.id'], name=op.f('fk_paper_questions_unit_id_units'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_paper_questions'))
    )
    op.create_index(op.f('ix_paper_questions_paper_id'), 'paper_questions', ['paper_id'], unique=False)
    op.create_index(op.f('ix_paper_questions_source_draft_id'), 'paper_questions', ['source_draft_id'], unique=False)
    # batch mode so the FK can be added on SQLite as well as PostgreSQL
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('full_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('department_id', sa.Uuid(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_department_id'), ['department_id'], unique=False)
        batch_op.create_foreign_key(batch_op.f('fk_users_department_id_departments'), 'departments',
                                    ['department_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_users_department_id_departments'), type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_users_department_id'))
        batch_op.drop_column('department_id')
        batch_op.drop_column('full_name')
    op.drop_index(op.f('ix_paper_questions_source_draft_id'), table_name='paper_questions')
    op.drop_index(op.f('ix_paper_questions_paper_id'), table_name='paper_questions')
    op.drop_table('paper_questions')
    op.drop_index(op.f('ix_paper_comments_paper_id'), table_name='paper_comments')
    op.drop_index(op.f('ix_paper_comments_author_id'), table_name='paper_comments')
    op.drop_table('paper_comments')
    op.drop_index(op.f('ix_papers_subject_id'), table_name='papers')
    op.drop_index(op.f('ix_papers_status'), table_name='papers')
    op.drop_index(op.f('ix_papers_created_by'), table_name='papers')
    op.drop_table('papers')
    op.drop_index(op.f('ix_role_permissions_role_id'), table_name='role_permissions')
    op.drop_table('role_permissions')
    op.drop_index(op.f('ix_departments_hod_id'), table_name='departments')
    op.drop_index(op.f('ix_departments_code'), table_name='departments')
    op.drop_table('departments')
