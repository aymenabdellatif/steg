import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const TYPE_COLORS = { THERMIQUE: 'badge-blue', HYDRAULIQUE: 'badge-blue', EOLIENNE: 'badge-green', SOLAIRE: 'badge-amber', COMBINEE: 'badge-purple' };
const STATUT_CFG = { EN_MARCHE: { cls: 'badge-green', label: 'En marche' }, ARRET: { cls: 'badge-red', label: 'Arrêt' }, MAINTENANCE: { cls: 'badge-amber', label: 'Maintenance' }, ALERTE: { cls: 'badge-red', label: 'Alerte' } };

function CentraleModal({ centrale, gouvernorats, onClose, onSaved }) {
  const [form, setForm] = useState(centrale || { nom: '', code: '', type: 'THERMIQUE', gouvernorat_id: '', capacite_mw: '', production_actuelle_mw: '', statut: 'EN_MARCHE', responsable: '', telephone_urgence: '', date_mise_en_service: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!centrale;

  const submit = async () => {
    setLoading(true);
    try {
      if (isEdit) await axios.put(`/api/centrales/${centrale.id}`, form);
      else await axios.post('/api/centrales', form);
      onSaved(); onClose();
    } catch (e) { alert(e.response?.data?.message || 'Erreur'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header"><div className="modal-title">{isEdit ? '✏️ Modifier' : '➕ Ajouter'} une centrale</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nom *</label><input className="form-control" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Centrale Thermique Radès" /></div>
            <div className="form-group"><label className="form-label">Code *</label><input className="form-control" value={form.code} onChange={e => set('code', e.target.value)} placeholder="CTR-RAD1" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Type *</label>
              <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                {['THERMIQUE','HYDRAULIQUE','EOLIENNE','SOLAIRE','COMBINEE'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Gouvernorat *</label>
              <select className="form-control" value={form.gouvernorat_id} onChange={e => set('gouvernorat_id', e.target.value)}>
                <option value="">Sélectionner...</option>
                {gouvernorats.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Capacité (MW) *</label><input className="form-control" type="number" value={form.capacite_mw} onChange={e => set('capacite_mw', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Production actuelle (MW)</label><input className="form-control" type="number" value={form.production_actuelle_mw} onChange={e => set('production_actuelle_mw', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Statut</label>
              <select className="form-control" value={form.statut} onChange={e => set('statut', e.target.value)}>
                {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Date mise en service</label><input className="form-control" type="date" value={form.date_mise_en_service || ''} onChange={e => set('date_mise_en_service', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Responsable</label><input className="form-control" value={form.responsable||''} onChange={e => set('responsable', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Tél. urgence</label><input className="form-control" value={form.telephone_urgence||''} onChange={e => set('telephone_urgence', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : isEdit ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Centrales() {
  const { addToast } = useToast();
  const [centrales, setCentrales] = useState([]);
  const [gouvernorats, setGouvernorats] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => axios.get('/api/centrales').then(r => setCentrales(r.data.data)).finally(() => setLoading(false));

  useEffect(() => {
    load();
    axios.get('/api/dashboard/gouvernorats').then(r => setGouvernorats(r.data.data));
  }, []);

  const deleteCentrale = async (id, nom) => {
    if (!window.confirm(`Supprimer "${nom}" ?`)) return;
    try { await axios.delete(`/api/centrales/${id}`); addToast(`Centrale "${nom}" supprimée`, 'success'); load(); }
    catch (e) { addToast(e.response?.data?.message || 'Erreur', 'danger'); }
  };

  const filtered = centrales.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  const totals = { prod: Math.round(centrales.reduce((s, c) => s + parseFloat(c.production_actuelle_mw || 0), 0)), cap: Math.round(centrales.reduce((s, c) => s + parseFloat(c.capacite_mw || 0), 0)) };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total centrales', val: centrales.length, color: 'var(--accent)' },
          { label: 'Production totale', val: `${totals.prod.toLocaleString()} MW`, color: 'var(--success)' },
          { label: 'Capacité totale', val: `${totals.cap.toLocaleString()} MW`, color: 'var(--purple)' },
          { label: 'Taux utilisation', val: totals.cap > 0 ? `${Math.round(totals.prod / totals.cap * 100)}%` : '--', color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: '16px 18px' }}>
          <div className="card-title">Centrales de production ({filtered.length})</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-box"><span style={{ color: 'var(--text-muted)' }}>🔍</span><input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={() => setModal('add')}>➕ Ajouter une centrale</button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Centrale</th><th>Type</th><th>Gouvernorat</th><th>Production</th><th>Capacité</th><th>Taux</th><th>Statut</th><th>Responsable</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const taux = c.capacite_mw > 0 ? Math.round(c.production_actuelle_mw / c.capacite_mw * 100) : 0;
                const sc = STATUT_CFG[c.statut] || STATUT_CFG.EN_MARCHE;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{c.code}</div>
                    </td>
                    <td><span className={`badge ${TYPE_COLORS[c.type] || 'badge-gray'}`}>{c.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.gouvernorat_nom}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{Math.round(c.production_actuelle_mw || 0)} MW</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(c.capacite_mw)} MW</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress" style={{ width: 60 }}><div className="progress-fill progress-blue" style={{ width: `${taux}%` }} /></div>
                        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{taux}%</span>
                      </div>
                    </td>
                    <td><span className={`badge ${sc.cls}`}><span className={`status-dot ${c.statut === 'EN_MARCHE' ? 'pulse' : ''}`} />{sc.label}</span></td>
                    <td style={{ fontSize: 12 }}>{c.responsable || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => setModal({ type: 'edit', data: c })}>✏️</button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteCentrale(c.id, c.nom)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Aucune centrale trouvée</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add' && <CentraleModal gouvernorats={gouvernorats} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'edit' && <CentraleModal centrale={modal.data} gouvernorats={gouvernorats} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}
