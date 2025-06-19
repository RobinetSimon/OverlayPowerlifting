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
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nouveaux états
  const [jsonPath, setJsonPath] = useState('C:\Users\simon\OneDrive\Bureau\StreamBFC\ProjetOverlay\OverlayPowerlifting\overlay-powerlifting\public\json\datas.json');
  const [excelPath, setExcelPath] = useState('C:\Users\simon\OneDrive\Bureau\StreamBFC\ProjetOverlay\OverlayPowerlifting\dataset\Régional FA JEUNES COMP.xlsm');
  const [intervalSec, setIntervalSec] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(jsonPath);
      const json = await res.json();
      setAthletes(json);
    };
    fetchData();

    const channel = new BroadcastChannel('overlay');
    channelRef.current = channel;

    return () => channel.close();
  }, [jsonPath]);

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

  useEffect(() => {
    sendToOverlay();
  }, [currentIndex, selectedLift, athletes]);

  const callApi = async () => {
    if (!excelPath || !jsonPath) {
      alert("Merci de renseigner les deux chemins Excel et JSON.");
      return false;
    }

    try {
      const params = new URLSearchParams({
        excelPath,
        jsonPath,
      });

      const response = await fetch(`http://localhost:3000/getData?${params.toString()}`);
      if (!(response.status === 200)) {
        const error = await response.json();
        alert(`Erreur API : ${error.error || response.statusText}`);
        return false;
      }
      // La réponse contient maintenant directement le JSON des athlètes
      const json = await response.json();
      setAthletes(json);

      return true;
    } catch (err) {
      alert(`Erreur lors de l'appel API : ${err}`);
      return false;
    }
  };


  // Lance le script et démarre l'intervalle
  const launchPythonScript = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const success = await callApi();
    if (!success) return;

    setProgress(0);
    const totalDuration = intervalSec * 1000;
    const updateRate = 100; // ms
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += updateRate;
      setProgress(Math.min(100, (elapsed / totalDuration) * 100));
      if (elapsed >= totalDuration) {
        elapsed = 0;
        setProgress(0);
      }
    }, updateRate);

    intervalRef.current = setInterval(() => {
      callApi();
    }, totalDuration);
  };


  // Arrête l'exécution répétée
  const stopScript = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(0);
    alert("Exécution répétée arrêtée.");
  };


  return (
    <div className="min-h-screen bg-gray-100 py-10 px-6">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-4">Gestion Stream BFC</h1>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Contrôles</h2>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => window.open('/overlay', 'OverlayWindow', 'width=700,height=300')}
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

        <section className="pt-6 border-t space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Paramètres de chargement de l'overlay</h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Chemin vers le JSON</label>
            <input
              type="text"
              value={jsonPath}
              onChange={(e) => setJsonPath(e.target.value)}
              className="w-full p-2 border rounded"
            />

            <label className="block text-sm font-medium text-gray-700">Chemin vers le fichier Excel</label>
            <input
              type="text"
              value={excelPath}
              onChange={(e) => setExcelPath(e.target.value)}
              className="w-full p-2 border rounded"
            />

            <label className="block text-sm font-medium text-gray-700">Intervalle (en secondes)</label>
            <input
              type="number"
              min={5}
              value={intervalSec}
              onChange={(e) => setIntervalSec(parseInt(e.target.value) || 30)}
              className="w-full p-2 border rounded"
            />

            <button
              onClick={launchPythonScript}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 mt-2 rounded-lg shadow"
            >
              Lancer le script de chargement
            </button>
            <button
              onClick={stopScript}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 mt-2 rounded-lg shadow ml-4"
            >
              Arrêter le script
            </button>

            <div className="w-full h-4 bg-gray-200 rounded overflow-hidden mt-2">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

          </div>

          <div className="mt-10 flex justify-center items-center gap-8">
            <img src="/images/ffforce.png" alt="Logo FFFORCE" className="h-35 object-contain" />
            <img src="/images/ffforce_bfc.png" alt="Logo BFC" className="h-35 object-contain" />
          </div>
        </section>
      </div>
    </div>
  );
}
