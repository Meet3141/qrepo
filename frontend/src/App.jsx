import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';

// Layout
import Layout from './components/Layout';

// Public Pages
import Login from './pages/Login';
import Splash from './pages/Splash';
import NotFound from './pages/NotFound';

// Dashboard Pages (role-specific)
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import HodDashboard from './pages/HodDashboard';

// Shared Feature Pages
import SubjectManagement from './pages/SubjectManagement';
import DocumentManagement from './pages/DocumentManagement';
import QuestionBank from './pages/QuestionBank';
import UserManagement from './pages/UserManagement';
import GeneratedPapers from './pages/GeneratedPapers';
import PaperGenerator from './pages/PaperGenerator';
import FacultyAnalytics from './pages/FacultyAnalytics';
import HodApprovals from './pages/HodApprovals';
import RoleManagement from './pages/RoleManagement';
import HodFacultyManagement from './pages/HodFacultyManagement';
import StudentSubjects from './pages/StudentSubjects';
import StudentAnalytics from './pages/StudentAnalytics';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />

        {/* All protected routes require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>

            {/* Admin-only Routes */}
            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/roles" element={<RoleManagement />} />
            </Route>

            {/* HOD-only Routes */}
            <Route element={<RoleRoute allowedRoles={['hod']} />}>
              <Route path="/dashboard/hod" element={<HodDashboard />} />
              <Route path="/hod/faculty" element={<HodFacultyManagement />} />
              <Route path="/hod/approvals" element={<HodApprovals />} />
            </Route>

            {/* Faculty-only Routes */}
            <Route element={<RoleRoute allowedRoles={['faculty']} />}>
              <Route path="/dashboard/faculty" element={<FacultyDashboard />} />
              <Route path="/faculty/analytics" element={<FacultyAnalytics />} />
            </Route>

            {/* Student-only Routes */}
            <Route element={<RoleRoute allowedRoles={['student']} />}>
              <Route path="/dashboard/student" element={<StudentDashboard />} />
              <Route path="/student/subjects" element={<StudentSubjects />} />
              <Route path="/student/analytics" element={<StudentAnalytics />} />
            </Route>

            {/* Shared Routes (admin, hod, faculty) */}
            <Route element={<RoleRoute allowedRoles={['admin', 'hod', 'faculty']} />}>
              <Route path="/dashboard/subjects" element={<SubjectManagement />} />
              <Route path="/subjects" element={<SubjectManagement />} />
              <Route path="/dashboard/documents" element={<DocumentManagement />} />
              <Route path="/documents" element={<DocumentManagement />} />
              <Route path="/question-bank" element={<QuestionBank />} />
              <Route path="/generator" element={<PaperGenerator />} />
              <Route path="/dashboard/papers" element={<GeneratedPapers />} />
            </Route>

            {/* Settings (admin only) */}
            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/settings/ai" element={<AIConfigPlaceholder />} />
            </Route>

            {/* 404 within layout */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        {/* Catch-all outside layout */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

// Temporary AI Config page
function AIConfigPlaceholder() {
  return (
    <div className="w-full flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-on-surface">AI Configuration & Logs</h1>
        <p className="text-[13px] text-on-surface-variant mt-1">Manage AI model settings and view processing logs</p>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 min-h-[400px] justify-center">
        <span className="material-symbols-outlined text-[56px] text-outline">psychology</span>
        <h3 className="text-[15px] font-semibold text-on-surface">AI Configuration</h3>
        <p className="text-[13px] text-on-surface-variant text-center max-w-md">
          AI model configuration and processing logs will be available here once the AI pipeline is active.
        </p>
      </div>
    </div>
  );
}

export default App;
