import { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS = { THERMIQUE: '#3B82F6', HYDRAULIQUE: '#06B6D4', EOLIENNE: '#22C55E', SOLAIRE: '#F59E0B', COMBINEE: '#8B5CF6' };

function StatCard({ label, value, trend, trendType, iconEmoji, colorClass, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: colorClass === 'icon-red' ? 'var(--danger)' : colorClass === 'icon-green' ? 'var(--success)' : colorClass === 'icon-amber' ? 'var(--warning)' : 'var(--text-primary)' }}>{value}</div>
      {trend && <div className={`stat-trend ${trendType}`}>{trend}</div>}
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      <div className={`stat-icon-box ${colorClass}`} style={{ fontSize: 16 }}>{iconEmoji}</div>
    </div>
  );
}

export default function Dashboard() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => axios.get('/api/dashboard/stats').then(r => setStats(r.data.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!socket) return;
    socket.on('nouvelle_alerte', load);
    socket.on('centrales_refresh', load);
    return () => { socket.off('nouvelle_alerte'); socket.off('centrales_refresh'); };
  }, [socket]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  const c = stats?.centrales || {};
  const z = stats?.zones || {};
  const a = stats?.alertes || {};
  const m = stats?.materiel || {};

  const donutData = [
    { name: 'Alimentées', value: parseInt(z.alimentees) || 0, color: '#22C55E' },
    { name: 'Coupures', value: parseInt(z.coupures) || 0, color: '#EF4444' },
    { name: 'Partiel', value: parseInt(z.partiel) || 0, color: '#8B5CF6' },
    { name: 'Maintenance', value: parseInt(z.maintenance) || 0, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div className="stats-grid">
        <StatCard label="Production totale" value={`${Math.round(c.production_totale || 0).toLocaleString()} MW`} trend="↑ Réseau nominal" trendType="trend-up" iconEmoji="⚡" colorClass="icon-blue" />
        <StatCard label="Zones alimentées" value={`${z.alimentees || 0} / ${z.total || 0}`} trend={`${(((z.alimentees||0)/(z.total||1))*100).toFixed(0)}% du réseau`} trendType="trend-up" iconEmoji="📍" colorClass="icon-green" />
        <StatCard label="Alertes actives" value={a.total || 0} trend={`${a.urgences||0} urgence(s) · ${a.critiques||0} critique(s)`} trendType={a.total > 0 ? 'trend-down' : 'trend-up'} iconEmoji="⚡" colorClass="icon-red" />
        <StatCard label="Abonnés desservis" value={`${Math.round((z.total_abonnes||0)/1000)}k`} sub={`Pop. ${Math.round((z.population_totale||0)/1000)}k`} iconEmoji="👥" colorClass="icon-purple" />
      </div>

      <div className="grid-65-35 mb-20">
        <div className="card">
          <div className="card-header mb-16">
            <div><div className="card-title">Production — 7 derniers jours (MW)</div><div className="card-sub">Toutes centrales</div></div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={stats?.production7j || []}>
                <defs>
                  <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="jour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="production" name="MW" stroke="#3B82F6" fill="url(#gProd)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">État des zones</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {donutData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: d.color, display: 'inline-block' }} />{d.name}</span>
                  <span style={{ fontWeight: 600, color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-20">
        <div className="card">
          <div className="card-header mb-16"><div className="card-title">Top 6 centrales — Production MW</div></div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {(stats?.topCentrales || []).map(c => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[c.type] || '#6B7280', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nom}</div>
                  <div className="progress mt-4">
                    <div className="progress-fill progress-blue" style={{ width: `${c.taux || 0}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(c.production_actuelle_mw)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.taux}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header mb-16">
            <div className="card-title">Synthèse infrastructure</div>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/alertes')}>Voir alertes</button>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {[
              { label: 'Centrales en marche', val: c.en_marche, total: c.total, color: 'var(--success)' },
              { label: 'Zones alimentées', val: z.alimentees, total: z.total, color: 'var(--accent)' },
              { label: 'Matériel opérationnel', val: m.operationnels, total: m.total, color: 'var(--purple)' },
              { label: 'Alertes en cours', val: a.total, total: null, color: a.total > 0 ? 'var(--danger)' : 'var(--success)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>
                  {item.val}{item.total ? ` / ${item.total}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
