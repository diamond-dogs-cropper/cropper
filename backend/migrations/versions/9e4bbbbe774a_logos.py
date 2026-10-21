"""logos

Revision ID: 9e4bbbbe774a
Revises: 9c85094c45d9
Create Date: 2026-10-21 04:14:08.898571
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9e4bbbbe774a"
down_revision: str | Sequence[str] | None = "9c85094c45d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "logos",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.Column("template_id", sa.String(length=11), nullable=False),
        sa.Column("company", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["templates.id"],
            name=op.f("fk_logos_template_id_templates"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_logos")),
    )
    op.create_index(op.f("ix_logos_template_id"), "logos", ["template_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_logos_template_id"), table_name="logos")
    op.drop_table("logos")
