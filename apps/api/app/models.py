import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    reviewer = "reviewer"
    employee = "employee"


class CalendarType(str, enum.Enum):
    HOLIDAY = "HOLIDAY"
    HACKATHON = "HACKATHON"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        default=UserRole.employee,
    )
    clockify_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    time_entries: Mapped[list["TimeEntry"]] = relationship(back_populates="user")
    attendance_days: Mapped[list["AttendanceDay"]] = relationship(back_populates="user")


class TimeEntry(Base):
    __tablename__ = "time_entries"
    __table_args__ = (UniqueConstraint("external_id", "source", name="uq_time_entry_external"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    start: Mapped[datetime] = mapped_column(DateTime, index=True)
    end: Mapped[datetime] = mapped_column(DateTime)
    duration_hours: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text, default="")
    project_name: Mapped[str] = mapped_column(String(512), default="")
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="clockify_api")  # clockify_api | csv

    user: Mapped["User"] = relationship(back_populates="time_entries")


class AttendanceDay(Base):
    __tablename__ = "attendance_days"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_attendance_user_day"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    code: Mapped[str] = mapped_column(String(32))

    user: Mapped["User"] = relationship(back_populates="attendance_days")


class CompanyCalendarDay(Base):
    __tablename__ = "company_calendar"
    __table_args__ = (UniqueConstraint("day", "kind", name="uq_calendar_day_kind"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    kind: Mapped[CalendarType] = mapped_column(
        Enum(CalendarType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
    )
    label: Mapped[str] = mapped_column(String(255), default="")


class ComplianceOverride(Base):
    __tablename__ = "compliance_overrides"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_override_user_day"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(64))
    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
