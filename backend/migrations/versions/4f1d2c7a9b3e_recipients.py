"""recipients

Revision ID: 4f1d2c7a9b3e
Revises: 9e4bbbbe774a
Create Date: 2026-11-28 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4f1d2c7a9b3e"
down_revision: str | Sequence[str] | None = "9e4bbbbe774a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "recipients",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.Column("template_id", sa.String(length=11), nullable=False),
        sa.Column("company", sa.String(length=100), server_default="", nullable=False),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.Column("note", sa.String(length=200), server_default="", nullable=False),
        sa.Column("mark", sa.String(length=4), nullable=True),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("logo_id", sa.String(length=16), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["logo_id"],
            ["logos.id"],
            name=op.f("fk_recipients_logo_id_logos"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["templates.id"],
            name=op.f("fk_recipients_template_id_templates"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_recipients")),
        sa.UniqueConstraint("logo_id", name=op.f("uq_recipients_logo_id")),
    )
    op.create_index(
        op.f("ix_recipients_template_id"), "recipients", ["template_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_recipients_template_id"), table_name="recipients")
    op.drop_table("recipients")
