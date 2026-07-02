import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Rapport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    axios.get('/api/dashboard/rapport').then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const W = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, W, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22); doc.setFont(undefined, 'bold');
      doc.text('STEG', 15, 16);
      doc.setFontSize(11); doc.setFont(undefined, 'normal');
      doc.text('Société Tunisienne de l\'Électricité et du Gaz', 15, 24);
      doc.text('Rapport de Supervision Réseau', 15, 31);
      doc.setFontSize(9);
      doc.text(`Généré le ${dateStr} à ${now.toLocaleTimeString('fr-FR')}`, W - 15, 24, { align: 'right' });

      let y = 45;

      // Stats globales
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('1. Synthèse Globale', 15, y); y += 7;

      const s = data.stats;
      const summaryData = [
        ['Production totale', `${Math.round(s.prod_totale || 0).toLocaleString()} MW`],
        ['Capacité totale', `${Math.round(s.cap_totale || 0).toLocaleString()} MW`],
        ['Taux d\'utilisation global', `${s.taux_global || 0}%`],
        ['Zones de distribution', `${data.zones.length} zones`],
        ['Matériel en panne', `${data.materiel_panne.length} équipements`],
      ];
      autoTable(doc, { startY: y, head: [['Indicateur', 'Valeur']], body: summaryData, theme: 'striped', headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 10 }, margin: { left: 15, right: 15 } });
      y = doc.lastAutoTable.finalY + 10;

      // Centrales
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('2. Centrales de Production', 15, y); y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Centrale', 'Type', 'Gouvernorat', 'Production MW', 'Capacité MW', 'Statut']],
        body: data.centrales.map(c => [c.nom, c.type, c.gouvernorat_nom, `${Math.round(c.production_actuelle_mw || 0)}`, `${Math.round(c.capacite_mw)}`, c.statut]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 },
        didParseCell: (d) => {
          if (d.column.index === 5) {
            const v = d.cell.raw;
            if (v === 'ARRET') d.cell.styles.textColor = [220, 38, 38];
            else if (v === 'EN_MARCHE') d.cell.styles.textColor = [22, 163, 74];
            else if (v === 'MAINTENANCE') d.cell.styles.textColor = [217, 119, 6];
          }
        }
      });
      y = doc.lastAutoTable.finalY + 10;

      // Zones
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('3. Zones de Distribution', 15, y); y += 6;
      const zonesCoupure = data.zones.filter(z => z.statut !== 'ALIMENTE');
      autoTable(doc, {
        startY: y,
        head: [['Zone', 'Gouvernorat', 'Centrale', 'Abonnés', 'Statut', 'Priorité']],
        body: data.zones.slice(0, 20).map(z => [z.nom, z.gouvernorat_nom, z.centrale_nom || '—', (z.nb_abonnes || 0).toLocaleString(), z.statut, z.priorite]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 },
        didParseCell: (d) => {
          if (d.column.index === 4) {
            const v = d.cell.raw;
            if (v === 'COUPURE') d.cell.styles.textColor = [220, 38, 38];
            else if (v === 'ALIMENTE') d.cell.styles.textColor = [22, 163, 74];
          }
        }
      });
      y = doc.lastAutoTable.finalY + 10;

      // Alertes
      doc.addPage(); y = 20;
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(13); doc.setFont(undefined, 'bold');
      doc.text('4. Alertes & Coupures (30 derniers événements)', 15, y); y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Zone', 'Type', 'Niveau', 'Décision', 'Durée', 'Date']],
        body: data.alertes.slice(0, 30).map(a => [
          a.zone_nom, a.type_alerte.replace('_', ' '),
          a.niveau_urgence, a.decision,
          a.duree_minutes ? `${a.duree_minutes} min` : 'En cours',
          new Date(a.date_debut).toLocaleDateString('fr-FR')
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        margin: { left: 15, right: 15 },
      });

      // Matériel en panne
      if (data.materiel_panne.length > 0) {
        y = doc.lastAutoTable.finalY + 10;
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setTextColor(220, 38, 38);
        doc.setFontSize(13); doc.setFont(undefined, 'bold');
        doc.text('5. Matériel en panne / Hors service', 15, y); y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Matériel', 'Type', 'Référence', 'Centrale', 'Statut']],
          body: data.materiel_panne.map(m => [m.nom, m.type, m.reference, m.centrale_nom || '—', m.statut]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38] },
          styles: { fontSize: 9 },
          margin: { left: 15, right: 15 },
        });
      }

      // Footer
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text(`STEG — Rapport confidentiel — Page ${i} / ${pages}`, W / 2, 290, { align: 'center' });
        doc.line(15, 286, W - 15, 286);
      }

      doc.save(`STEG_Rapport_${now.toISOString().slice(0, 10)}.pdf`);
    } catch (e) { console.error(e); alert('Erreur génération PDF : ' + e.message); }
    setGenerating(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Rapport de supervision STEG</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Rapport complet incluant centrales, zones, alertes et matériel. Généré en temps réel depuis la base de données.</p>
        </div>
        <button className="btn btn-primary" onClick={generatePDF} disabled={generating} style={{ flexShrink: 0, padding: '10px 20px' }}>
          {generating ? '⏳ Génération...' : '📄 Télécharger le PDF'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Centrales', val: data.centrales.length, color: 'var(--accent)' },
          { label: 'Zones', val: data.zones.length, color: 'var(--purple)' },
          { label: 'Alertes (50 dernières)', val: data.alertes.length, color: 'var(--warning)' },
          { label: 'Matériel en panne', val: data.materiel_panne.length, color: data.materiel_panne.length > 0 ? 'var(--danger)' : 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Aperçu — Centrales</div></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Centrale</th><th>Type</th><th>Production</th><th>Statut</th></tr></thead>
              <tbody>
                {data.centrales.slice(0, 8).map(c => (
                  <tr key={c.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 12 }}>{c.nom}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.code}</div></td>
                    <td style={{ fontSize: 11 }}>{c.type}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{Math.round(c.production_actuelle_mw || 0)} MW</td>
                    <td><span className={`badge ${c.statut === 'EN_MARCHE' ? 'badge-green' : c.statut === 'ARRET' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: 10 }}>{c.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Aperçu — Zones en anomalie</div></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Zone</th><th>Statut</th><th>Abonnés</th><th>Alertes</th></tr></thead>
              <tbody>
                {data.zones.filter(z => z.statut !== 'ALIMENTE').slice(0, 8).map(z => (
                  <tr key={z.id}>
                    <td><div style={{ fontWeight: 600, fontSize: 12 }}>{z.nom}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{z.gouvernorat_nom}</div></td>
                    <td><span className={`badge ${z.statut === 'COUPURE' ? 'badge-red' : z.statut === 'PARTIEL' ? 'badge-purple' : 'badge-amber'}`} style={{ fontSize: 10 }}>{z.statut}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{(z.nb_abonnes || 0).toLocaleString()}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</td>
                  </tr>
                ))}
                {data.zones.filter(z => z.statut !== 'ALIMENTE').length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>✅ Toutes les zones alimentées</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
