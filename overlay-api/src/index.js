require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs'); // Importer le module fs
const path = require('path'); // Importer le module path

// --- ROUTES ---
const dataRoutes = require('./routes/dataRoutes');
const recordRoutes = require('./routes/recordRoutes'); // Importer la nouvelle route

const app = express();
const server = http.createServer(app);

// --- CRÉATION DU DOSSIER UPLOADS ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log(`✅ Dossier '${uploadsDir}' créé.`);
}

// --- CONFIGURATION WEBSOCKET ---
const wss = new WebSocketServer({ server });
const WEBSOCKET_PORT_INFO = process.env.API_PORT || 3000;
console.log(`✅ Serveur WebSocket démarré sur le port: ${WEBSOCKET_PORT_INFO}`);

wss.on('connection', ws => {
  console.log('🔗 Un nouveau client est connecté.');
  ws.on('message', message => {
    console.log('📥 Message reçu: %s', message);
    wss.clients.forEach(client => {
      if (client.readyState === ws.OPEN) {
        client.send(message.toString());
      }
    });
  });
  ws.on('close', () => console.log('🔌 Un client s\'est déconnecté.'));
  ws.onerror = (error) => console.error('❗️ Erreur WebSocket:', error);
});

// --- CONFIGURATION API EXPRESS ---
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST']
}));

// Utilisation des routes
app.use('/getData', dataRoutes);
app.use('/api/records', recordRoutes);

const PORT = process.env.API_PORT || 3000;

server.listen(PORT, () => {
  console.log(`✅ Serveur API lancé sur le port ${PORT}`);
});