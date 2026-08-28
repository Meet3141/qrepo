import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleName = user?.role?.name;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">QRepo Dashboard</div>
        <div className="nav-links">
          <Link to="/dashboard">Home</Link>
          {roleName === 'Admin' && <Link to="/admin">Admin Panel</Link>}
          {roleName === 'HOD' && <Link to="/hod">HOD Portal</Link>}
          {roleName === 'Faculty' && <Link to="/faculty">Faculty Tools</Link>}
          {roleName === 'Student' && <Link to="/student">Student Hub</Link>}
        </div>
        <div className="nav-profile">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>
      
      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome back!</h2>
          <p>You have successfully accessed a protected route.</p>
          <div className="user-details">
            <p><strong>ID:</strong> {user?.id}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {roleName}</p>
            <p><strong>Status:</strong> Authenticated</p>
          </div>
        </div>
      </main>
    </div>
  );
};
