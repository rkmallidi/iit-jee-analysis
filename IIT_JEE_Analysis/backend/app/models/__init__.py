"""Import all models so SQLAlchemy metadata is fully populated for Alembic."""
from app.models.user import User, Role, UserRole  # noqa: F401
from app.models.branch import Branch  # noqa: F401
from app.models.program import Program  # noqa: F401
from app.models.class_ import Class  # noqa: F401
from app.models.section import Section  # noqa: F401
from app.models.academic_year import AcademicYear  # noqa: F401
from app.models.mapping import (  # noqa: F401
    FacultySubject,
    DeanBranch,
    PrincipalBranch,
    BranchProgram,
    BranchSection,
    FacultySection,
)
from app.models.student import Student  # noqa: F401
from app.models.student_section import StudentSection  # noqa: F401
from app.models.exam import Exam  # noqa: F401
from app.models.exam_question import ExamQuestion  # noqa: F401
from app.models.exam_result import ExamResult  # noqa: F401
from app.models.exam_upload_log import ExamUploadLog  # noqa: F401
from app.models.student_evaluation import StudentEvaluation, StudentCumulativeEvaluation  # noqa: F401
