const BASE = (import.meta.env.VITE_API_URL as string) || "/api/v1";

function authHeaders(headers: HeadersInit = {}) {
  const token = localStorage.getItem("access_token");
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

async function request(path: string, opts: RequestInit = {}) {
  const url = path.startsWith("/") ? `${BASE}${path}` : `${BASE}/${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: authHeaders({ "Content-Type": "application/json", ...(opts.headers ?? {}) }),
    credentials: "include",
  });
  if (!res.ok) throw res;
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { data };
}

export const login = (usernameOrData: any, password?: string) => {
  const data = typeof usernameOrData === "object" ? usernameOrData : { username: usernameOrData, password };
  return request("/auth/login", { method: "POST", body: JSON.stringify(data) });
};
export const me = () => request("/auth/me");
export const meContext = () => request("/auth/me/context");

export const getUsers = () => request("/users");
export const getRoles = () => request("/users/roles");
export const createUser = (data: any) => request("/users", { method: "POST", body: JSON.stringify(data) });
export const updateUser = (id: number, data: any) => request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteUser = (id: number) => request(`/users/${id}`, { method: "DELETE" });
export const uploadUserAvatar = (id: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${BASE}/users/${id}/avatar`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    credentials: "include",
  }).then(async r => ({ data: await r.json() }));
};

export const getAcademicYears = () => request("/academic-years");
export const getCurrentAcademicYear = () => request("/academic-years/current");
export const setCurrentAcademicYear = (id: number) => request(`/academic-years/${id}/set-current`, { method: "POST" });
export const getExams = (params?: Record<string, any>) => request(withQuery("/exams", params));
export const getExamDetail = (id: number) => request(`/exams/${id}/detail`);
export const getExamResults = (id: number) => request(`/exams/${id}/results`);
export const createExam = (data: any) => request("/exams", { method: "POST", body: JSON.stringify(data) });
export const updateExam = (id: number, data: any) => request(`/exams/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const updateExamMas = (id: number, math: number | null, physics: number | null, chemistry: number | null) =>
  updateExam(id, { mas_math: math, mas_physics: physics, mas_chemistry: chemistry });
export const deleteExam = (id: number) => request(`/exams/${id}`, { method: "DELETE" });
export const publishExam = (id: number) => request(`/exams/${id}/publish`, { method: "POST" });
export const unpublishExam = (id: number) => request(`/exams/${id}/unpublish`, { method: "POST" });
export const completeExam = (id: number) => request(`/exams/${id}/complete`, { method: "POST" });
export const reopenExam = (id: number) => request(`/exams/${id}/reopen`, { method: "POST" });
export const evaluateExam = (id: number) => request(`/exams/${id}/evaluate`, { method: "POST" });
export const getEvaluationStatus = (id: number) => request(`/exams/${id}/evaluation/status`);
export const clearExamResults = (id: number, branchId?: number) =>
  request(withQuery(`/exams/${id}/results`, { branch_id: branchId }), { method: "DELETE" });

export const getPrograms = () => request("/programs");
export const getClasses = () => request("/classes");
export const getSections = () => request("/sections");

export const getBranches = () => request("/branches");
export const createBranch = (data: any) => request("/branches", { method: "POST", body: JSON.stringify(data) });
export const updateBranch = (id: number, data: any) => request(`/branches/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteBranch = (id: number) => request(`/branches/${id}`, { method: "DELETE" });

export const getCommandCenter = (academicYearId?: number) =>
  request(withQuery("/analytics/command-center", { academic_year_id: academicYearId }));

export const getStudents = (params?: Record<string, any>) => request(withQuery("/students", params));
export const createStudent = (data: any) => request("/students", { method: "POST", body: JSON.stringify(data) });
export const updateStudent = (id: number, data: any) => request(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteStudent = (id: number) => request(`/students/${id}`, { method: "DELETE" });
export const studentHasHistory = (id: number) => request(`/students/${id}/has-history`);
export const reactivateStudent = (id: number) => request(`/students/${id}/reactivate`, { method: "POST" });
export const uploadStudentsExcel = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${BASE}/students/upload/excel`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    credentials: "include",
  }).then(async r => ({ data: await r.json() }));
};
export const downloadStudentsTemplate = () =>
  fetch(`${BASE}/students/upload/template`, { headers: authHeaders(), credentials: "include" }).then(async r => ({ data: await r.blob() }));
export const downloadSectionTemplate = () =>
  fetch(`${BASE}/students/upload/section-template`, { headers: authHeaders(), credentials: "include" }).then(async r => ({ data: await r.blob() }));
export const uploadSectionExcel = (file: File, academicYearId: number) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${BASE}/students/upload/section-excel?academic_year_id=${encodeURIComponent(String(academicYearId))}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    credentials: "include",
  }).then(async r => ({ data: await r.json() }));
};
export const assignStudentSection = (studentId: number, branchSectionId: number, academicYearId: number) =>
  request(`/students/${studentId}/section`, {
    method: "PUT",
    body: JSON.stringify({ branch_section_id: branchSectionId, academic_year_id: academicYearId }),
  });
export const removeStudentSection = (studentId: number, academicYearId: number) =>
  request(`/students/${studentId}/section?academic_year_id=${encodeURIComponent(String(academicYearId))}`, { method: "DELETE" });

export const searchStudents = (q: any, academicYearId?: number) =>
  request(withQuery("/analytics/student-search", { q, academic_year_id: academicYearId }));
export const getStudentReport = (id: number, academicYearId?: number) =>
  request(withQuery(`/analytics/student-report/${id}`, { academic_year_id: academicYearId }));

export const createProgram = (data: any) => request("/programs", { method: "POST", body: JSON.stringify(data) });
export const updateProgram = (id: number, data: any) => request(`/programs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteProgram = (id: number) => request(`/programs/${id}`, { method: "DELETE" });

export const createClass = (data: any) => request("/classes", { method: "POST", body: JSON.stringify(data) });
export const updateClass = (id: number, data: any) => request(`/classes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteClass = (id: number) => request(`/classes/${id}`, { method: "DELETE" });

export const createSection = (data: any) => request("/sections", { method: "POST", body: JSON.stringify(data) });
export const updateSection = (id: number, data: any) => request(`/sections/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteSection = (id: number) => request(`/sections/${id}`, { method: "DELETE" });

export const getExamQuestions = (examId: number) => request(`/exams/${examId}/questions`);
export const updateExamQuestion = (examId: number, id: number, data: any) =>
  request(`/exams/${examId}/questions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const downloadExamQuestionTemplate = (examId: number) =>
  fetch(`${BASE}/exams/${examId}/questions/upload/template`, { headers: authHeaders(), credentials: "include" }).then(async r => ({ data: await r.blob() }));
export const uploadExamQuestionsExcel = (examId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${BASE}/exams/${examId}/questions/upload/excel`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    credentials: "include",
  }).then(async r => ({ data: await r.json() }));
};
export const clearExamQuestions = (examId: number) => request(`/exams/${examId}/questions`, { method: "DELETE" });

export const validateOMRFile = (examId: number, branchId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${BASE}/exams/${examId}/results/validate?branch_id=${encodeURIComponent(String(branchId))}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    credentials: "include",
  }).then(async r => ({ data: await r.json() }));
};
export const saveOMRResults = (examId: number, branchId: number, records: any[], summary: any = {}) =>
  request(`/exams/${examId}/results/save`, {
    method: "POST",
    body: JSON.stringify({ exam_id: examId, branch_id: branchId, records, ...summary }),
  });

export const updateMyTheme = (data: any) => request("/users/me/theme", { method: "PATCH", body: JSON.stringify(data) });

export const getEvaluatedExams = (academicYearId?: number) =>
  request(withQuery("/analytics/evaluated-exams", { academic_year_id: academicYearId }));
export const getExamPerformance = (examId: number) => request(`/analytics/performance/${examId}`);

export const createAcademicYear = (data: any) => request("/academic-years", { method: "POST", body: JSON.stringify(data) });
export const updateAcademicYear = (id: number, data: any) => request(`/academic-years/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteAcademicYear = (id: number) => request(`/academic-years/${id}`, { method: "DELETE" });

export const getMappings = () => request("/mappings");
export const createFacultySectionMapping = (data: any) => request("/faculty-sections", { method: "POST", body: JSON.stringify(data) });
export const deleteFacultySectionMapping = (id: number) => request(`/faculty-sections/${id}`, { method: "DELETE" });
const withQuery = (path: string, params?: Record<string, any>) => {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
};

export const getDeanBranches = () => request("/mappings/dean-branches");
export const assignDeanBranch = (userId: number, branchId: number) =>
  request("/mappings/dean-branches", { method: "POST", body: JSON.stringify({ user_id: userId, branch_id: branchId }) });
export const removeDeanBranch = (id: number) => request(`/mappings/dean-branches/${id}`, { method: "DELETE" });

export const getPrincipalBranches = () => request("/mappings/principal-branches");
export const assignPrincipalBranch = (userId: number, branchId: number) =>
  request("/mappings/principal-branches", { method: "POST", body: JSON.stringify({ user_id: userId, branch_id: branchId }) });
export const removePrincipalBranch = (id: number) => request(`/mappings/principal-branches/${id}`, { method: "DELETE" });

export const getVicePrincipalBranches = () => request("/mappings/vice-principal-branches");
export const assignVicePrincipalBranch = (userId: number, branchId: number) =>
  request("/mappings/vice-principal-branches", { method: "POST", body: JSON.stringify({ user_id: userId, branch_id: branchId }) });
export const removeVicePrincipalBranch = (id: number) => request(`/mappings/vice-principal-branches/${id}`, { method: "DELETE" });

export const getOperatorBranches = () => request("/mappings/operator-branches");
export const assignOperatorBranch = (userId: number, branchId: number) =>
  request("/mappings/operator-branches", { method: "POST", body: JSON.stringify({ user_id: userId, branch_id: branchId }) });
export const removeOperatorBranch = (id: number) => request(`/mappings/operator-branches/${id}`, { method: "DELETE" });

export const getBranchPrograms = (params?: Record<string, any>) => request(withQuery("/mappings/branch-programs", params));
export const assignBranchProgram = (academicYearId: number, branchId: number, programId: number) =>
  request("/mappings/branch-programs", {
    method: "POST",
    body: JSON.stringify({ academic_year_id: academicYearId, branch_id: branchId, program_id: programId }),
  });
export const removeBranchProgram = (id: number) => request(`/mappings/branch-programs/${id}`, { method: "DELETE" });

export const getBranchSections = (params?: Record<string, any>) => request(withQuery("/mappings/branch-sections", params));
export const createBranchSection = (data: any) => request("/mappings/branch-sections", { method: "POST", body: JSON.stringify(data) });
export const deleteBranchSection = (id: number) => request(`/mappings/branch-sections/${id}`, { method: "DELETE" });

export const getFacultySections = (params?: Record<string, any>) => request(withQuery("/mappings/faculty-sections", params));
export const assignFacultySection = (userId: number, branchSectionId: number, subject: string) =>
  request("/mappings/faculty-sections", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, branch_section_id: branchSectionId, subject }),
  });
export const removeFacultySection = (id: number) => request(`/mappings/faculty-sections/${id}`, { method: "DELETE" });

export const getFacultyOverview = (userId: number, params?: Record<string, any>) =>
  request(withQuery(`/mappings/overview/faculty/${userId}`, params));
export const getProgramOverview = (programId: number, params?: Record<string, any>) =>
  request(withQuery(`/mappings/overview/program/${programId}`, params));
export const getBranchOverview = (branchId: number, params?: Record<string, any>) =>
  request(withQuery(`/mappings/overview/branch/${branchId}`, params));

export const addFacultySubject = (userId: number, subject: string) =>
  request("/mappings/faculty-subject", { method: "POST", body: JSON.stringify({ user_id: userId, subject }) });
export const removeFacultySubject = (id: number) => request(`/mappings/faculty-subject/${id}`, { method: "DELETE" });

// Fallback generic exports
export default {
  request,
};
