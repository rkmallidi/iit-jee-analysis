export type RoleName =
  | "Admin"
  | "Dean"
  | "Principal"
  | "Vice-Principal"
  | "Faculty"
  | "Operator";

export type SubjectName = "Maths" | "Chemistry" | "Physics";

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

export interface BranchSection {
  id: number;
  branch_id: number;
  program_id: number;
  class_id: number;
  section_id: number;
  created_at: string;
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
  branch_id: number;
  program_id: number;
  created_at: string;
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
  assigned_at: string;
  faculty?: User;
  branch?: Branch;
  class_?: Class;
  section?: Section;
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