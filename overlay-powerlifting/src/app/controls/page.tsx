'use client';
import React, { useEffect, useRef, useState } from 'react';
import { AthleteRaw, OverlayData, AttemptRaw } from '../../types/athlete';
import LiftSelector from '../../components/liftSelector';
import NextAthleteButton from '../../components/nextAthleteButton';

export default function Controls() {
  const [athletes, setAthletes] = useState<AthleteRaw[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/json/datas.json');
      const json = await res.json();
      setAthletes(json);
    };
    fetchData();

    const channel = new BroadcastChannel('overlay');
    channelRef.current = channel;

    return () => channel.close();
  }, []);

  const sendToOverlay = () => {
    const athlete = athletes[currentIndex];
    if (!athlete) return;

    const payload: OverlayData = {
      category: athlete.weight_category,
      rankInfo: `RANK ${currentIndex + 1}`,
      timer: '10:00',
      lifter: {
        flag: '🇫🇷',
        country: 'FRA',
        name: athlete.last_name,
        firstName: athlete.first_name,
      },
      attempts: athlete.attempts[selectedLift].map(at => ({
        weight: at.weight,
        status: at.status === 'valid' ? 'good' : at.status === 'invalid' ? 'fail' : 'pending',
      })),
      total: athlete.total,
      competition: 'CHAMPIONNAT FA 2025',
    };

    channelRef.current?.postMessage(payload);
  };

  const nextAthlete = () => {
    const nextIndex = (currentIndex + 1) % athletes.length;
    setCurrentIndex(nextIndex);

    const a = athletes[nextIndex];
    const overlayData: OverlayData = {
      category: a.weight_category,
      rankInfo: `RANK ${nextIndex + 1}`,
      timer: '10:00',
      lifter: {
        flag: '🇫🇷',
        country: 'FRA',
        name: a.last_name,
        firstName: a.first_name,
      },
      attempts: a.attempts[selectedLift].map((at: AttemptRaw) => ({
        weight: at.weight,
        status: at.status === 'valid' ? 'good' : at.status === 'invalid' ? 'fail' : 'pending',
      })),
      total: a.total,
      competition: 'CHAMPIONNAT FA 2025',
    };

    const channel = new BroadcastChannel('overlay-channel');
    channel.postMessage({ type: 'UPDATE_OVERLAY', data: overlayData });
    channel.close();
  };

  const openOverlayWindow = () => {
    window.open('/overlay', 'OverlayWindow', 'width=700,height=300');
  };

  useEffect(() => {
    sendToOverlay();
  }, [currentIndex, selectedLift, athletes]);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-4">Gestion Stream BFC</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Contrôles</h2>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={openOverlayWindow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow"
            >
              Ouvrir l'Overlay
            </button>
            <LiftSelector selectedLift={selectedLift} onSelect={setSelectedLift} />
            <NextAthleteButton onClick={nextAthlete} />
          </div>
        </section>

        <section className="text-gray-600 text-sm text-center pt-4 border-t">
          <p>
            Athlète actuel :{' '}
            {athletes[currentIndex]
              ? `${athletes[currentIndex].first_name} ${athletes[currentIndex].last_name}`
              : 'Chargement...'}
          </p>
        </section>

      </div>
    </div>
  );
}
