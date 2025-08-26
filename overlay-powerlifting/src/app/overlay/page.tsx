// Fichier: overlaypage.tsx
'use client';

import React, { useEffect, useState } from 'react';
import PowerliftingOverlay from '../../components/mainOverlay';
import { OverlayData } from '../../types/athlete';
import { AnimatePresence, motion } from 'framer-motion';

export default function OverlayPage() {
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        console.log('Overlay connecté au serveur WebSocket.');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const { type, data } = message;

        if (type === 'UPDATE_OVERLAY') {
          setAthlete(data);
          setVisible(true);

          setTimeout(() => {
            setVisible(false);
          }, 10000); // masque après 10 secondes
        }
      };

      ws.onclose = () => {
        console.log('Overlay déconnecté. Tentative de reconnexion dans 3 secondes...');
        setTimeout(connectWebSocket, 3000); // Reconnexion auto
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket Overlay:', error);
        ws.close(); // Provoque l'appel à onclose pour la reconnexion
      };

      // Fonction de nettoyage pour arrêter la reconnexion si on quitte la page
      return () => {
        ws.onclose = null; 
        ws.close();
      };
    };

    const cleanup = connectWebSocket();
    return cleanup;
    
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {athlete && visible && (
          <motion.div
            key="overlay"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <PowerliftingOverlay {...athlete} visible={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}