'use client';
import React, { useEffect, useState } from 'react';
import PowerliftingOverlay from '../components/mainOverlay';
import ControlsPanel from '../components/controlsPanel';
import { AthleteRaw, OverlayData, AttemptRaw } from '../types/athlete';

export default function Page() {
  const [typedData, setTypedData] = useState<AthleteRaw[]>([]);
  const [athleteIndex, setAthleteIndex] = useState(0);
  const [athlete, setAthlete] = useState<OverlayData | null>(null);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  const dataPath = process.env.REACT_APP_JSON_PATH || '/json/datas.json' ; // fallback

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(dataPath);
        const json = await response.json();
        setTypedData(json as AthleteRaw[]);
      } catch (err) {
        console.error('Erreur de chargement des données JSON:', err);
      }
    };

    fetchData();
  }, [dataPath]);

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
  }, [athleteIndex, selectedLift, typedData]);

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
