import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Toaster } from './components/Toast'
import Layout from './components/Layout'
import { RequireRole } from './components/Session'
import { ROLES, STAFF } from './api/session'
import './index.css'

// Pages — lazy imports keep the initial bundle small
import Login from './pages/Login'
import Splash from './pages/Splash'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import FacultyDashboard from './pages/FacultyDashboard'
import HodDashboard from './pages/HodDashboard'
import SubjectManagement from './pages/SubjectManagement'
import DocumentManagement from './pages/DocumentManagement'
import QuestionBank from './pages/QuestionBank'
import UserManagement from './pages/UserManagement'
import GeneratedPapers from './pages/GeneratedPapers'
import PaperGenerator from './pages/PaperGenerator'
import FacultyAnalytics from './pages/FacultyAnalytics'
import HodApprovals from './pages/HodApprovals'
import RoleManagement from './pages/RoleManagement'
import HodFacultyManagement from './pages/HodFacultyManagement'
import StudentSubjects from './pages/StudentSubjects'
import StudentAnalytics from './pages/StudentAnalytics'
import Settings from './pages/Settings'
import SystemLogs from './pages/SystemLogs'

const { ADMIN, HOD, FACULTY, STUDENT } = ROLES

const guard = (roles, element) => <RequireRole roles={roles}>{element}</RequireRole>

/**
 * Single flat router — all routes defined here so React Router's data router
 * handles navigation purely client-side with no remounting of the Layout shell.
 *
 * Previously, main.jsx used path="/*" → <App /> → <Routes> which created nested
 * routers: every navigation re-matched the wildcard, remounted <App /> and caused
 * a full page-reload effect. Flattening into one createBrowserRouter call fixes it.
 */
const router = createBrowserRouter([
  { path: '/', element: <Splash /> },
  { path: '/login', element: <Login /> },

  // All authenticated pages share the persistent Layout shell (Sidebar + TopBar).
  // The shell is mounted ONCE and only <Outlet /> swaps on navigation.
  {
    element: <Layout />,
    children: [
      // Dashboards
      { path: '/dashboard/admin',   element: guard([ADMIN],   <AdminDashboard />) },
      { path: '/dashboard/hod',     element: guard([HOD],     <HodDashboard />) },
      { path: '/dashboard/faculty', element: guard([FACULTY], <FacultyDashboard />) },
      { path: '/dashboard/student', element: guard([STUDENT], <StudentDashboard />) },

      // Subjects & Documents (also accessible at /dashboard/* aliases)
      { path: '/dashboard/subjects',  element: guard(STAFF, <SubjectManagement />) },
      { path: '/dashboard/documents', element: guard(STAFF, <DocumentManagement />) },
      { path: '/subjects',            element: guard(STAFF, <SubjectManagement />) },
      { path: '/documents',           element: guard(STAFF, <DocumentManagement />) },

      // Question Bank & Papers
      { path: '/question-bank',      element: guard(STAFF, <QuestionBank />) },
      { path: '/generator',          element: guard(STAFF, <PaperGenerator />) },
      { path: '/dashboard/papers',   element: guard(STAFF, <GeneratedPapers />) },

      // Faculty
      { path: '/faculty/analytics',  element: guard(STAFF, <FacultyAnalytics />) },

      // HOD
      { path: '/hod/faculty',    element: guard([ADMIN, HOD], <HodFacultyManagement />) },
      { path: '/hod/approvals',  element: guard([ADMIN, HOD], <HodApprovals />) },

      // Admin
      { path: '/admin/users',  element: guard([ADMIN], <UserManagement />) },
      { path: '/admin/roles',  element: guard([ADMIN], <RoleManagement />) },
      { path: '/admin/logs',   element: guard([ADMIN], <SystemLogs />) },

      // Student
      { path: '/student/subjects',   element: guard([STUDENT], <StudentSubjects />) },
      { path: '/student/analytics',  element: guard([STUDENT], <StudentAnalytics />) },

      // Settings
      { path: '/settings/ai', element: <Settings /> },

      // 404 within the layout
      { path: '*', element: <NotFound /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
)
