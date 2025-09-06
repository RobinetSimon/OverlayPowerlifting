'use client';
import React, { useEffect, useState, useRef } from 'react'; // AJOUT : useRef
import PowerliftingOverlay from '../../components/mainOverlay';
import { OverlayData } from '../../types/athlete';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function OverlayPage() {
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null); // AJOUT

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
            // MODIFICATION : On nettoie l'ancien timer
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
            }

            setAthlete(data);
            setVisible(true);

            const duration = (parseInt(process.env.NEXT_PUBLIC_OVERLAY_DURATION_SECONDS || '10')) * 1000;

            // MODIFICATION : On stocke la référence du nouveau timer
            hideTimeoutRef.current = setTimeout(() => {
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
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      };
    };

    const cleanup = connectWebSocket();
    return cleanup;

  }, []);

  return (
    <div className="w-screen h-screen flex items-end justify-center overflow-hidden">
      <ErrorBoundary>
        <AnimatePresence>
          {/* MODIFICATION : On passe directement les props au composant principal */}
          {athlete && visible && (
            <PowerliftingOverlay {...athlete} visible={true} />
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}