"""Add password_hash to users

Revision ID: 002
Revises: 001
Create Date: 2026-02-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import bcrypt


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=True))

    # Legacy dev users get a temporary password hash so NOT NULL can be enforced.
    legacy_hash = bcrypt.hashpw(
        b"ChangeMe123!",
        bcrypt.gensalt(),
    ).decode("utf-8")
    users = sa.table("users", sa.column("password_hash", sa.String()))
    op.execute(
        users.update()
        .where(users.c.password_hash.is_(None))
        .values(password_hash=legacy_hash)
    )

    op.alter_column("users", "password_hash", existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    op.drop_column("users", "password_hash")
