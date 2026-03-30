'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AthleteRaw, OverlayData, AttemptRaw } from '../../types/athlete';
import LiftSelector from '../../components/liftSelector';
import NextAthleteButton from '../../components/nextAthleteButton';

export default function Controls() {
  const [athletes, setAthletes] = useState<AthleteRaw[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [jsonPath, setJsonPath] = useState(process.env.NEXT_PUBLIC_DEFAULT_JSON_PATH || '');
  const [excelPath, setExcelPath] = useState(process.env.NEXT_PUBLIC_DEFAULT_EXCEL_PATH || '');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [competitionName, setCompetitionName] = useState(process.env.NEXT_PUBLIC_DEFAULT_COMPETITION_NAME || 'COMPETITION');
  const [intervalSec, setIntervalSec] = useState(parseInt(process.env.NEXT_PUBLIC_DEFAULT_UPDATE_INTERVAL_SECONDS || '30'));

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket with auto-reconnect
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const hostname = window.location.hostname;
      const wsPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const ws = new WebSocket(`ws://${hostname}:${wsPort}`);

      ws.onopen = () => {
        setWsConnected(true);
        console.log('Control panel connected to WebSocket.');
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log('Control panel disconnected. Reconnecting...');
        if (!cancelled) setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    };

    connect();

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  // Initial data load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/json/datas.json');
        if (!res.ok) throw new Error('Fichier JSON initial introuvable.');
        setAthletes(await res.json());
      } catch {
        setError('Impossible de charger les données initiales. Vérifiez que public/json/datas.json existe.');
        setAthletes([]);
      }
    })();
  }, []);

  const sendAthleteData = useCallback((athleteIndex: number) => {
    if (athletes.length === 0 || !athletes[athleteIndex]) return;
    setCurrentIndex(athleteIndex);

    const a = athletes[athleteIndex];
    const overlayData: OverlayData = {
      category: a.weight_category,
      rankInfo: `RANK ${athleteIndex + 1}`,
      timer: '10:00',
      lifter: { flag: '🇫🇷', country: 'FRA', name: a.last_name, firstName: a.first_name },
      attempts: a.attempts[selectedLift].map((at: AttemptRaw) => ({
        weight: at.weight,
        status: at.status === 'valid' ? 'good' : at.status === 'invalid' ? 'fail' : 'pending',
      })),
      total: a.total,
      competition: competitionName,
      currentMovement: selectedLift,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'UPDATE_OVERLAY', data: overlayData }));
    } else {
      setError("La connexion WebSocket n'est pas active.");
    }
  }, [athletes, selectedLift, competitionName]);

  const nextAthlete = () => {
    if (athletes.length === 0) return;
    sendAthleteData((currentIndex + 1) % athletes.length);
  };

  const handleAthleteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    sendAthleteData(parseInt(e.target.value, 10));
  };

  const callApi = async (): Promise<boolean> => {
    if (!excelPath || !jsonPath) {
      setError('Merci de renseigner les deux chemins Excel et JSON.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ excelPath, jsonPath });
      const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const apiUrl = `http://${window.location.hostname}:${apiPort}`;
      const response = await fetch(`${apiUrl}/getData?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Erreur serveur : ${response.statusText}`);
      }

      setAthletes(await response.json());
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur API : ${message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoRefresh = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const success = await callApi();
    if (!success) return;

    setProgress(0);
    const totalDuration = intervalSec * 1000;
    const updateRate = 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => Math.min(100, prev + (updateRate / totalDuration) * 100));
    }, updateRate);

    intervalRef.current = setInterval(async () => {
      setProgress(0);
      await callApi();
    }, totalDuration);
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    intervalRef.current = null;
    progressIntervalRef.current = null;
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 py-12 px-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-10 border border-gray-100">
        <h1 className="text-4xl font-extrabold text-center text-blue-800 mb-6 tracking-tight">
          Panneau de Contrôle <span className="text-indigo-600">Stream BFC</span>
        </h1>

        {/* WebSocket status */}
        <div className={`flex items-center gap-2 text-sm ${wsConnected ? 'text-green-600' : 'text-red-500'}`}>
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {wsConnected ? 'WebSocket connecté' : 'WebSocket déconnecté — reconnexion...'}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
            <p className="font-bold">Erreur</p>
            <p>{error}</p>
          </div>
        )}

        <section className="space-y-6 p-6 bg-blue-50 rounded-2xl shadow-inner border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Contrôles Principaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
            <button
              onClick={() => window.open('/overlay', 'OverlayWindow', 'width=1200,height=675')}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition duration-300 transform hover:-translate-y-1 w-full"
            >
              Ouvrir l&apos;Overlay
            </button>
            <LiftSelector selectedLift={selectedLift} onSelect={setSelectedLift} />

            <div className="flex flex-col gap-2">
              <label htmlFor="athlete-select" className="text-sm font-medium">Sélectionner un athlète</label>
              <select
                id="athlete-select"
                value={currentIndex}
                onChange={handleAthleteSelect}
                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
              >
                {athletes.map((athlete, index) => (
                  <option key={`${athlete.first_name}-${index}`} value={index}>
                    {athlete.first_name} {athlete.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-full mt-2 text-center">
              <p className="text-sm text-gray-600">
                Athlète suivant :{' '}
                {athletes.length > 0
                  ? <span className="font-bold">{athletes[(currentIndex + 1) % athletes.length].first_name} {athletes[(currentIndex + 1) % athletes.length].last_name}</span>
                  : <span className="text-gray-500">Aucun.</span>}
              </p>
            </div>

            {athletes[currentIndex] && (
              <div className="col-span-full p-5 bg-white rounded-2xl shadow-md border">
                <h3 className="text-xl font-bold mb-3 border-b pb-2">Détails de l&apos;Athlète</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p><strong>Club :</strong> {athletes[currentIndex].club}</p>
                  <p><strong>Sexe :</strong> {athletes[currentIndex].sex === 'M' ? 'Masculin' : 'Féminin'}</p>
                  <p><strong>Cat. d&apos;âge :</strong> {athletes[currentIndex].category_age}</p>
                  <p><strong>Cat. de poids :</strong> {athletes[currentIndex].weight_category}</p>
                </div>
              </div>
            )}

            <NextAthleteButton onClick={nextAthlete} />
          </div>
        </section>

        <section className="pt-8 border-t space-y-6 p-6 bg-indigo-50 rounded-2xl shadow-inner">
          <h2 className="text-2xl font-bold border-b pb-3 mb-4">Configuration API et Fichiers</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="json-path" className="block text-sm font-medium mb-1">Chemin vers le JSON</label>
              <input id="json-path" type="text" value={jsonPath} onChange={(e) => setJsonPath(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="C:/path/to/datas.json" />
            </div>

            <div>
              <label htmlFor="excel-path" className="block text-sm font-medium mb-1">Chemin vers le fichier Excel</label>
              <input id="excel-path" type="text" value={excelPath} onChange={(e) => setExcelPath(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="C:/path/to/competition.xlsx" />
            </div>

            <div>
              <label htmlFor="competition-name" className="block text-sm font-medium mb-1">Nom de la compétition</label>
              <input id="competition-name" type="text" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} className="w-full p-3 border rounded-xl" />
            </div>

            <div>
              <label htmlFor="interval-sec" className="block text-sm font-medium mb-1">Intervalle de mise à jour (secondes)</label>
              <input id="interval-sec" type="number" min={5} value={intervalSec} onChange={(e) => setIntervalSec(parseInt(e.target.value) || 30)} className="w-full p-3 border rounded-xl" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button
                onClick={startAutoRefresh}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition transform hover:-translate-y-1 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Chargement...' : 'Lancer le rafraîchissement'}
              </button>
              <button
                onClick={stopAutoRefresh}
                className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition transform hover:-translate-y-1 flex-1"
              >
                Arrêter
              </button>
            </div>

            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mt-4 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-10 flex justify-center items-center gap-16 border-t pt-8">
            <img src="/images/ffforce.png" alt="Logo FFFORCE" className="h-24 object-contain" />
            <img src="/images/ffforce_bfc.png" alt="Logo BFC" className="h-24 object-contain" />
          </div>
        </section>
      </div>
    </div>
  );
}
