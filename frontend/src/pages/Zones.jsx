import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const STATUT_CFG = {
  ALIMENTE: { cls: 'badge-green', label: 'Alimentée', cardCls: 'alimente' },
  COUPURE: { cls: 'badge-red', label: 'Coupure', cardCls: 'coupure' },
  MAINTENANCE: { cls: 'badge-amber', label: 'Maintenance', cardCls: 'maintenance' },
  PARTIEL: { cls: 'badge-purple', label: 'Partiel', cardCls: 'partiel' },
};
const PRIORITE_CFG = {
  CRITIQUE: { cls: 'badge-red', label: 'Critique' },
  HAUTE: { cls: 'badge-amber', label: 'Haute' },
  NORMALE: { cls: 'badge-blue', label: 'Normale' },
  BASSE: { cls: 'badge-gray', label: 'Basse' },
};

function ZoneModal({ zone, centrales, gouvernorats, onClose, onSaved }) {
  const isEdit = !!zone;
  const [form, setForm] = useState(zone || { nom: '', code: '', centrale_id: '', gouvernorat_id: '', population_desservie: '', nb_abonnes: '', tension_kv: '30', statut: 'ALIMENTE', priorite: 'NORMALE' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      if (isEdit) await axios.put(`/api/zones/${zone.id}`, form);
      else await axios.post('/api/zones', form);
      onSaved(); onClose();
    } catch (e) { alert(e.response?.data?.message || 'Erreur'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><div className="modal-title">{isEdit ? '✏️ Modifier' : '➕ Ajouter'} une zone</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nom *</label><input className="form-control" value={form.nom} onChange={e => set('nom', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Code *</label><input className="form-control" value={form.code} onChange={e => set('code', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Gouvernorat *</label>
              <select className="form-control" value={form.gouvernorat_id} onChange={e => set('gouvernorat_id', e.target.value)}>
                <option value="">Sélectionner...</option>
                {gouvernorats.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Centrale alimentante</label>
              <select className="form-control" value={form.centrale_id||''} onChange={e => set('centrale_id', e.target.value)}>
                <option value="">Aucune</option>
                {centrales.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Population desservie</label><input className="form-control" type="number" value={form.population_desservie||''} onChange={e => set('population_desservie', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Nb abonnés</label><input className="form-control" type="number" value={form.nb_abonnes||''} onChange={e => set('nb_abonnes', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tension (kV)</label><input className="form-control" type="number" value={form.tension_kv||''} onChange={e => set('tension_kv', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Statut</label>
              <select className="form-control" value={form.statut} onChange={e => set('statut', e.target.value)}>
                {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Priorité</label>
            <select className="form-control" value={form.priorite} onChange={e => set('priorite', e.target.value)}>
              {Object.entries(PRIORITE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
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

export default function Zones() {
  const { addToast } = useToast();
  const [zones, setZones] = useState([]);
  const [centrales, setCentrales] = useState([]);
  const [gouvernorats, setGouvernorats] = useState([]);
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatut, setFilterStatut] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => axios.get('/api/zones').then(r => setZones(r.data.data)).finally(() => setLoading(false));

  useEffect(() => {
    load();
    axios.get('/api/centrales').then(r => setCentrales(r.data.data));
    axios.get('/api/dashboard/gouvernorats').then(r => setGouvernorats(r.data.data));
  }, []);

  const deleteZone = async (id, nom) => {
    if (!window.confirm(`Supprimer "${nom}" ?`)) return;
    try { await axios.delete(`/api/zones/${id}`); addToast(`Zone "${nom}" supprimée`, 'success'); load(); }
    catch { addToast('Erreur suppression', 'danger'); }
  };

  const filtered = zones.filter(z => !filterStatut || z.statut === filterStatut);
  const stats = { total: zones.length, alimentees: zones.filter(z => z.statut === 'ALIMENTE').length, coupures: zones.filter(z => z.statut === 'COUPURE').length, abonnes: zones.reduce((s, z) => s + (z.nb_abonnes || 0), 0) };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total zones', val: stats.total, color: 'var(--accent)' },
          { label: 'Alimentées', val: stats.alimentees, color: 'var(--success)' },
          { label: 'Coupures actives', val: stats.coupures, color: 'var(--danger)' },
          { label: 'Total abonnés', val: `${Math.round(stats.abonnes / 1000)}k`, color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="flex-between mb-16">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>⊞ Grille</button>
            <button className={`tab ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>☰ Liste</button>
          </div>
          <select className="form-control" style={{ width: 160 }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('add')}>➕ Ajouter une zone</button>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(z => {
            const sc = STATUT_CFG[z.statut] || STATUT_CFG.ALIMENTE;
            const pc = PRIORITE_CFG[z.priorite] || PRIORITE_CFG.NORMALE;
            return (
              <div key={z.id} className={`zone-card ${sc.cardCls}`}>
                <div className="flex-between mb-8">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{z.nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{z.code}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span className={`badge ${sc.cls}`} style={{ fontSize: 10 }}><span className={`status-dot ${z.statut === 'COUPURE' ? 'pulse' : ''}`} />{sc.label}</span>
                    <span className={`badge ${pc.cls}`} style={{ fontSize: 10 }}>{pc.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>📍 {z.gouvernorat_nom}{z.centrale_nom ? ` · 🏭 ${z.centrale_nom}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Abonnés</div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{(z.nb_abonnes||0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tension</div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{z.tension_kv} kV</div>
                  </div>
                </div>
                {z.alertes_actives > 0 && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>⚡ {z.alertes_actives} alerte(s) active(s)</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setModal({ type: 'edit', data: z })}>✏️ Modifier</button>
                  <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteZone(z.id, z.nom)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Zone</th><th>Gouvernorat</th><th>Centrale</th><th>Abonnés</th><th>Population</th><th>Tension</th><th>Statut</th><th>Priorité</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(z => {
                  const sc = STATUT_CFG[z.statut] || STATUT_CFG.ALIMENTE;
                  const pc = PRIORITE_CFG[z.priorite] || PRIORITE_CFG.NORMALE;
                  return (
                    <tr key={z.id}>
                      <td><div style={{ fontWeight: 600 }}>{z.nom}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{z.code}</div></td>
                      <td style={{ fontSize: 12 }}>{z.gouvernorat_nom}</td>
                      <td style={{ fontSize: 12 }}>{z.centrale_nom || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{(z.nb_abonnes||0).toLocaleString()}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{(z.population_desservie||0).toLocaleString()}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{z.tension_kv} kV</td>
                      <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td><span className={`badge ${pc.cls}`}>{pc.label}</span></td>
                      <td><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-sm" onClick={() => setModal({ type: 'edit', data: z })}>✏️</button><button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteZone(z.id, z.nom)}>🗑</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'add' && <ZoneModal centrales={centrales} gouvernorats={gouvernorats} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'edit' && <ZoneModal zone={modal.data} centrales={centrales} gouvernorats={gouvernorats} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}
