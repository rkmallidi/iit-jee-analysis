export type RoleName =
  | "Admin"
  | "Dean"
  | "Principal"
  | "Vice-Principal"
  | "Faculty"
  | "Operator";

export type SubjectName = "Mathematics" | "Chemistry" | "Physics";

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
  is_active: boolean;
  created_at: string;
  roles: Role[];
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
  name: string;
  phone?: string;
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

export type ExamType  = "Mains" | "Advanced";
export type PaperType = "P1" | "P2";

export interface Exam {
  id: number;
  academic_year_id: number;
  program_id: number;
  class_id: number;
  exam_code: string;
  exam_type: ExamType;
  paper: PaperType;
  exam_date: string;
  created_at: string;
  updated_at: string;
  question_count: number;
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
  admission_no: string;
  answers: (number | string)[];
}

export interface OMRValidationSummary {
  valid_count: number;
  duplicate_ids: string[];
  invalid_student_ids: string[];
  missing_students: string[];
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