'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AthleteRaw, OverlayData, AttemptRaw, RankedAthlete } from '../../types/athlete';
import LiftSelector from '../../components/liftSelector';
import NextAthleteButton from '../../components/nextAthleteButton';
import FileBrowser from '../../components/fileBrowser';
import AthleteDetailCard from '../../components/athleteDetailCard';
import OverlaySettingsPanel, { useOverlaySettings } from '../../components/overlaySettingsPanel';
import OpenPowerliftingPanel from '../../components/openpowerliftingPanel';

export default function Controls() {
  const [athletes, setAthletes] = useState<AthleteRaw[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [excelPath, setExcelPath] = useState(process.env.NEXT_PUBLIC_DEFAULT_EXCEL_PATH || '');
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [competitionName, setCompetitionName] = useState(process.env.NEXT_PUBLIC_DEFAULT_COMPETITION_NAME || 'COMPETITION');
  const [intervalSec, setIntervalSec] = useState(parseInt(process.env.NEXT_PUBLIC_DEFAULT_UPDATE_INTERVAL_SECONDS || '30'));

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'athletes' | 'settings' | 'openpowerlifting'>('controls');

  const { settings, setSettings } = useOverlaySettings();

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
        setAthletes([]);
      }
    })();
  }, []);

  const sendWs = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      setError("La connexion WebSocket n'est pas active.");
    }
  }, []);

  const sendAthleteData = useCallback((athleteIndex: number) => {
    if (athletes.length === 0 || !athletes[athleteIndex]) return;
    setCurrentIndex(athleteIndex);

    const a = athletes[athleteIndex];
    const overlayData: OverlayData = {
      category: a.weight_category,
      rankInfo: `RANK ${athleteIndex + 1}`,
      timer: '10:00',
      lifter: { flag: '', country: 'FRA', name: a.last_name, firstName: a.first_name },
      attempts: a.attempts[selectedLift].map((at: AttemptRaw) => ({
        weight: at.weight,
        status: at.status === 'valid' ? 'good' : at.status === 'invalid' ? 'fail' : 'pending',
      })),
      total: a.total,
      competition: competitionName,
      currentMovement: selectedLift,
      glPoints: a.gl_points,
    };

    sendWs({ type: 'UPDATE_OVERLAY', data: overlayData });
  }, [athletes, selectedLift, competitionName, sendWs]);

  const sendRanking = useCallback(() => {
    const ranked: RankedAthlete[] = athletes
      .filter(a => a.gl_points != null && a.gl_points > 0)
      .sort((a, b) => (b.gl_points ?? 0) - (a.gl_points ?? 0))
      .slice(0, 5)
      .map((a, i) => ({
        rank: i + 1,
        first_name: a.first_name,
        last_name: a.last_name,
        club: a.club,
        weight_category: a.weight_category,
        total: a.total ?? 0,
        gl_points: a.gl_points ?? 0,
      }));

    sendWs({ type: 'UPDATE_RANKING', data: ranked });
  }, [athletes, sendWs]);

  const nextAthlete = () => {
    if (athletes.length === 0) return;
    sendAthleteData((currentIndex + 1) % athletes.length);
  };

  const handleAthleteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    sendAthleteData(parseInt(e.target.value, 10));
  };

  const callApi = async (): Promise<boolean> => {
    if (!excelPath) {
      setError('Merci de renseigner le chemin du fichier Excel.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ excelPath });
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

  const applySettings = () => {
    sendWs({ type: 'OVERLAY_SETTINGS', data: settings });
  };

  const tabs = [
    { id: 'controls' as const, label: 'Contrôles' },
    { id: 'athletes' as const, label: `Athlètes (${athletes.length})` },
    { id: 'settings' as const, label: 'Personnalisation' },
    { id: 'openpowerlifting' as const, label: 'OpenPowerlifting' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 py-12 px-6 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-6 border border-gray-100">
        <h1 className="text-4xl font-extrabold text-center text-blue-800 tracking-tight">
          Panneau de Contrôle <span className="text-indigo-600">Stream BFC</span>
        </h1>

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-sm ${wsConnected ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {wsConnected ? 'WebSocket connecté' : 'WebSocket déconnecté'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open('/overlay', 'OverlayWindow', 'width=1200,height=675')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              Overlay
            </button>
            <button
              onClick={() => window.open('/ranking', 'RankingWindow', 'width=1200,height=675')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              Classement
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
            <p className="font-bold">Erreur</p>
            <p>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Controls */}
        {activeTab === 'controls' && (
          <div className="space-y-6">
            <section className="space-y-6 p-6 bg-blue-50 rounded-2xl shadow-inner border border-blue-100">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">Contrôles Principaux</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
                <LiftSelector selectedLift={selectedLift} onSelect={setSelectedLift} />

                <div className="flex flex-col gap-2">
                  <label htmlFor="athlete-select" className="text-sm font-medium">Sélectionner un athlète</label>
                  <select
                    id="athlete-select"
                    value={currentIndex}
                    onChange={handleAthleteSelect}
                    className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {athletes.map((athlete, index) => (
                      <option key={`${athlete.first_name}-${index}`} value={index}>
                        {athlete.first_name} {athlete.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <NextAthleteButton onClick={nextAthlete} />

                <button
                  onClick={sendRanking}
                  disabled={athletes.length === 0}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  Envoyer le Classement
                </button>
              </div>

              {athletes[currentIndex] && (
                <AthleteDetailCard athlete={athletes[currentIndex]} isSelected />
              )}
            </section>

            <section className="space-y-6 p-6 bg-indigo-50 rounded-2xl shadow-inner">
              <h2 className="text-2xl font-bold border-b pb-3">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="excel-path" className="block text-sm font-medium mb-1">Fichier Excel</label>
                  <div className="flex gap-2">
                    <input
                      id="excel-path" type="text" value={excelPath}
                      onChange={(e) => setExcelPath(e.target.value)}
                      className="flex-1 p-3 border rounded-xl"
                      placeholder="Chemin vers le fichier Excel..."
                    />
                    <button
                      onClick={() => setFileBrowserOpen(true)}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-xl font-semibold text-sm transition"
                    >
                      Parcourir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="competition-name" className="block text-sm font-medium mb-1">Nom de la compétition</label>
                    <input id="competition-name" type="text" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} className="w-full p-3 border rounded-xl" />
                  </div>
                  <div>
                    <label htmlFor="interval-sec" className="block text-sm font-medium mb-1">Intervalle de mise à jour (sec)</label>
                    <input id="interval-sec" type="number" min={5} value={intervalSec} onChange={(e) => setIntervalSec(parseInt(e.target.value) || 30)} className="w-full p-3 border rounded-xl" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <button
                    onClick={startAutoRefresh}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 flex-1 disabled:opacity-50"
                  >
                    {isLoading ? 'Chargement...' : 'Lancer le rafraîchissement'}
                  </button>
                  <button
                    onClick={stopAutoRefresh}
                    className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 flex-1"
                  >
                    Arrêter
                  </button>
                </div>

                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mt-4 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab: Athletes */}
        {activeTab === 'athletes' && (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {athletes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun athlète chargé. Importez un fichier Excel.</p>
            ) : (
              athletes.map((athlete, index) => (
                <AthleteDetailCard
                  key={`${athlete.first_name}-${athlete.last_name}-${index}`}
                  athlete={athlete}
                  isSelected={index === currentIndex}
                  onSelect={() => sendAthleteData(index)}
                />
              ))
            )}
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <OverlaySettingsPanel settings={settings} onChange={setSettings} onApply={applySettings} />
        )}

        {/* Tab: OpenPowerlifting */}
        {activeTab === 'openpowerlifting' && athletes[currentIndex] && (
          <OpenPowerliftingPanel
            firstName={athletes[currentIndex].first_name}
            lastName={athletes[currentIndex].last_name}
          />
        )}

        {activeTab === 'openpowerlifting' && !athletes[currentIndex] && (
          <p className="text-center text-gray-500 py-8">Sélectionnez un athlète pour rechercher son profil.</p>
        )}
      </div>

      <FileBrowser
        open={fileBrowserOpen}
        onClose={() => setFileBrowserOpen(false)}
        onSelect={(path) => setExcelPath(path)}
      />
    </div>
  );
}
