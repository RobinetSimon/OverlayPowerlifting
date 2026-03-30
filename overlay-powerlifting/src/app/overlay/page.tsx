'use client';

import React, { useEffect, useState, useRef } from 'react';
import PowerliftingOverlay from '../../components/mainOverlay';
import { OverlayData } from '../../types/athlete';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function OverlayPage() {
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep component mounted during exit transition, then unmount
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    let cancelled = false;

    const connectWebSocket = () => {
      if (cancelled) return;
      const hostname = window.location.hostname;
      const wsPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const ws = new WebSocket(`ws://${hostname}:${wsPort}`);

      ws.onopen = () => console.log('Overlay connected to WebSocket.');

      ws.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          if (type === 'UPDATE_OVERLAY' && data) {
            setAthlete(data);
            setVisible(true);

            // Clear previous timer to avoid early hide
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

            const duration = parseInt(process.env.NEXT_PUBLIC_OVERLAY_DURATION_SECONDS || '10') * 1000;
            hideTimerRef.current = setTimeout(() => setVisible(false), duration);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        const delay = parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_RECONNECT_DELAY_SECONDS || '3') * 1000;
        console.log(`Overlay disconnected. Reconnecting in ${delay / 1000}s...`);
        setTimeout(connectWebSocket, delay);
      };

      ws.onerror = () => ws.close();

      return ws;
    };

    const ws = connectWebSocket();

    return () => {
      cancelled = true;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden">
      <ErrorBoundary>
        <div className={`transition-opacity duration-500 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {athlete && shouldRender && (
            <PowerliftingOverlay
              key={`${athlete.lifter.name}-${athlete.lifter.firstName}-${athlete.currentMovement}`}
              {...athlete}
              visible={true}
            />
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
