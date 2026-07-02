import { useState, useEffect } from 'react';
import axios from 'axios';

const TYPE_LABELS = {
  COUPURE_SIGNALEMENT: 'Coupure signalée', COUPURE_AUTOMATIQUE: 'Coupure auto',
  SURCHARGE: 'Surcharge', COURT_CIRCUIT: 'Court-circuit',
  SABOTAGE_SUSPECT: 'Sabotage suspecté', MAINTENANCE_URGENTE: 'Maint. urgente', CHUTE_TENSION: 'Chute tension',
};
const NIVEAU_CFG = { URGENCE: 'badge-red', CRITIQUE: 'badge-red', AVERTISSEMENT: 'badge-amber', INFO: 'badge-blue' };
const DECISION_CFG = {
  SERVICE_TECHNIQUE: { label: '🔧 Service Tech.', color: 'var(--accent)' },
  POLICE: { label: '🚔 Police', color: 'var(--danger)' },
  RESOLU: { label: '✅ Résolu', color: 'var(--success)' },
  ANNULE: { label: '❌ Annulé', color: 'var(--text-muted)' },
  EN_ATTENTE: { label: '⏳ En attente', color: 'var(--warning)' },
};

function durée(m) { if (!m) return '—'; return m >= 60 ? `${Math.floor(m/60)}h${(m%60).toString().padStart(2,'0')}` : `${m}min`; }

export default function Historique() {
  const [events, setEvents] = useState([]);
  const [filterStatut, setFilterStatut] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/alertes?limit=100${filterStatut ? '&statut=' + filterStatut : ''}`)
      .then(r => setEvents(r.data.data)).finally(() => setLoading(false));
  }, [filterStatut]);

  const total = events.length;
  const resolus = events.filter(e => e.statut === 'RESOLU').length;
  const actifs = events.filter(e => ['OUVERT', 'EN_COURS'].includes(e.statut)).length;

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total événements', val: total, color: 'var(--accent)' },
          { label: 'Actifs', val: actifs, color: 'var(--danger)' },
          { label: 'Résolus', val: resolus, color: 'var(--success)' },
          { label: 'Taux résolution', val: total > 0 ? `${Math.round(resolus/total*100)}%` : '--', color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: '14px 18px' }}>
          <div className="card-title">Historique complet des événements</div>
          <select className="form-control" style={{ width: 160 }} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="OUVERT">Ouvert</option>
            <option value="EN_COURS">En cours</option>
            <option value="RESOLU">Résolu</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>#</th><th>Zone</th><th>Gouvernorat</th><th>Type</th><th>Niveau</th><th>Statut</th><th>Décision</th><th>Durée</th><th>Signalements</th><th>Date</th></tr>
            </thead>
            <tbody>
              {events.map(e => {
                const dc = DECISION_CFG[e.decision] || DECISION_CFG.EN_ATTENTE;
                return (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>#{e.id}</td>
                    <td><div style={{ fontWeight: 600, fontSize: 12 }}>{e.zone_nom}</div></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.gouvernorat_nom}</td>
                    <td style={{ fontSize: 11 }}>{TYPE_LABELS[e.type_alerte] || e.type_alerte}</td>
                    <td><span className={`badge ${NIVEAU_CFG[e.niveau_urgence] || 'badge-gray'}`} style={{ fontSize: 10 }}>{e.niveau_urgence}</span></td>
                    <td><span className={`badge ${e.statut === 'RESOLU' ? 'badge-green' : e.statut === 'ANNULE' ? 'badge-gray' : 'badge-red'}`} style={{ fontSize: 10 }}>{e.statut}</span></td>
                    <td style={{ fontSize: 11, color: dc.color, fontWeight: 500 }}>{dc.label}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{durée(e.duree_minutes)}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 }}>{e.nb_signalements}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(e.date_debut).toLocaleString('fr-FR')}</td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Aucun événement trouvé</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
