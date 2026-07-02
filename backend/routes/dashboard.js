const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [centrales] = await db.query(`SELECT COUNT(*) AS total, SUM(statut='EN_MARCHE') AS en_marche, SUM(statut='ARRET') AS en_arret, SUM(statut='MAINTENANCE') AS en_maintenance, SUM(production_actuelle_mw) AS production_totale, SUM(capacite_mw) AS capacite_totale FROM centrales`);
    const [zones] = await db.query(`SELECT COUNT(*) AS total, SUM(statut='ALIMENTE') AS alimentees, SUM(statut='COUPURE') AS coupures, SUM(statut='MAINTENANCE') AS maintenance, SUM(statut='PARTIEL') AS partiel, SUM(nb_abonnes) AS total_abonnes, SUM(population_desservie) AS population_totale FROM zones_distribution`);
    const [alertes] = await db.query(`SELECT COUNT(*) AS total, SUM(niveau_urgence='URGENCE') AS urgences, SUM(niveau_urgence='CRITIQUE') AS critiques, SUM(niveau_urgence='AVERTISSEMENT') AS avertissements, SUM(source='SIGNALEMENT_CLIENT') AS signalements_client FROM alertes_coupures WHERE statut IN('OUVERT','EN_COURS')`);
    const [materiel] = await db.query(`SELECT COUNT(*) AS total, SUM(statut='OPERATIONNEL') AS operationnels, SUM(statut='PANNE') AS en_panne, SUM(statut='MAINTENANCE') AS en_maintenance FROM materiel`);
    const [production7j] = await db.query(`SELECT DATE_FORMAT(date_mesure,'%a %d') AS jour, ROUND(SUM(production_mw),0) AS production FROM kpi_production WHERE date_mesure >= DATE_SUB(CURDATE(),INTERVAL 7 DAY) GROUP BY date_mesure ORDER BY date_mesure`);
    const [topCentrales] = await db.query(`SELECT nom, code, type, production_actuelle_mw, capacite_mw, statut, ROUND((production_actuelle_mw/capacite_mw)*100,1) AS taux FROM centrales ORDER BY production_actuelle_mw DESC LIMIT 6`);
    const [alertesParType] = await db.query(`SELECT type_alerte, COUNT(*) AS nb FROM alertes_coupures WHERE DATE(date_debut) >= DATE_SUB(CURDATE(),INTERVAL 30 DAY) GROUP BY type_alerte ORDER BY nb DESC`);
    res.json({ success: true, data: { centrales: centrales[0], zones: zones[0], alertes: alertes[0], materiel: materiel[0], production7j, topCentrales, alertesParType } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/rapport', authMiddleware, async (req, res) => {
  try {
    const [centrales] = await db.query('SELECT c.*,g.nom AS gouvernorat_nom FROM centrales c JOIN gouvernorats g ON c.gouvernorat_id=g.id ORDER BY c.statut,c.nom');
    const [zones] = await db.query('SELECT z.*,g.nom AS gouvernorat_nom,c.nom AS centrale_nom FROM zones_distribution z JOIN gouvernorats g ON z.gouvernorat_id=g.id LEFT JOIN centrales c ON z.centrale_id=c.id ORDER BY z.statut,z.nom');
    const [alertes] = await db.query(`SELECT a.*,z.nom AS zone_nom,g.nom AS gouvernorat_nom FROM alertes_coupures a JOIN zones_distribution z ON a.zone_id=z.id JOIN gouvernorats g ON z.gouvernorat_id=g.id ORDER BY a.date_debut DESC LIMIT 50`);
    const [materiel_panne] = await db.query(`SELECT m.*,c.nom AS centrale_nom FROM materiel m LEFT JOIN centrales c ON m.centrale_id=c.id WHERE m.statut IN('PANNE','HORS_SERVICE') ORDER BY m.type`);
    const [stats] = await db.query(`SELECT SUM(production_actuelle_mw) AS prod_totale, SUM(capacite_mw) AS cap_totale, ROUND(SUM(production_actuelle_mw)/SUM(capacite_mw)*100,1) AS taux_global FROM centrales`);
    res.json({ success: true, data: { centrales, zones, alertes, materiel_panne, stats: stats[0], generated_at: new Date().toISOString() } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/gouvernorats', authMiddleware, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gouvernorats ORDER BY region, nom');
  res.json({ success: true, data: rows });
});

module.exports = router;
