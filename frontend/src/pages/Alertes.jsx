import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const NIVEAU_CFG = {
  URGENCE: { label: 'URGENCE', emoji: '🚨', cls: 'badge-red', cardCls: 'urgence' },
  CRITIQUE: { label: 'CRITIQUE', emoji: '🔴', cls: 'badge-red', cardCls: 'critique' },
  AVERTISSEMENT: { label: 'AVERTISSEMENT', emoji: '⚠️', cls: 'badge-amber', cardCls: 'avertissement' },
  INFO: { label: 'INFO', emoji: 'ℹ️', cls: 'badge-blue', cardCls: 'info' },
};

const TYPE_LABELS = {
  COUPURE_SIGNALEMENT: 'Coupure signalée', COUPURE_AUTOMATIQUE: 'Coupure automatique',
  SURCHARGE: 'Surcharge réseau', COURT_CIRCUIT: 'Court-circuit',
  SABOTAGE_SUSPECT: 'Sabotage suspect', MAINTENANCE_URGENTE: 'Maintenance urgente', CHUTE_TENSION: 'Chute de tension',
};

function durée(min) {
  if (!min && min !== 0) return '--';
  return min >= 60 ? `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}` : `${min}min`;
}

function DecisionModal({ alerte, onClose, onDecision }) {
  const [selected, setSelected] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const options = [
    { key: 'SERVICE_TECHNIQUE', label: 'Appeler le Service Technique', emoji: '🔧', desc: 'Dépêcher une équipe technique sur le terrain pour réparer la panne.', cls: 'selected-tech' },
    { key: 'POLICE', label: 'Appeler la Police', emoji: '🚔', desc: 'Acte de sabotage ou intrusion suspecte. Intervention sécuritaire requise.', cls: 'selected-police' },
    { key: 'RESOLU', label: 'Marquer comme résolu', emoji: '✅', desc: 'La situation est rétablie. La zone est de nouveau alimentée.', cls: 'selected-resolu' },
    { key: 'ANNULE', label: 'Annuler / Fausse alerte', emoji: '❌', desc: 'Fausse alarme ou signalement erroné. Aucune action requise.', cls: '' },
  ];

  const confirm = async () => {
    if (!selected) return;
    setLoading(true);
    await onDecision(alerte.id, selected, comment);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">🚨 Prise de décision — Alerte #{alerte.id}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Zone : {alerte.zone_nom} · {alerte.gouvernorat_nom}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: alerte.niveau_urgence === 'URGENCE' ? 'var(--danger-light)' : 'var(--warning-light)', border: `1px solid ${alerte.niveau_urgence === 'URGENCE' ? 'var(--danger)' : 'var(--warning)'}`, borderRadius: 'var(--radius-lg)', padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{NIVEAU_CFG[alerte.niveau_urgence]?.emoji} {TYPE_LABELS[alerte.type_alerte]}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alerte.description}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>👥 {(alerte.nb_abonnes||0).toLocaleString()} abonnés</span>
              <span>🏘️ {(alerte.population_desservie||0).toLocaleString()} habitants</span>
              <span>⏱ En cours depuis {durée(alerte.duree_actuelle)}</span>
              <span>📞 {alerte.nb_signalements || 0} signalement(s)</span>
            </div>
            {alerte.telephone_urgence && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent)' }}>📞 Centrale : {alerte.telephone_urgence}</div>
            )}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Choisir une action</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {options.map(opt => (
              <div key={opt.key} className={`decision-option ${selected === opt.key ? opt.cls : ''}`} onClick={() => setSelected(opt.key)}>
                <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Commentaire (optionnel)</label>
            <textarea className="form-control" value={comment} onChange={e => setComment(e.target.value)} placeholder="Détails sur la décision prise..." rows={2} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={confirm} disabled={!selected || loading}>{loading ? '...' : 'Confirmer la décision'}</button>
        </div>
      </div>
    </div>
  );
}

function AddAlerteModal({ onClose, onAdded }) {
  const [zones, setZones] = useState([]);
  const [centrales, setCentrales] = useState([]);
  const [form, setForm] = useState({ zone_id: '', centrale_id: '', type_alerte: 'COUPURE_SIGNALEMENT', niveau_urgence: 'AVERTISSEMENT', source: 'SIGNALEMENT_CLIENT', description: '', nb_signalements: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/zones').then(r => setZones(r.data.data));
    axios.get('/api/centrales').then(r => setCentrales(r.data.data));
  }, []);

  const submit = async () => {
    if (!form.zone_id || !form.type_alerte) return;
    setLoading(true);
    try {
      const r = await axios.post('/api/alertes', form);
      onAdded(r.data.data);
      onClose();
    } catch (e) { alert(e.response?.data?.message || 'Erreur'); }
    setLoading(false);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><div className="modal-title">⚡ Déclarer une coupure / alerte</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Zone concernée *</label>
              <select className="form-control" value={form.zone_id} onChange={e => set('zone_id', e.target.value)}>
                <option value="">Sélectionner...</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.nom} ({z.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Centrale liée</label>
              <select className="form-control" value={form.centrale_id} onChange={e => set('centrale_id', e.target.value)}>
                <option value="">Aucune</option>
                {centrales.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type d'événement *</label>
              <select className="form-control" value={form.type_alerte} onChange={e => set('type_alerte', e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Niveau d'urgence *</label>
              <select className="form-control" value={form.niveau_urgence} onChange={e => set('niveau_urgence', e.target.value)}>
                <option value="INFO">Info</option>
                <option value="AVERTISSEMENT">Avertissement</option>
                <option value="CRITIQUE">Critique</option>
                <option value="URGENCE">Urgence</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source du signalement</label>
              <select className="form-control" value={form.source} onChange={e => set('source', e.target.value)}>
                <option value="SIGNALEMENT_CLIENT">Signalement client</option>
                <option value="DETECTION_AUTOMATIQUE">Détection automatique</option>
                <option value="TECHNICIEN">Technicien</option>
                <option value="CAPTEUR">Capteur réseau</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre de signalements</label>
              <input className="form-control" type="number" min={1} value={form.nb_signalements} onChange={e => set('nb_signalements', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Décrivez la situation..." rows={3} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-danger" onClick={submit} disabled={loading || !form.zone_id}>⚡ Déclarer l'alerte</button>
        </div>
      </div>
    </div>
  );
}

export default function Alertes() {
  const { socket } = useSocket();
  const { addToast } = useToast();
  const [alertes, setAlertes] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [onglet, setOnglet] = useState('actives');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadActives = () => axios.get('/api/alertes/actives').then(r => setAlertes(r.data.data));
  const loadHistorique = () => axios.get('/api/alertes?statut=RESOLU&limit=40').then(r => setHistorique(r.data.data));

  useEffect(() => { Promise.all([loadActives(), loadHistorique()]).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('nouvelle_alerte', () => loadActives());
    socket.on('alerte_decision', () => { loadActives(); loadHistorique(); });
    return () => { socket.off('nouvelle_alerte'); socket.off('alerte_decision'); };
  }, [socket]);

  const handleDecision = async (id, decision, commentaire) => {
    await axios.put(`/api/alertes/${id}/decision`, { decision, commentaire_decision: commentaire });
    addToast(`Décision "${decision}" enregistrée`, 'success', 'Action prise');
    loadActives(); loadHistorique();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  const urgentes = alertes.filter(a => ['URGENCE', 'CRITIQUE'].includes(a.niveau_urgence));

  return (
    <div>
      {urgentes.length > 0 && (
        <div style={{ background: 'var(--danger-light)', border: '2px solid var(--danger)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 15 }}>{urgentes.length} alerte{urgentes.length > 1 ? 's' : ''} critique{urgentes.length > 1 ? 's' : ''} — Action requise</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{urgentes.map(a => a.zone_nom).join(' · ')}</div>
          </div>
          <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setSelected(urgentes[0])}>Prendre une décision</button>
        </div>
      )}

      <div className="flex-between mb-16">
        <div className="tabs">
          <button className={`tab ${onglet === 'actives' ? 'active' : ''}`} onClick={() => setOnglet('actives')}>Actives ({alertes.length})</button>
          <button className={`tab ${onglet === 'historique' ? 'active' : ''}`} onClick={() => setOnglet('historique')}>Historique ({historique.length})</button>
        </div>
        <button className="btn btn-danger" onClick={() => setShowAdd(true)}>⚡ Déclarer une coupure</button>
      </div>

      {onglet === 'actives' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alertes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 16 }}>Aucune alerte active</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Toutes les zones sont alimentées normalement</div>
            </div>
          ) : alertes.map(a => {
            const cfg = NIVEAU_CFG[a.niveau_urgence] || NIVEAU_CFG.INFO;
            return (
              <div key={a.id} className={`alert-card ${cfg.cardCls}`}>
                <div className="alert-icon">{cfg.emoji}</div>
                <div className="alert-body">
                  <div className="flex-between">
                    <div className="alert-title">{a.zone_nom} — {TYPE_LABELS[a.type_alerte]}</div>
                    <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  <div className="alert-meta mt-4">
                    <span>📍 {a.gouvernorat_nom}</span>
                    {a.centrale_nom && <span>🏭 {a.centrale_nom}</span>}
                    <span>⏱ {durée(a.duree_actuelle)}</span>
                    <span>📞 {a.nb_signalements} signalement(s)</span>
                    <span>👥 {(a.nb_abonnes||0).toLocaleString()} abonnés</span>
                  </div>
                  {a.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, padding: '6px 10px', background: 'rgba(0,0,0,0.05)', borderRadius: 6 }}>{a.description}</div>}
                  {a.decision !== 'EN_ATTENTE' && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      Décision actuelle : <strong style={{ color: a.decision === 'SERVICE_TECHNIQUE' ? 'var(--accent)' : a.decision === 'POLICE' ? 'var(--danger)' : 'var(--success)' }}>
                        {a.decision === 'SERVICE_TECHNIQUE' ? '🔧 Service Technique appelé' : a.decision === 'POLICE' ? '🚔 Police alertée' : a.decision}
                      </strong>
                    </div>
                  )}
                  <div className="alert-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => setSelected(a)}>🎯 Prendre une décision</button>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>{new Date(a.date_debut).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onglet === 'historique' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Zone</th><th>Type</th><th>Niveau</th><th>Décision</th><th>Durée</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {historique.map(a => {
                  const cfg = NIVEAU_CFG[a.niveau_urgence] || NIVEAU_CFG.INFO;
                  return (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{a.id}</td>
                      <td><div style={{ fontWeight: 600 }}>{a.zone_nom}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.gouvernorat_nom}</div></td>
                      <td style={{ fontSize: 12 }}>{TYPE_LABELS[a.type_alerte] || a.type_alerte}</td>
                      <td><span className={`badge ${cfg.cls}`}>{cfg.emoji} {cfg.label}</span></td>
                      <td style={{ fontSize: 12 }}>
                        {a.decision === 'SERVICE_TECHNIQUE' ? <span style={{ color: 'var(--accent)' }}>🔧 Service Tech.</span>
                          : a.decision === 'POLICE' ? <span style={{ color: 'var(--danger)' }}>🚔 Police</span>
                          : a.decision === 'RESOLU' ? <span style={{ color: 'var(--success)' }}>✅ Résolu</span>
                          : <span className="text-muted">{a.decision}</span>}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{durée(a.duree_minutes)}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(a.date_debut).toLocaleString('fr-FR')}</td>
                    </tr>
                  );
                })}
                {historique.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Aucun historique</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <DecisionModal alerte={selected} onClose={() => setSelected(null)} onDecision={handleDecision} />}
      {showAdd && <AddAlerteModal onClose={() => setShowAdd(false)} onAdded={() => loadActives()} />}
    </div>
  );
}
