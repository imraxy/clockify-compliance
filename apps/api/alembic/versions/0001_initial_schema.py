from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("admin", "reviewer", "employee", native_enum=False), nullable=False),
        sa.Column("clockify_user_id", sa.String(length=64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_clockify_user_id"), "users", ["clockify_user_id"], unique=False)

    op.create_table(
        "company_calendar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("kind", sa.Enum("HOLIDAY", "HACKATHON", native_enum=False), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("day", "kind", name="uq_calendar_day_kind"),
    )
    op.create_index(op.f("ix_company_calendar_day"), "company_calendar", ["day"], unique=False)

    op.create_table(
        "attendance_days",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "day", name="uq_attendance_user_day"),
    )
    op.create_index(op.f("ix_attendance_days_day"), "attendance_days", ["day"], unique=False)
    op.create_index(op.f("ix_attendance_days_user_id"), "attendance_days", ["user_id"], unique=False)

    op.create_table(
        "compliance_overrides",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "day", name="uq_override_user_day"),
    )
    op.create_index(op.f("ix_compliance_overrides_day"), "compliance_overrides", ["day"], unique=False)
    op.create_index(op.f("ix_compliance_overrides_user_id"), "compliance_overrides", ["user_id"], unique=False)

    op.create_table(
        "time_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("start", sa.DateTime(), nullable=False),
        sa.Column("end", sa.DateTime(), nullable=False),
        sa.Column("duration_hours", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("project_name", sa.String(length=512), nullable=False),
        sa.Column("external_id", sa.String(length=128), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_id", "source", name="uq_time_entry_external"),
    )
    op.create_index(op.f("ix_time_entries_start"), "time_entries", ["start"], unique=False)
    op.create_index(op.f("ix_time_entries_user_id"), "time_entries", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_time_entries_user_id"), table_name="time_entries")
    op.drop_index(op.f("ix_time_entries_start"), table_name="time_entries")
    op.drop_table("time_entries")
    op.drop_index(op.f("ix_compliance_overrides_user_id"), table_name="compliance_overrides")
    op.drop_index(op.f("ix_compliance_overrides_day"), table_name="compliance_overrides")
    op.drop_table("compliance_overrides")
    op.drop_index(op.f("ix_attendance_days_user_id"), table_name="attendance_days")
    op.drop_index(op.f("ix_attendance_days_day"), table_name="attendance_days")
    op.drop_table("attendance_days")
    op.drop_index(op.f("ix_company_calendar_day"), table_name="company_calendar")
    op.drop_table("company_calendar")
    op.drop_index(op.f("ix_users_clockify_user_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
