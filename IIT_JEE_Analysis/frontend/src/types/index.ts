export type RoleName =
  | "Admin"
  | "Dean"
  | "Principal"
  | "Vice-Principal"
  | "Faculty"
  | "Operator";

export type SubjectName = "Mathematics" | "Chemistry" | "Physics";
export type RankCategory = "Top 10" | "Top 100" | "Top 1000" | "Top 10000" | "Qualifier";

export interface Role {
  id: number;
  name: RoleName;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  whatsapp?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  roles: Role[];
  faculty_subjects?: SubjectName[];
  theme_prefs?: Record<string, unknown>;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export interface Program {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Class {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Section {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface BranchSection {
  id: number;
  academic_year_id: number;
  branch_id: number;
  program_id: number;
  class_id: number;
  section_id: number;
  created_at: string;
  academic_year?: AcademicYear;
  branch?: Branch;
  program?: Program;
  class_?: Class;
  section?: Section;
}

export interface FacultySubject {
  id: number;
  user_id: number;
  subject: SubjectName;
  created_at: string;
}

export interface DeanBranch {
  id: number;
  user_id: number;
  branch_id: number;
  assigned_at: string;
  dean?: User;
  branch?: Branch;
}

export interface PrincipalBranch {
  id: number;
  user_id: number;
  branch_id: number;
  assigned_at: string;
  principal?: User;
  branch?: Branch;
}

export interface BranchProgram {
  id: number;
  academic_year_id: number;
  branch_id: number;
  program_id: number;
  created_at: string;
  academic_year?: AcademicYear;
  branch?: Branch;
  program?: Program;
}

export interface FacultySection {
  id: number;
  user_id: number;
  branch_section_id: number;
  branch_id: number;
  class_id: number;
  section_id: number;
  subject: SubjectName;
  assigned_at: string;
  faculty?: User;
  branch?: Branch;
  class_?: Class;
  section?: Section;
}

export interface StudentSection {
  id: number;
  student_id: number;
  academic_year_id: number;
  branch_section_id: number;
  assigned_at: string;
  branch_section?: BranchSection;
}

export interface Student {
  id: number;
  admission_no: string;
  omr_id: string;
  name: string;
  phone?: string;
  target_rank?: RankCategory | null;
  is_active: boolean;
  created_at: string;
  section_mapping?: StudentSection;
}

export interface UploadResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export type ExamType   = "Mains" | "Advanced";
export type PaperType  = "P1" | "P2";
export type ExamStatus = "draft" | "published" | "completed";

export interface UploadLog {
  branch_id: number;
  uploaded_at: string;
  valid_count: number;
  absent_count: number;
  duplicate_count: number;
  invalid_count: number;
  absent_list: string[];
  file_name: string;
}

export interface Exam {
  id: number;
  academic_year_id: number;
  program_id: number;
  class_id: number;
  exam_code: string;
  exam_type: ExamType;
  paper: PaperType;
  exam_date: string;
  status: ExamStatus;
  mas_mathematics?: number | null;
  mas_physics?: number | null;
  mas_chemistry?: number | null;
  created_at: string;
  updated_at: string;
  question_count: number;
  result_count: number;
  upload_logs: UploadLog[];
}

export interface ExamQuestion {
  id: number;
  exam_id: number;
  qno: number;
  subject: string;
  topic?: string | null;
  sub_topic?: string | null;
  difficulty?: string | null;
  question_type?: string | null;
  marks?: number | null;
  negative_marks?: number | null;
  bkc?: string | null;
  partial_marks?: number | null;
  is_deleted: boolean;
  is_bonus: boolean;
  akc?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OMRValidationRecord {
  omr_id: string;
  answers: (number | string)[];
}

export interface OMRAbsentStudent {
  omr_id: string;
  admission_no: string;
  name: string;
}

export interface OMRValidationSummary {
  valid_count: number;
  duplicate_ids: string[];
  invalid_student_ids: string[];
  missing_students: string[];
  absent_students?: OMRAbsentStudent[];
  errors: string[];
  file_records: OMRValidationRecord[];
  program_id: number;
  class_id: number;
}

export interface ExamResult {
  id: number;
  exam_id: number;
  student_id: number;
  answers: string;
  created_at: string;
  updated_at: string;
}

export interface UserBasic {
  id: number;
  full_name: string;
  username: string;
}

export interface BranchSectionDetail {
  section_name: string;
  student_count: number;
  students: Array<{
    id: number;
    admission_no: string;
    name: string;
  }>;
}

export interface BranchDetail {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  principal?: UserBasic | null;
  dean?: UserBasic | null;
  operator?: UserBasic | null;
  sections: BranchSectionDetail[];
}

export interface ExamDetail {
  id: number;
  exam_code: string;
  exam_type: ExamType;
  exam_date: string;
  program_name: string;
  class_name: string;
  branches: BranchDetail[];
}

export interface Question {
  id: number;
  academic_year_id: number;
  program_id: number;
  class_id: number;
  qno: number;
  subject: string;
  topic?: string | null;
  sub_topic?: string | null;
  difficulty?: string | null;
  question_type?: string | null;
  marks?: number | null;
  negative_marks?: number | null;
  bkc?: string | null;
  partial_marks?: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionResult {
  qno: number;
  subject: string;
  question_type: string | null;
  student_answer: number | string;
  correct_answer: string | null;
  is_correct: boolean | null;
  marks_awarded: number;
  is_bonus: boolean;
  is_deleted: boolean;
}

export interface StudentResult {
  student_id: number;
  admission_no: string;
  name: string;
  target_rank: RankCategory | null;
  branch_id: number | null;
  branch_name: string | null;
  total_score: number;
  math_score: number;
  physics_score: number;
  chemistry_score: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  responses: QuestionResult[];
}

export interface ExamResultsDetail {
  exam_id: number;
  questions: Array<{
    qno: number;
    subject: string;
    question_type: string | null;
    marks: number;
    negative_marks: number;
    bkc: string | null;
    akc: string | null;
    is_bonus: boolean;
    is_deleted: boolean;
  }>;
  students: StudentResult[];
}

export interface EvaluationPaperSummary {
  paper: string;
  students: number;
  mi_total: number | null;
  mi_math: number | null;
  mi_physics: number | null;
  mi_chemistry: number | null;
}

export interface EvaluationSummary {
  exam_code: string;
  exam_type: string;
  total_evaluated: number;
  papers: EvaluationPaperSummary[];
}

export interface EvaluationStatus {
  evaluated: boolean;
  evaluated_count: number;
  last_evaluated_at: string | null;
  cumulative_count: number;
}

// ── Analytics Types ────────────────────────────────────────────────────────────

export interface CommandCenterData {
  pipeline: {
    total_logical: number;
    draft: number;
    published: number;
    completed: number;
    evaluated: number;
  };
  totals: {
    results_uploaded: number;
    students_evaluated: number;
  };
  recent_exams: Array<{
    id: number;
    exam_code: string;
    paper: string;
    exam_type: string;
    exam_date: string;
    status: string;
    result_count: number;
    evaluated: boolean;
  }>;
  branch_uploads: Array<{
    branch_id: number;
    branch_name: string;
    uploaded: boolean;
  }>;
}

export interface EvaluatedExamItem {
  exam_id: number;
  exam_code: string;
  exam_type: string;
  paper: string;
  exam_date: string;
  academic_year_id: number;
  student_count: number;
}

export interface BranchComparisonRow {
  branch_id: number;
  branch_name: string;
  students: number;
  avg_score: number;
  top_score: number;
  avg_math: number;
  avg_physics: number;
  avg_chemistry: number;
  avg_percentile: number;
  above_mi: number | null;
}

export interface Top10Row {
  rank: number;
  student_id: number;
  name: string;
  admission_no: string;
  branch_name: string;
  total_score: number;
  math_score: number;
  physics_score: number;
  chemistry_score: number;
  percentile: number;
  percentile_band: string;
  above_mi: boolean;
}

export interface FacultyPerfRow {
  faculty_id: number;
  faculty_name: string;
  subject: string;
  students: number;
  avg_score: number;
  top_score: number;
}

export interface PerformanceData {
  exam_id: number;
  students: number;
  max_score: number;
  summary: {
    avg_score: number;
    top_score: number;
    avg_math: number;
    avg_physics: number;
    avg_chemistry: number;
    avg_percentile: number;
    mi_total: number | null;
    mi_math: number | null;
    mi_physics: number | null;
    mi_chemistry: number | null;
    above_mi_total: number | null;
    above_mi_math: number | null;
    above_mi_physics: number | null;
    above_mi_chemistry: number | null;
  };
  score_distribution: Array<{ range: string; count: number }>;
  percentile_bands: Record<string, number>;
  branch_comparison: BranchComparisonRow[];
  top10: Top10Row[];
  faculty_performance: FacultyPerfRow[];
}

export interface StudentSearchResult {
  id: number;
  admission_no: string;
  name: string;
  target_rank: RankCategory | null;
  branch_name: string | null;
  section_name: string | null;
}

export interface StudentExamHistory {
  exam_id: number;
  exam_code: string;
  exam_type: string;
  paper: string;
  exam_date: string;
  total_score: number;
  max_score: number;
  math_score: number;
  physics_score: number;
  chemistry_score: number;
  average_percentage: number;
  math_percentage: number;
  physics_percentage: number;
  chemistry_percentage: number;
  overall_rank: number;
  branch_rank: number | null;
  section_rank: number | null;
  overall_percentile: number;
  percentile_band: string;
  rank_change_overall: number | null;
  rank_change_branch: number | null;
  score_change: number | null;
  mi_total: number | null;
  above_mi_total: boolean;
  above_mi_math: boolean;
  above_mi_physics: boolean;
  above_mi_chemistry: boolean;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  math_attempted: number;
  math_correct: number;
  math_wrong: number;
  physics_attempted: number;
  physics_correct: number;
  physics_wrong: number;
  chemistry_attempted: number;
  chemistry_correct: number;
  chemistry_wrong: number;
  math_faculty_names: string[];
  physics_faculty_names: string[];
  chemistry_faculty_names: string[];
  branch_name: string | null;
}

export interface StudentReportData {
  student: {
    id: number;
    admission_no: string;
    name: string;
    target_rank: RankCategory | null;
    branch_name: string | null;
  };
  history: StudentExamHistory[];
  cumulative_history: Array<{
    exam_code: string;
    exam_date: string;
    p1_total: number;
    p2_total: number;
    cumulative_total: number;
    max_score: number;
    cumulative_math: number;
    cumulative_physics: number;
    cumulative_chemistry: number;
    overall_rank: number;
    branch_rank: number | null;
    section_rank: number | null;
    overall_percentile: number;
    percentile_band: string;
    rank_change_overall: number | null;
    average_percentage: number;
    above_mi_total: boolean;
  }>;
  subject_summary: {
    math: { avg_score: number; avg_pct: number; avg_correct: number; avg_wrong: number };
    physics: { avg_score: number; avg_pct: number; avg_correct: number; avg_wrong: number };
    chemistry: { avg_score: number; avg_pct: number; avg_correct: number; avg_wrong: number };
  };
  best_subject: string | null;
  worst_subject: string | null;
  total_exams: number;
  mi_cleared_count: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ThemeConfig {
  theme: "light" | "dark" | "system";
  primaryColor?: string;
  radius?: string;
}

