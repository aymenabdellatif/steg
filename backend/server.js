const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:5173', methods: ['GET','POST','PUT','DELETE'] } });

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.set('io', io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/centrales', require('./routes/centrales'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/materiel', require('./routes/materiel'));
app.use('/api/alertes', require('./routes/alertes'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (_, res) => res.json({ success: true, message: 'STEG API opérationnelle', timestamp: new Date() }));

io.on('connection', socket => {
  console.log(`🔌 Client connecté: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔌 Déconnecté: ${socket.id}`));
});

// Simulation refresh données temps réel toutes les 60s
setInterval(async () => {
  try {
    const db = require('./config/db');
    // Varier légèrement la production pour simuler le temps réel
    await db.query(`UPDATE centrales SET production_actuelle_mw = GREATEST(0, production_actuelle_mw + ROUND((RAND()-0.5)*20,0)) WHERE statut='EN_MARCHE'`);
    const [centrales] = await db.query('SELECT * FROM centrales');
    io.emit('centrales_refresh', centrales);
  } catch (e) {}
}, 60000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur STEG démarré sur http://localhost:${PORT}`));
