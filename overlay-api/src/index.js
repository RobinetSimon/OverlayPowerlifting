require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // On a besoin du module http de Node
const { WebSocketServer } = require('ws'); // On importe le serveur WebSocket
const dataRoutes = require('./routes/dataRoutes');

const app = express();
const server = http.createServer(app); // On crée un serveur HTTP à partir de l'app Express

// --- CONFIGURATION WEBSOCKET ---
// On attache le serveur WebSocket au même serveur HTTP que notre API
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

app.use('/getData', dataRoutes);

const PORT = process.env.API_PORT || 3000;

// On utilise server.listen au lieu de app.listen
server.listen(PORT, () => {
  console.log(`✅ Serveur API lancé sur le port ${PORT}`);
});

