const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT z.*, g.nom AS gouvernorat_nom, c.nom AS centrale_nom, c.code AS centrale_code,
        (SELECT COUNT(*) FROM alertes_coupures a WHERE a.zone_id=z.id AND a.statut IN('OUVERT','EN_COURS')) AS alertes_actives
      FROM zones_distribution z
      JOIN gouvernorats g ON z.gouvernorat_id=g.id
      LEFT JOIN centrales c ON z.centrale_id=c.id
      ORDER BY z.priorite DESC, z.nom`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  const { nom, code, centrale_id, gouvernorat_id, population_desservie, nb_abonnes, tension_kv, statut, priorite } = req.body;
  try {
    const [r] = await db.query(
      'INSERT INTO zones_distribution (nom,code,centrale_id,gouvernorat_id,population_desservie,nb_abonnes,tension_kv,statut,priorite) VALUES (?,?,?,?,?,?,?,?,?)',
      [nom, code, centrale_id||null, gouvernorat_id, population_desservie||0, nb_abonnes||0, tension_kv||30, statut||'ALIMENTE', priorite||'NORMALE']
    );
    const [newZ] = await db.query('SELECT z.*,g.nom AS gouvernorat_nom FROM zones_distribution z JOIN gouvernorats g ON z.gouvernorat_id=g.id WHERE z.id=?', [r.insertId]);
    req.app.get('io')?.emit('zone_update', newZ[0]);
    res.status(201).json({ success: true, data: newZ[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { nom, centrale_id, population_desservie, nb_abonnes, tension_kv, statut, priorite } = req.body;
  try {
    await db.query('UPDATE zones_distribution SET nom=?,centrale_id=?,population_desservie=?,nb_abonnes=?,tension_kv=?,statut=?,priorite=?,updated_at=NOW() WHERE id=?',
      [nom, centrale_id||null, population_desservie, nb_abonnes, tension_kv, statut, priorite, req.params.id]);
    const [updated] = await db.query('SELECT z.*,g.nom AS gouvernorat_nom,c.nom AS centrale_nom FROM zones_distribution z JOIN gouvernorats g ON z.gouvernorat_id=g.id LEFT JOIN centrales c ON z.centrale_id=c.id WHERE z.id=?', [req.params.id]);
    req.app.get('io')?.emit('zone_update', updated[0]);
    res.json({ success: true, data: updated[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM zones_distribution WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
