const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, g.nom AS gouvernorat_nom, g.region,
        (SELECT COUNT(*) FROM zones_distribution z WHERE z.centrale_id=c.id) AS nb_zones,
        (SELECT COUNT(*) FROM alertes_coupures a JOIN zones_distribution z ON a.zone_id=z.id WHERE z.centrale_id=c.id AND a.statut IN('OUVERT','EN_COURS')) AS alertes_actives,
        ROUND((c.production_actuelle_mw / c.capacite_mw)*100,1) AS taux_utilisation
      FROM centrales c JOIN gouvernorats g ON c.gouvernorat_id=g.id ORDER BY c.production_actuelle_mw DESC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [c] = await db.query(`SELECT c.*,g.nom AS gouvernorat_nom FROM centrales c JOIN gouvernorats g ON c.gouvernorat_id=g.id WHERE c.id=?`, [req.params.id]);
    const [zones] = await db.query('SELECT * FROM zones_distribution WHERE centrale_id=?', [req.params.id]);
    const [kpis] = await db.query('SELECT * FROM kpi_production WHERE centrale_id=? AND date_mesure=CURDATE() ORDER BY heure_mesure', [req.params.id]);
    const [materiel] = await db.query('SELECT * FROM materiel WHERE centrale_id=? LIMIT 10', [req.params.id]);
    res.json({ success: true, data: { centrale: c[0], zones, kpis, materiel } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  const { nom, code, type, gouvernorat_id, capacite_mw, production_actuelle_mw, statut, date_mise_en_service, responsable, telephone_urgence, latitude, longitude } = req.body;
  try {
    const [r] = await db.query(
      'INSERT INTO centrales (nom,code,type,gouvernorat_id,capacite_mw,production_actuelle_mw,statut,date_mise_en_service,responsable,telephone_urgence,latitude,longitude) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [nom, code, type, gouvernorat_id, capacite_mw, production_actuelle_mw||0, statut||'EN_MARCHE', date_mise_en_service||null, responsable, telephone_urgence, latitude||null, longitude||null]
    );
    const [newC] = await db.query('SELECT c.*,g.nom AS gouvernorat_nom FROM centrales c JOIN gouvernorats g ON c.gouvernorat_id=g.id WHERE c.id=?', [r.insertId]);
    req.app.get('io')?.emit('centrale_ajoutee', newC[0]);
    res.status(201).json({ success: true, data: newC[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { nom, type, capacite_mw, production_actuelle_mw, statut, responsable, telephone_urgence } = req.body;
  try {
    await db.query('UPDATE centrales SET nom=?,type=?,capacite_mw=?,production_actuelle_mw=?,statut=?,responsable=?,telephone_urgence=?,updated_at=NOW() WHERE id=?',
      [nom, type, capacite_mw, production_actuelle_mw, statut, responsable, telephone_urgence, req.params.id]);
    const [updated] = await db.query('SELECT c.*,g.nom AS gouvernorat_nom FROM centrales c JOIN gouvernorats g ON c.gouvernorat_id=g.id WHERE c.id=?', [req.params.id]);
    req.app.get('io')?.emit('centrale_update', updated[0]);
    res.json({ success: true, data: updated[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM centrales WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Centrale supprimée' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
