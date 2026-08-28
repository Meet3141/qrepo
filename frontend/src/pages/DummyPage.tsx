import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Reusing dashboard styles for simplicity

interface DummyPageProps {
  title: string;
}

export const DummyPage = ({ title }: DummyPageProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">QRepo Dashboard</div>
        <div className="nav-profile">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </nav>
      
      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>{title}</h2>
          <p>You have successfully accessed a role-protected route.</p>
          <button 
            onClick={handleGoBack} 
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              background: '#6366f1', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};
