// Fichier: server.js
// On utilise la syntaxe d'import ES Module, qui est standard dans Next.js
import { WebSocketServer } from 'ws';

// On crée le serveur sur le port 8080
const wss = new WebSocketServer({ port: 8080 });

console.log('✅ Serveur WebSocket démarré sur ws://localhost:8080');

wss.on('connection', ws => {
  console.log('🔗 Un nouveau client est connecté.');

  ws.on('message', message => {
    console.log('📥 Message reçu: %s', message);
    
    // Quand un message est reçu, on le renvoie à TOUS les clients connectés.
    wss.clients.forEach(client => {
      if (client.readyState === ws.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('🔌 Un client s\'est déconnecté.');
  });

  ws.onerror = (error) => {
    console.error('❗️ Erreur WebSocket:', error);
  };
});