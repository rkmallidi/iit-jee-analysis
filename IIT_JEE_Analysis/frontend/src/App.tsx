import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import LoginPage from "@/pages/auth/Login";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import MasterDataPage from "@/pages/master-data";
import MappingsPage from "@/pages/mappings";
import StudentsPage from "@/pages/students";
import StudentMappingPage from "@/pages/student-mapping";
import SettingsPage from "@/pages/settings";
import ExamsPage from "@/pages/exams";
import ExamQuestionsPage from "@/pages/exams/questions";
import ResultsPage from "@/pages/results";
import BranchResultsPage from "@/pages/branch-results";
import AnalyticsPage from "@/pages/analytics";
import StudentReportPage from "@/pages/student-report";

const G = ProtectedRoute;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          {/* Everyone authenticated */}
          <Route path="/" element={<G check={a => !a.isOperator()}><DashboardPage /></G>} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Admin only — Institute Setup (combined) */}
          <Route path="/master-data"    element={<G check={a => a.canAccessMasterData()}><MasterDataPage /></G>} />
          {/* Redirects from old individual routes */}
          <Route path="/academic-years" element={<Navigate to="/master-data?tab=academic-years" replace />} />
          <Route path="/branches"       element={<Navigate to="/master-data?tab=branches" replace />} />
          <Route path="/programs"       element={<Navigate to="/master-data?tab=programs" replace />} />
          <Route path="/classes"        element={<Navigate to="/master-data?tab=classes" replace />} />
          <Route path="/sections"       element={<Navigate to="/master-data?tab=sections" replace />} />
          <Route path="/users"          element={<G check={a => a.isAdmin()}><UsersPage /></G>} />

          {/* Admin only — Mappings */}
          <Route path="/mappings"        element={<G check={a => a.canAccessMappings()}><MappingsPage /></G>} />
          <Route path="/student-mapping" element={<G check={a => a.canAccessMappings()}><StudentMappingPage /></G>} />

          {/* Admin + Dean + Principal + VP */}
          <Route path="/students"       element={<G check={a => a.canAccessStudents()}><StudentsPage /></G>} />
          <Route path="/branch-results" element={<G check={a => a.canAccessResults()}><BranchResultsPage /></G>} />
          <Route path="/analytics"      element={<G check={a => a.canAccessAnalytics()}><AnalyticsPage /></G>} />
          <Route path="/student-report" element={<G check={a => a.canAccessAnalytics()}><StudentReportPage /></G>} />

          {/* Admin + Dean + Principal + VP */}
          <Route path="/exams"                        element={<G check={a => a.canAccessExams()}><ExamsPage /></G>} />
          <Route path="/exams/:examId/questions"      element={<G check={a => a.canAccessExams()}><ExamQuestionsPage /></G>} />

          {/* Admin + Principal + Operator */}
          <Route path="/results" element={<G check={a => a.canUploadOMR()}><ResultsPage /></G>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
