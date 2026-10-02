import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireRole } from './components/Session';
import { ROLES, STAFF } from './api/session';
import Login from './pages/Login';
import Splash from './pages/Splash';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import HodDashboard from './pages/HodDashboard';
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
import Settings from './pages/Settings';
import SystemLogs from './pages/SystemLogs';

const { ADMIN, HOD, FACULTY, STUDENT } = ROLES;

// Role lists mirror the backend's RequireRole/permission defaults for each page's main endpoints
const guard = (roles, element) => <RequireRole roles={roles}>{element}</RequireRole>;

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />

      {/* Authenticated routes with Sidebar & TopBar */}
      <Route element={<Layout />}>
        {/* Dashboard Routes */}
        <Route path="/dashboard/admin" element={guard([ADMIN], <AdminDashboard />)} />
        <Route path="/dashboard/hod" element={guard([HOD], <HodDashboard />)} />
        <Route path="/dashboard/faculty" element={guard([FACULTY], <FacultyDashboard />)} />
        <Route path="/dashboard/student" element={guard([STUDENT], <StudentDashboard />)} />

        {/* Subject & Document Management */}
        <Route path="/dashboard/subjects" element={guard(STAFF, <SubjectManagement />)} />
        <Route path="/dashboard/documents" element={guard(STAFF, <DocumentManagement />)} />
        <Route path="/subjects" element={guard(STAFF, <SubjectManagement />)} />
        <Route path="/documents" element={guard(STAFF, <DocumentManagement />)} />

        {/* Question Bank & Papers */}
        <Route path="/question-bank" element={guard(STAFF, <QuestionBank />)} />
        <Route path="/generator" element={guard(STAFF, <PaperGenerator />)} />
        <Route path="/dashboard/papers" element={guard(STAFF, <GeneratedPapers />)} />

        {/* Faculty */}
        <Route path="/faculty/analytics" element={guard(STAFF, <FacultyAnalytics />)} />

        {/* HOD */}
        <Route path="/hod/faculty" element={guard([ADMIN, HOD], <HodFacultyManagement />)} />
        <Route path="/hod/approvals" element={guard([ADMIN, HOD], <HodApprovals />)} />

        {/* Admin */}
        <Route path="/admin/users" element={guard([ADMIN], <UserManagement />)} />
        <Route path="/admin/roles" element={guard([ADMIN], <RoleManagement />)} />
        <Route path="/admin/logs" element={guard([ADMIN], <SystemLogs />)} />

        {/* Student */}
        <Route path="/student/subjects" element={guard([STUDENT], <StudentSubjects />)} />
        <Route path="/student/analytics" element={guard([STUDENT], <StudentAnalytics />)} />

        {/* Settings (account for everyone; AI provider status for Admin) */}
        <Route path="/settings/ai" element={<Settings />} />

        {/* 404 within layout */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
