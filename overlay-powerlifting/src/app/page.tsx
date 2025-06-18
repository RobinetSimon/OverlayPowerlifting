// app/page.tsx
'use client'
import React, { useEffect, useState } from 'react';
import PowerliftingOverlay from '../components/mainOverlay';
import data from '../data/data.json';

export default function Page() {
  const [athleteIndex, setAthleteIndex] = useState(0);
  const [athlete, setAthlete] = useState<any | null>(null);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  useEffect(() => {
    if (data.length > 0 && athleteIndex < data.length) {
      const a = data[athleteIndex];
      setAthlete({
        category: a.weight_category,
        rankInfo: `RANK ${athleteIndex + 1}`,
        timer: '10:00',
        lifter: {
          flag: '🇫🇷',
          country: 'FRA',
          name: a.last_name,
          firstName: a.first_name,
        },
        attempts: a.attempts[selectedLift].map((at: any) => ({ weight: at.weight, status: statusMap(at.status) })),
        total: a.total,
        competition: 'CHAMPIONNAT FA 2025',
      });
    }
  }, [athleteIndex, selectedLift]);

  const statusMap = (s: string) => {
    if (s === 'valid') return 'good';
    if (s === 'invalid') return 'fail';
    return 'pending';
  };

  const nextAthlete = () => {
    setAthleteIndex((prev) => (prev + 1) % data.length);
  };

  if (!athlete) return <div className="text-white p-4">Chargement...</div>;

  return (
    <div>
      <PowerliftingOverlay {...athlete} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setSelectedLift('squat')}
            className={`px-3 py-1 rounded ${selectedLift === 'squat' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-black'}`}
          >
            Squat
          </button>
          <button
            onClick={() => setSelectedLift('bench_press')}
            className={`px-3 py-1 rounded ${selectedLift === 'bench_press' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-black'}`}
          >
            Bench
          </button>
          <button
            onClick={() => setSelectedLift('deadlift')}
            className={`px-3 py-1 rounded ${selectedLift === 'deadlift' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-black'}`}
          >
            Deadlift
          </button>
        </div>
        <button
          onClick={nextAthlete}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
        >
          Athlète suivant
        </button>
      </div>
    </div>
  );
}