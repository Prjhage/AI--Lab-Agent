import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Table, CHAR, Boolean
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36), storing as string.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            # Convert string or UUID object to clean string for pg driver binding
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        # Ensure returned ID is always represented as a clean string in app layers
        return str(value)


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    username = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False) # "student" or "teacher"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    created_labs = relationship("Lab", back_populates="faculty")
    enrolled_labs = relationship("EnrolledLab", back_populates="student")
    completions = relationship("CompletedExperiment", back_populates="student")


class Lab(Base):
    __tablename__ = "labs"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    type = Column(String(20), nullable=False) # "code" or "non-code"
    editor_type = Column(String(20), default="monaco") # "monaco" or "jupyter"
    code = Column(String(10), unique=True, index=True, nullable=False) # 10-char invite code
    faculty_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    faculty = relationship("User", back_populates="created_labs")
    experiments = relationship("Experiment", back_populates="lab", cascade="all, delete-orphan")
    enrollments = relationship("EnrolledLab", back_populates="lab", cascade="all, delete-orphan")


class EnrolledLab(Base):
    __tablename__ = "enrolled_labs"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    student_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    lab_id = Column(GUID, ForeignKey("labs.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="enrolled_labs")
    lab = relationship("Lab", back_populates="enrollments")


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    lab_id = Column(GUID, ForeignKey("labs.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    points = Column(Integer, default=100)
    file_path = Column(String(300), nullable=True) # PDF source for RAG
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lab = relationship("Lab", back_populates="experiments")
    steps = relationship("Step", back_populates="experiment", cascade="all, delete-orphan", order_by="Step.step_order")
    test_cases = relationship("TestCase", back_populates="experiment", cascade="all, delete-orphan")
    completions = relationship("CompletedExperiment", back_populates="experiment", cascade="all, delete-orphan")


class Step(Base):
    __tablename__ = "steps"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    experiment_id = Column(GUID, ForeignKey("experiments.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    expected_command = Column(Text, nullable=True)  # Hidden from students; used by AI for verification
    step_order = Column(Integer, nullable=False)

    # Relationships
    experiment = relationship("Experiment", back_populates="steps")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    experiment_id = Column(GUID, ForeignKey("experiments.id"), nullable=False)
    input = Column(Text, nullable=False)
    expected = Column(Text, nullable=False)

    # Relationships
    experiment = relationship("Experiment", back_populates="test_cases")


class CompletedExperiment(Base):
    __tablename__ = "completed_experiments"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    student_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    experiment_id = Column(GUID, ForeignKey("experiments.id"), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User", back_populates="completions")
    experiment = relationship("Experiment", back_populates="completions")


class StudentDoubt(Base):
    """Captures and AI-summarizes student doubts/questions per experiment for teacher review."""
    __tablename__ = "student_doubts"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    student_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    experiment_id = Column(GUID, ForeignKey("experiments.id"), nullable=False)
    lab_id = Column(GUID, ForeignKey("labs.id"), nullable=False)
    original_question = Column(Text, nullable=False)   # Raw student query
    summary = Column(Text, nullable=False)             # AI-generated concise summary
    topic_tag = Column(String(100), nullable=True)     # e.g. "loops", "syntax error"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User")
    experiment = relationship("Experiment")
    lab = relationship("Lab")


class StudentMistake(Base):
    """Captures code execution and logic mistakes for teacher review."""
    __tablename__ = "student_mistakes"

    id = Column(GUID, primary_key=True, default=generate_uuid)
    student_id = Column(GUID, ForeignKey("users.id"), nullable=False)
    experiment_id = Column(GUID, ForeignKey("experiments.id"), nullable=False)
    lab_id = Column(GUID, ForeignKey("labs.id"), nullable=False)
    error_type = Column(String(100), nullable=False)   # e.g. "Syntax Error", "Wrong Output"
    description = Column(Text, nullable=False)         # Brief description of the failure
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("User")
    experiment = relationship("Experiment")
    lab = relationship("Lab")
