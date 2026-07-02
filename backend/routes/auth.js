const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Champs requis' });
  try {
    const [rows] = await db.query('SELECT * FROM utilisateurs WHERE email=? AND actif=1', [email]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    const user = rows[0];
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    const token = jwt.sign(
      { id: user.id, matricule: user.matricule, role: user.role, nom: user.nom, prenom: user.prenom },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ success: true, token, user: { id: user.id, nom: user.nom, prenom: user.prenom, matricule: user.matricule, role: user.role, email: user.email, theme_preference: user.theme_preference } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  const [rows] = await db.query('SELECT id,nom,prenom,matricule,role,email,telephone,theme_preference FROM utilisateurs WHERE id=?', [req.user.id]);
  res.json({ success: true, user: rows[0] });
});

router.put('/theme', authMiddleware, async (req, res) => {
  const { theme } = req.body;
  await db.query('UPDATE utilisateurs SET theme_preference=? WHERE id=?', [theme, req.user.id]);
  res.json({ success: true });
});

module.exports = router;
