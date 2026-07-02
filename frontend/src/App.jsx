import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alertes from './pages/Alertes';
import Centrales from './pages/Centrales';
import Materiel from './pages/Materiel';
import Zones from './pages/Zones';
import Rapport from './pages/Rapport';
import Historique from './pages/Historique';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: 'var(--bg-page)' }}>
      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20 }}>⚡</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement STEG...</div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/*" element={
        <Protected>
          <SocketProvider>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/alertes" element={<Alertes />} />
                <Route path="/centrales" element={<Centrales />} />
                <Route path="/materiel" element={<Materiel />} />
                <Route path="/zones" element={<Zones />} />
                <Route path="/rapport" element={<Rapport />} />
                <Route path="/historique" element={<Historique />} />
              </Routes>
            </Layout>
          </SocketProvider>
        </Protected>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
