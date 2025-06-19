// components/PowerliftingOverlay.tsx
'use client'
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AttemptBox = ({ weight, status }: { weight: number, status: string }) => {
  const getColor = () => {
    if (status === 'good') return 'bg-green-500';
    if (status === 'fail') return 'bg-red-500';
    return 'bg-gray-300';
  };
  return (
    <div className={`rounded px-2 py-1 text-black font-bold text-sm ${getColor()}`}>
      {weight}
    </div>
  );
};

interface Attempt {
  weight: number;
  status: string;
}

interface LifterInfo {
  flag: string;
  country: string;
  name: string;
  firstName: string;
}

interface PowerliftingOverlayProps {
  category: string;
  rankInfo: string;
  timer: string;
  lifter: LifterInfo;
  attempts: Attempt[];
  total: number;
  competition: string;
}

export default function PowerliftingOverlay({
  category,
  rankInfo,
  timer,
  lifter,
  attempts,
  total,
  competition,
}: PowerliftingOverlayProps) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setVisible(!visible)}
        className="mb-2 bg-blue-700 text-black px-4 py-1 rounded shadow"
      >
        {visible ? 'Hide Overlay' : 'Show Overlay'}
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{ transformOrigin: 'left' }}
            className="bg-blue-900/35 text-black rounded-xl p-4 shadow-xl w-[600px] origin-left backdrop-blur-sm"
          >
            <div className="flex justify-between text-sm">
              <div className="font-bold">{category}</div>
              <div>{rankInfo}</div>
              <div className="bg-yellow-400 text-black font-bold px-2 rounded">{timer}</div>
            </div>

            <div className="mt-2 flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="text-lg">{lifter.flag}</div>
                <div className="text-sm">{lifter.country}</div>
              </div>
              <div>
                <div className="text-black text-lg font-bold">{lifter.firstName}</div>
                <div className="text-black text-xl font-bold">{lifter.name}</div>
              </div>
              <div className="flex gap-2 ml-auto">
                {attempts.map((a, i) => (
                  a.weight !== null && a.weight !== undefined ? (
                    <AttemptBox key={i} weight={a.weight} status={a.status} />
                  ) : (
                    <div key={i} className="w-[40px] h-[32px]" />
                  )
                ))}
                <div className="bg-yellow-500 text-black font-bold px-2 py-1 rounded">
                  {total.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="text-right text-sm text-gray-300 mt-1">
              ELEIKO - {competition}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}