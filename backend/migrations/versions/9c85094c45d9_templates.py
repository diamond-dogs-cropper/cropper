"""templates

Revision ID: 9c85094c45d9
Revises: 62b400b73745
Create Date: 2026-10-21 02:23:52.188048
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "9c85094c45d9"
down_revision: str | Sequence[str] | None = "62b400b73745"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "templates",
        sa.Column("id", sa.String(length=11), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("padding_top", sa.Integer(), nullable=False),
        sa.Column("padding_right", sa.Integer(), nullable=False),
        sa.Column("padding_bottom", sa.Integer(), nullable=False),
        sa.Column("padding_left", sa.Integer(), nullable=False),
        sa.Column("background_color", sa.String(length=7), nullable=True),
        sa.Column("output_format", sa.String(length=4), nullable=False),
        sa.Column("upload_formats", postgresql.ARRAY(sa.String(length=4)), nullable=False),
        sa.Column("is_open", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name=op.f("fk_templates_owner_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_templates")),
    )


def downgrade() -> None:
    op.drop_table("templates")
