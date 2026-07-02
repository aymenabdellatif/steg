import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const TYPES = ['BOUTEAU','TRANSFORMATEUR','DISJONCTEUR','CABLE','COMPTEUR','GROUPE_ELECTROGENE','RELAIS','AUTRE'];
const STATUT_CFG = {
  OPERATIONNEL: { cls: 'badge-green', label: 'Opérationnel' },
  PANNE: { cls: 'badge-red', label: 'En panne' },
  MAINTENANCE: { cls: 'badge-amber', label: 'Maintenance' },
  HORS_SERVICE: { cls: 'badge-gray', label: 'Hors service' },
};
const TYPE_EMOJI = { BOUTEAU: '🔌', TRANSFORMATEUR: '🔋', DISJONCTEUR: '⚡', CABLE: '〰️', COMPTEUR: '📟', GROUPE_ELECTROGENE: '⚙️', RELAIS: '🔁', AUTRE: '🔧' };

function MaterielModal({ item, centrales, zones, onClose, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState(item || { nom: '', reference: '', type: 'BOUTEAU', marque: '', modele: '', centrale_id: '', zone_id: '', statut: 'OPERATIONNEL', tension_nominale_kv: '', date_installation: '', date_derniere_maintenance: '', prochaine_maintenance: '', observations: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      if (isEdit) await axios.put(`/api/materiel/${item.id}`, form);
      else await axios.post('/api/materiel', form);
      onSaved(); onClose();
    } catch (e) { alert(e.response?.data?.message || 'Erreur'); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header"><div className="modal-title">{isEdit ? '✏️ Modifier' : '➕ Ajouter'} du matériel</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nom *</label><input className="form-control" value={form.nom} onChange={e => set('nom', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Référence *</label><input className="form-control" value={form.reference} onChange={e => set('reference', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Type *</label>
              <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Statut</label>
              <select className="form-control" value={form.statut} onChange={e => set('statut', e.target.value)}>
                {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Marque</label><input className="form-control" value={form.marque||''} onChange={e => set('marque', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Modèle</label><input className="form-control" value={form.modele||''} onChange={e => set('modele', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Centrale associée</label>
              <select className="form-control" value={form.centrale_id||''} onChange={e => set('centrale_id', e.target.value)}>
                <option value="">Aucune</option>
                {centrales.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Zone associée</label>
              <select className="form-control" value={form.zone_id||''} onChange={e => set('zone_id', e.target.value)}>
                <option value="">Aucune</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tension nominale (kV)</label><input className="form-control" type="number" value={form.tension_nominale_kv||''} onChange={e => set('tension_nominale_kv', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Date installation</label><input className="form-control" type="date" value={form.date_installation||''} onChange={e => set('date_installation', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Dernière maintenance</label><input className="form-control" type="date" value={form.date_derniere_maintenance||''} onChange={e => set('date_derniere_maintenance', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Prochaine maintenance</label><input className="form-control" type="date" value={form.prochaine_maintenance||''} onChange={e => set('prochaine_maintenance', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Observations</label><textarea className="form-control" value={form.observations||''} onChange={e => set('observations', e.target.value)} rows={2} /></div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : isEdit ? 'Enregistrer' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Materiel() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [centrales, setCentrales] = useState([]);
  const [zones, setZones] = useState([]);
  const [modal, setModal] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = new URLSearchParams();
    if (filterType) params.append('type', filterType);
    if (filterStatut) params.append('statut', filterStatut);
    axios.get(`/api/materiel?${params}`).then(r => setItems(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    axios.get('/api/centrales').then(r => setCentrales(r.data.data));
    axios.get('/api/zones').then(r => setZones(r.data.data));
  }, [filterType, filterStatut]);

  const deleteItem = async (id, nom) => {
    if (!window.confirm(`Supprimer "${nom}" ?`)) return;
    try { await axios.delete(`/api/materiel/${id}`); addToast(`"${nom}" supprimé`, 'success'); load(); }
    catch (e) { addToast('Erreur suppression', 'danger'); }
  };

  const filtered = items.filter(i => !search || i.nom.toLowerCase().includes(search.toLowerCase()) || i.reference.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: items.length,
    op: items.filter(i => i.statut === 'OPERATIONNEL').length,
    panne: items.filter(i => i.statut === 'PANNE').length,
    maintenance: items.filter(i => i.statut === 'MAINTENANCE').length,
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total matériel', val: stats.total, color: 'var(--accent)' },
          { label: 'Opérationnel', val: stats.op, color: 'var(--success)' },
          { label: 'En panne', val: stats.panne, color: 'var(--danger)' },
          { label: 'Maintenance', val: stats.maintenance, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: '16px 18px' }}>
          <div className="card-title">Matériel STEG ({filtered.length})</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="search-box"><span style={{ color: 'var(--text-muted)' }}>🔍</span><input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="form-control" style={{ width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tous types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="form-control" style={{ width: 150 }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setModal('add')}>➕ Ajouter</button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Matériel</th><th>Type</th><th>Marque/Modèle</th><th>Centrale</th><th>Zone</th><th>Tension</th><th>Statut</th><th>Proch. Maint.</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const sc = STATUT_CFG[item.statut] || STATUT_CFG.OPERATIONNEL;
                const isOverdue = item.prochaine_maintenance && new Date(item.prochaine_maintenance) < new Date();
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{TYPE_EMOJI[item.type] || '🔧'}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{item.reference}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{item.type}</span></td>
                    <td style={{ fontSize: 12 }}>{[item.marque, item.modele].filter(Boolean).join(' / ') || '—'}</td>
                    <td style={{ fontSize: 12 }}>{item.centrale_nom || '—'}</td>
                    <td style={{ fontSize: 12 }}>{item.zone_nom || '—'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{item.tension_nominale_kv ? `${item.tension_nominale_kv} kV` : '—'}</td>
                    <td><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                    <td style={{ fontSize: 11, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {item.prochaine_maintenance ? `${isOverdue ? '⚠ ' : ''}${new Date(item.prochaine_maintenance).toLocaleDateString('fr-FR')}` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" onClick={() => setModal({ type: 'edit', data: item })}>✏️</button>
                        <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteItem(item.id, item.nom)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Aucun matériel trouvé</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add' && <MaterielModal centrales={centrales} zones={zones} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'edit' && <MaterielModal item={modal.data} centrales={centrales} zones={zones} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}
