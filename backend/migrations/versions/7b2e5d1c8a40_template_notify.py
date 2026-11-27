"""template notify

Revision ID: 7b2e5d1c8a40
Revises: 4f1d2c7a9b3e
Create Date: 2026-11-28 18:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7b2e5d1c8a40"
down_revision: str | Sequence[str] | None = "4f1d2c7a9b3e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "templates",
        sa.Column("notify", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("templates", "notify")
