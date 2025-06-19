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
    <div className="p-4 space-y-4">
      <button onClick={openOverlayWindow} className="bg-blue-600 text-white px-4 py-2 rounded">Ouvrir l'Overlay</button>
      <LiftSelector selectedLift={selectedLift} onSelect={setSelectedLift} />
      <NextAthleteButton onClick={nextAthlete} />
    </div>
  );
}
