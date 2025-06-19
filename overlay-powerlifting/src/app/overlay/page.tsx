'use client';

import React, { useEffect, useState } from 'react';
import PowerliftingOverlay from '../../components/mainOverlay';
import { OverlayData } from '../../types/athlete';
import { AnimatePresence, motion } from 'framer-motion';

export default function OverlayPage() {
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel('overlay-channel');

    channel.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'UPDATE_OVERLAY') {
        setAthlete(data);
        setVisible(true);

        setTimeout(() => {
          setVisible(false);
        }, 10000); // masque après 10 secondes
      }
    };

    return () => channel.close();
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
