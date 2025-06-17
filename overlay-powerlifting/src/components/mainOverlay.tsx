'use client'
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AttemptBox = ({ weight, status } : {weight : number, status : string}) => {
  const getColor = () => {
    if (status === 'good') return 'bg-green-500';
    if (status === 'fail') return 'bg-red-500';
    return 'bg-gray-300';
  };

  return (
    <div className={`rounded px-2 py-1 text-white font-bold text-sm ${getColor()}`}>
      {weight}
    </div>
  );
};

export default function PowerliftingOverlay({
  category = '120+kg',
  rankInfo = 'RANK 15 to 12',
  timer = '00:54',
  lifter = {
    flag: '🇳🇴',
    country: 'NOR',
    name: 'Sutterud Westbye',
    firstName: 'Bjorn Andre',
  },
  attempts = [
    { weight: 195.0, status: 'good' },
    { weight: 205.0, status: 'good' },
    { weight: 212.5, status: 'pending' },
  ],
  total = 595.0,
  competition = 'CHEMNITZ 2025',
}) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setVisible(!visible)}
        className="mb-2 bg-blue-700 text-white px-4 py-1 rounded shadow"
      >
        {visible ? 'Hide Overlay' : 'Show Overlay'}
      </button>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-900 text-white rounded-xl p-4 shadow-xl w-[600px]"
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
                <div className="text-white text-lg font-bold">{lifter.firstName}</div>
                <div className="text-white text-xl font-bold">{lifter.name}</div>
              </div>
              <div className="flex gap-2 ml-auto">
                {attempts.map((a, i) => (
                  <AttemptBox key={i} weight={a.weight} status={a.status} />
                ))}
                <div className="bg-yellow-500 text-black font-bold px-2 py-1 rounded">
                  {total.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-300 mt-1">ELEIKO - {competition}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
