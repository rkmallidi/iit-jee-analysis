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
import SettingsPage from "@/pages/settings";

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
          <Route path="/mappings" element={<MappingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
