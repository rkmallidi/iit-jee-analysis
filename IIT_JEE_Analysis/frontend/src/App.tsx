import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import LoginPage from "@/pages/auth/Login";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import BranchesPage from "@/pages/branches";
import ProgramsPage from "@/pages/programs";
import ClassesPage from "@/pages/classes";
import SectionsPage from "@/pages/sections";
import MappingsPage from "@/pages/mappings";
import StudentsPage from "@/pages/students";
import StudentMappingPage from "@/pages/student-mapping";
import AcademicYearsPage from "@/pages/academic-years";
import SettingsPage from "@/pages/settings";
import ExamsPage from "@/pages/exams";
import ExamQuestionsPage from "@/pages/exams/questions";
import ResultsPage from "@/pages/results";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/academic-years" element={<AcademicYearsPage />} />
          <Route path="/mappings" element={<MappingsPage />} />
          <Route path="/student-mapping" element={<StudentMappingPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/exams/:examId/questions" element={<ExamQuestionsPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
