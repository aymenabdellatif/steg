const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { statut, limit = 50 } = req.query;
    let q = `
      SELECT a.*, z.nom AS zone_nom, z.code AS zone_code, z.priorite AS zone_priorite,
        g.nom AS gouvernorat_nom, c.nom AS centrale_nom,
        u.nom AS decision_nom, u.prenom AS decision_prenom,
        TIMESTAMPDIFF(MINUTE, a.date_debut, NOW()) AS duree_actuelle
      FROM alertes_coupures a
      JOIN zones_distribution z ON a.zone_id=z.id
      JOIN gouvernorats g ON z.gouvernorat_id=g.id
      LEFT JOIN centrales c ON a.centrale_id=c.id
      LEFT JOIN utilisateurs u ON a.decision_par=u.id
      WHERE 1=1`;
    const params = [];
    if (statut) { q += ' AND a.statut=?'; params.push(statut); }
    q += ' ORDER BY FIELD(a.niveau_urgence,"URGENCE","CRITIQUE","AVERTISSEMENT","INFO"), a.date_debut DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await db.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/actives', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, z.nom AS zone_nom, z.code AS zone_code, z.priorite AS zone_priorite,
        z.nb_abonnes, z.population_desservie,
        g.nom AS gouvernorat_nom, c.nom AS centrale_nom, c.telephone_urgence,
        TIMESTAMPDIFF(MINUTE, a.date_debut, NOW()) AS duree_actuelle
      FROM alertes_coupures a
      JOIN zones_distribution z ON a.zone_id=z.id
      JOIN gouvernorats g ON z.gouvernorat_id=g.id
      LEFT JOIN centrales c ON a.centrale_id=c.id
      WHERE a.statut IN('OUVERT','EN_COURS')
      ORDER BY FIELD(a.niveau_urgence,'URGENCE','CRITIQUE','AVERTISSEMENT','INFO'), a.date_debut ASC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  const { zone_id, centrale_id, type_alerte, niveau_urgence, source, description, nb_signalements } = req.body;
  try {
    const [r] = await db.query(
      'INSERT INTO alertes_coupures (zone_id,centrale_id,type_alerte,niveau_urgence,source,description,nb_signalements) VALUES (?,?,?,?,?,?,?)',
      [zone_id, centrale_id||null, type_alerte, niveau_urgence||'INFO', source||'SIGNALEMENT_CLIENT', description, nb_signalements||1]
    );
    // Mettre à jour statut zone
    const statutZone = type_alerte.startsWith('COUPURE') ? 'COUPURE' : 'ALIMENTE';
    await db.query('UPDATE zones_distribution SET statut=?,updated_at=NOW() WHERE id=?', [statutZone, zone_id]);

    const [newA] = await db.query(`
      SELECT a.*,z.nom AS zone_nom,z.nb_abonnes,z.population_desservie,g.nom AS gouvernorat_nom,c.nom AS centrale_nom,c.telephone_urgence
      FROM alertes_coupures a JOIN zones_distribution z ON a.zone_id=z.id JOIN gouvernorats g ON z.gouvernorat_id=g.id LEFT JOIN centrales c ON a.centrale_id=c.id WHERE a.id=?`, [r.insertId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('nouvelle_alerte', newA[0]);
      io.emit('alerte_sonore', { niveau: niveau_urgence, zone: newA[0].zone_nom });
    }
    res.status(201).json({ success: true, data: newA[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Prendre une décision sur une alerte
router.put('/:id/decision', authMiddleware, async (req, res) => {
  const { decision, commentaire_decision } = req.body;
  try {
    const statut = decision === 'RESOLU' ? 'RESOLU' : decision === 'ANNULE' ? 'ANNULE' : 'EN_COURS';
    const date_fin = ['RESOLU','ANNULE'].includes(decision) ? new Date() : null;
    await db.query(
      'UPDATE alertes_coupures SET decision=?,decision_par=?,commentaire_decision=?,statut=?,date_fin=? WHERE id=?',
      [decision, req.user.id, commentaire_decision||null, statut, date_fin, req.params.id]
    );
    if (decision === 'RESOLU') {
      const [al] = await db.query('SELECT zone_id FROM alertes_coupures WHERE id=?', [req.params.id]);
      if (al.length) await db.query('UPDATE zones_distribution SET statut="ALIMENTE",updated_at=NOW() WHERE id=?', [al[0].zone_id]);
    }
    const io = req.app.get('io');
    if (io) io.emit('alerte_decision', { id: req.params.id, decision });
    res.json({ success: true, message: `Décision : ${decision}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Incrémenter signalements
router.put('/:id/signaler', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE alertes_coupures SET nb_signalements=nb_signalements+1 WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
