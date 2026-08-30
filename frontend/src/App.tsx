import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DummyPage } from './pages/DummyPage';
import { SubjectList } from './pages/subjects/SubjectList';
import { SubjectDetail } from './pages/subjects/SubjectDetail';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — any authenticated role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Subject Management — all authenticated roles */}
          <Route
            path="/subjects"
            element={
              <ProtectedRoute>
                <SubjectList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id"
            element={
              <ProtectedRoute>
                <SubjectDetail />
              </ProtectedRoute>
            }
          />

          {/* Role Protected Routes (DummyPages kept for future sprint use) */}
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute allowedRoles={['Admin']}>
                <DummyPage title="Admin Panel" />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/hod"
            element={
              <RoleProtectedRoute allowedRoles={['HOD', 'Admin']}>
                <DummyPage title="HOD Portal" />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/faculty"
            element={
              <RoleProtectedRoute allowedRoles={['Faculty', 'HOD', 'Admin']}>
                <DummyPage title="Faculty Tools" />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <RoleProtectedRoute allowedRoles={['Student']}>
                <DummyPage title="Student Hub" />
              </RoleProtectedRoute>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
