import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.message || 'Erreur de connexion'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 400px at 50% 20%, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      <div className="login-card" style={{ position: 'relative' }}>
        <div className="login-logo">
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'white', fontSize: 22, fontWeight: 700 }}>⚡</div>
          <h1>STEG</h1>
          <p>Société Tunisienne de l'Électricité et du Gaz<br/>Système de Supervision Réseau</p>
        </div>
        {error && <div className="login-error">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@steg.com.tn" required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary w-full mt-12" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '10px', width: '100%', fontSize: 14 }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div style={{ marginTop: 20, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Comptes de démonstration</div>
          <div>Admin : admin@steg.com.tn / admin123</div>
          <div>Superviseur : k.bensalah@steg.com.tn / admin123</div>
        </div>
      </div>
    </div>
  );
}
