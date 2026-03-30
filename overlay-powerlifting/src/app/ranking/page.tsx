'use client';

import React, { useEffect, useState, useRef } from 'react';
import RankingOverlay from '../../components/rankingOverlay';
import { RankedAthlete, OverlaySettings, DEFAULT_OVERLAY_SETTINGS } from '../../types/athlete';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function RankingPage() {
  const [athletes, setAthletes] = useState<RankedAthlete[]>([]);
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_OVERLAY_SETTINGS);
  const [animKey, setAnimKey] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      ws.onopen = () => console.log('Ranking connected to WebSocket.');

      ws.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          if (type === 'UPDATE_RANKING' && Array.isArray(data)) {
            setAthletes(data);
            setVisible(true);
            setAnimKey(k => k + 1);

            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            const duration = parseInt(process.env.NEXT_PUBLIC_OVERLAY_DURATION_SECONDS || '10') * 1000;
            hideTimerRef.current = setTimeout(() => setVisible(false), duration);
          }

          if (type === 'OVERLAY_SETTINGS' && data) {
            setSettings({
              ...DEFAULT_OVERLAY_SETTINGS,
              ...data,
              colors: { ...DEFAULT_OVERLAY_SETTINGS.colors, ...data.colors },
              visibility: { ...DEFAULT_OVERLAY_SETTINGS.visibility, ...data.visibility },
            });
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        const delay = parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_RECONNECT_DELAY_SECONDS || '3') * 1000;
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
          {shouldRender && athletes.length > 0 && (
            <RankingOverlay key={animKey} athletes={athletes} visible={true} settings={settings} />
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
