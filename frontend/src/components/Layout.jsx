import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useEffect, useState } from 'react';
import axios from 'axios';

const NAV = [
  { section: 'SUPERVISION', items: [
    { path: '/dashboard', label: 'Tableau de bord', icon: '⊞' },
    { path: '/alertes', label: 'Alertes & Coupures', icon: '⚡', badge: true },
    { path: '/zones', label: 'Zones', icon: '📍' },
  ]},
  { section: 'INFRASTRUCTURE', items: [
    { path: '/centrales', label: 'Centrales', icon: '🏭' },
    { path: '/materiel', label: 'Matériel', icon: '⚙' },
  ]},
  { section: 'RAPPORTS', items: [
    { path: '/rapport', label: 'Rapport PDF', icon: '📄' },
    { path: '/historique', label: 'Historique', icon: '📋' },
  ]},
];

export default function Layout({ children }) {
  const { user, logout, toggleTheme } = useAuth();
  const { socket, connected } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    axios.get('/api/alertes/actives').then(r => setAlertCount(r.data.data.length)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (!socket) return;
    socket.on('nouvelle_alerte', (alerte) => {
      setAlertCount(c => c + 1);
      addToast(`Coupure signalée — ${alerte.zone_nom}`, alerte.niveau_urgence === 'URGENCE' ? 'danger' : 'warning', '⚡ Nouvelle alerte');
      playAlert(alerte.niveau_urgence);
    });
    socket.on('alerte_decision', () => {
      axios.get('/api/alertes/actives').then(r => setAlertCount(r.data.data.length)).catch(() => {});
    });
    return () => { socket.off('nouvelle_alerte'); socket.off('alerte_decision'); };
  }, [socket]);

  const playAlert = (niveau) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const freqs = niveau === 'URGENCE' ? [880,660,880,660] : niveau === 'CRITIQUE' ? [660,440] : [440];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.25);
        o.start(ctx.currentTime + i * 0.3); o.stop(ctx.currentTime + i * 0.3 + 0.3);
      });
    } catch {}
  };

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">⚡</div>
          <div className="logo-text">
            <strong>STEG</strong>
            <small>Supervision Réseau</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ section, items }) => (
            <div className="nav-section" key={section}>
              <div className="nav-section-label">{section}</div>
              {items.map(item => (
                <button key={item.path} className={`nav-link ${location.pathname === item.path ? 'active' : ''}`} onClick={() => navigate(item.path)}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info-card">
            <div className="avatar-circle">{user?.prenom?.[0]}{user?.nom?.[0]}</div>
            <div className="user-details">
              <div className="user-name">{user?.prenom} {user?.nom}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <h2>{NAV.flatMap(s => s.items).find(i => i.path === location.pathname)?.label || 'STEG'}</h2>
            <p>{now.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} — {now.toLocaleTimeString('fr-FR')}</p>
          </div>
          <div className="topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: connected ? 'var(--success)' : 'var(--danger)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: connected ? 'pulse 2s infinite' : 'none' }} />
              {connected ? 'Temps réel actif' : 'Hors ligne'}
            </div>
            {alertCount > 0 && (
              <button className="btn btn-danger btn-sm" onClick={() => navigate('/alertes')} style={{ animation: 'pulse 2s infinite' }}>
                ⚡ {alertCount} alerte{alertCount > 1 ? 's' : ''}
              </button>
            )}
            <button className="btn btn-icon" onClick={toggleTheme} title="Changer thème">
              {isDark ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-sm" onClick={() => { navigate('/rapport'); }}>📄 Rapport</button>
            <button className="btn btn-sm" onClick={logout} title="Déconnexion">⏻</button>
          </div>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
