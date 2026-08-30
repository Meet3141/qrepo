import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import './Dashboard.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const roleName = user?.role?.name;

  return (
    <Layout>
      <div className="welcome-card">
        <h2>Welcome back!</h2>
        <p>You are signed in and have access to the dashboard.</p>
        <div className="user-details">
          <p><strong>ID:</strong> {user?.id}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {roleName}</p>
          <p><strong>Status:</strong> Authenticated ✓</p>
        </div>
      </div>
    </Layout>
  );
};
