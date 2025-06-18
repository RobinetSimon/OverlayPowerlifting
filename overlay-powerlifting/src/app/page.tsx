'use client'
import React, { useEffect, useState } from 'react';
import PowerliftingOverlay from '../components/mainOverlay';
import data from '../data/data.json' assert { type: 'json' };
import { AthleteRaw, OverlayData, AttemptRaw } from '../types/athlete';
import ControlsPanel from '../components/controlsPanel';

const typedData = data as AthleteRaw[];

export default function Page() {
  const [athleteIndex, setAthleteIndex] = useState(0);
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  useEffect(() => {
    if (typedData.length > 0 && athleteIndex < typedData.length) {
      const a = typedData[athleteIndex];
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
        attempts: a.attempts[selectedLift].map((at: AttemptRaw) => ({
          weight: at.weight,
          status: statusMap(at.status),
        })),
        total: a.total,
        competition: 'CHAMPIONNAT FA 2025',
      });
    }
  }, [athleteIndex, selectedLift]);

  const statusMap = (s: string): 'good' | 'fail' | 'pending' => {
    if (s === 'valid') return 'good';
    if (s === 'invalid') return 'fail';
    return 'pending';
  };

  const nextAthlete = () => {
    setAthleteIndex((prev) => (prev + 1) % typedData.length);
  };

  if (!athlete) return <div className="text-white p-4">Chargement...</div>;

  return (
    <div>
      <PowerliftingOverlay {...athlete} />
      <ControlsPanel
        selectedLift={selectedLift}
        onSelectLift={setSelectedLift}
        onNextAthlete={nextAthlete}
      />
    </div>
  );
}
