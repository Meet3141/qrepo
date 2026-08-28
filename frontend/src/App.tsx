import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DummyPage } from './pages/DummyPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Role Protected Routes */}
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
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
