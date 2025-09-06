'use client';

import React, { useEffect, useState } from 'react';
import PowerliftingOverlay from '../../components/mainOverlay';
import { OverlayData } from '../../types/athlete';
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function OverlayPage() {
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const connectWebSocket = () => {
      const hostname = window.location.hostname;
      const wsPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const ws = new WebSocket(`ws://${hostname}:${wsPort}`);

      ws.onopen = () => {
        console.log('Overlay connecté au serveur WebSocket.');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          if (type === 'UPDATE_OVERLAY' && data) {
            setAthlete(data);
            setVisible(true);
            const duration = (parseInt(process.env.NEXT_PUBLIC_OVERLAY_DURATION_SECONDS || '10')) * 1000;
            setTimeout(() => {
              setVisible(false);
            }, duration);
          }
        } catch (error) {
          console.error("Erreur lors de l'analyse du message WebSocket :", error, event.data);
        }
      };

      ws.onclose = () => {
        console.log('Overlay déconnecté. Tentative de reconnexion dans 3 secondes...');
        const reconnectDelay = (parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_RECONNECT_DELAY_SECONDS || '3')) * 1000;
        setTimeout(connectWebSocket, reconnectDelay);
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket Overlay:', error);
        ws.close();
      };

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
      <ErrorBoundary>
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
      </ErrorBoundary>
    </div>
  );
}