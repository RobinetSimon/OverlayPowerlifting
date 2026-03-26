import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
// Assuming dataRoutes is a local file, ensure it uses export default or named exports
import dataRoutes from './routes/dataRoutes';

const app = express();
const server = http.createServer(app);

let basePath = import.meta.dir;
if (basePath.startsWith("$bunfs")) {
  // If compiled, use the physical directory where the executable lives
  basePath = path.dirname(process.execPath);
}

// Serve static files
app.use(express.static('public'));

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST']
}));

// --- ROUTES ---
app.use('/getData', dataRoutes);

// --- WEBSOCKET CONFIGURATION ---
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  console.log('🔗 Un nouveau client est connecté.');

  ws.on('message', message => {
    console.log('📥 Message reçu: %s', message);
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // 1 is OPEN
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => console.log('🔌 Un client s\'est déconnecté.'));
  ws.onerror = (error) => console.error('❗️ Erreur WebSocket:', error);
});

const PORT = process.env.API_PORT || 3000;

server.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});