const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { type, statut } = req.query;
    let q = `SELECT m.*, c.nom AS centrale_nom, z.nom AS zone_nom FROM materiel m LEFT JOIN centrales c ON m.centrale_id=c.id LEFT JOIN zones_distribution z ON m.zone_id=z.id WHERE 1=1`;
    const params = [];
    if (type) { q += ' AND m.type=?'; params.push(type); }
    if (statut) { q += ' AND m.statut=?'; params.push(statut); }
    q += ' ORDER BY m.type, m.nom';
    const [rows] = await db.query(q, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  const { nom, reference, type, marque, modele, centrale_id, zone_id, statut, tension_nominale_kv, date_installation, date_derniere_maintenance, prochaine_maintenance, observations } = req.body;
  try {
    const [r] = await db.query(
      'INSERT INTO materiel (nom,reference,type,marque,modele,centrale_id,zone_id,statut,tension_nominale_kv,date_installation,date_derniere_maintenance,prochaine_maintenance,observations) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [nom, reference, type, marque||null, modele||null, centrale_id||null, zone_id||null, statut||'OPERATIONNEL', tension_nominale_kv||null, date_installation||null, date_derniere_maintenance||null, prochaine_maintenance||null, observations||null]
    );
    const [newM] = await db.query('SELECT m.*,c.nom AS centrale_nom,z.nom AS zone_nom FROM materiel m LEFT JOIN centrales c ON m.centrale_id=c.id LEFT JOIN zones_distribution z ON m.zone_id=z.id WHERE m.id=?', [r.insertId]);
    res.status(201).json({ success: true, data: newM[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { nom, type, marque, modele, statut, centrale_id, zone_id, date_derniere_maintenance, prochaine_maintenance, observations } = req.body;
  try {
    await db.query('UPDATE materiel SET nom=?,type=?,marque=?,modele=?,statut=?,centrale_id=?,zone_id=?,date_derniere_maintenance=?,prochaine_maintenance=?,observations=?,updated_at=NOW() WHERE id=?',
      [nom, type, marque, modele, statut, centrale_id||null, zone_id||null, date_derniere_maintenance||null, prochaine_maintenance||null, observations||null, req.params.id]);
    res.json({ success: true, message: 'Matériel mis à jour' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM materiel WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
