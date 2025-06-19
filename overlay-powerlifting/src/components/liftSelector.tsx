'use client'
import React from 'react';

type Props = {
  selectedLift: 'squat' | 'bench_press' | 'deadlift';
  onSelect: (lift: 'squat' | 'bench_press' | 'deadlift') => void;
};

const LiftSelector: React.FC<Props> = ({ selectedLift, onSelect }) => {
  const lifts: { label: string; value: 'squat' | 'bench_press' | 'deadlift' }[] = [
    { label: 'Squat', value: 'squat' },
    { label: 'Bench', value: 'bench_press' },
    { label: 'Deadlift', value: 'deadlift' },
  ];

  return (
    <div className="flex gap-2 mb-2">
      {lifts.map((lift) => (
        <button
          key={lift.value}
          onClick={() => onSelect(lift.value)}
          className={`px-3 py-1 rounded ${
            selectedLift === lift.value ? 'bg-blue-600 text-white' : 'bg-gray-300 text-black'
          }`}
        >
          {lift.label}
        </button>
      ))}
    </div>
  );
};

export default LiftSelector;
