import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import './Dashboard.css'; // reuses welcome-card / user-details styles

interface DummyPageProps {
  title: string;
}

export const DummyPage = ({ title }: DummyPageProps) => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="welcome-card">
        <h2>{title}</h2>
        <p>This section is reserved for future Sprint features.</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </Layout>
  );
};
