'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AthleteRaw, OverlayData, AttemptRaw, RankedAthlete, Platform, RankingConfig, AGE_CATEGORIES } from '../../types/athlete';
import LiftSelector from '../../components/liftSelector';
import AthleteDetailCard from '../../components/athleteDetailCard';
import OverlaySettingsPanel, { useOverlaySettings } from '../../components/overlaySettingsPanel';
import OpenPowerliftingPanel from '../../components/openpowerliftingPanel';

let nextId = 1;
function genId() { return `id-${nextId++}-${Date.now()}`; }

export default function Controls() {
  // --- Platforms / Groups ---
  const [platforms, setPlatforms] = useState<Platform[]>(() => [{
    id: genId(), name: 'Plateau 1', groups: [{ id: genId(), name: 'Groupe 1', excelPath: '', athletes: [] }],
  }]);

  // All athletes aggregated from all groups
  const getAllAthletes = useCallback(() => {
    return platforms.flatMap(p => p.groups.flatMap(g => g.athletes));
  }, [platforms]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [competitionName, setCompetitionName] = useState(process.env.NEXT_PUBLIC_DEFAULT_COMPETITION_NAME || 'COMPETITION');
  const [intervalSec, setIntervalSec] = useState(parseInt(process.env.NEXT_PUBLIC_DEFAULT_UPDATE_INTERVAL_SECONDS || '30'));

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'athletes' | 'settings' | 'ranking'>('controls');

  // Ranking config
  const [rankingConfig, setRankingConfig] = useState<RankingConfig>({
    selectedGroupIds: [],
    sexFilter: ['M', 'F'],
    ageCategoryFilter: [...AGE_CATEGORIES],
  });

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

  const sendWs = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      setError("La connexion WebSocket n'est pas active.");
    }
  }, []);

  const athletes = getAllAthletes();

  const buildOverlayData = useCallback((athleteIndex: number): OverlayData | null => {
    const a = athletes[athleteIndex];
    if (!a) return null;
    return {
      category: a.weight_category,
      rankInfo: a.ranking ? `#${a.ranking}` : '',
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
  }, [athletes, selectedLift, competitionName]);

  const sendAthleteData = useCallback((athleteIndex: number) => {
    const overlayData = buildOverlayData(athleteIndex);
    if (!overlayData) return;
    setCurrentIndex(athleteIndex);
    sendWs({ type: 'UPDATE_OVERLAY', data: overlayData });
  }, [buildOverlayData, sendWs]);

  const replayAnimation = useCallback(() => {
    const overlayData = buildOverlayData(currentIndex);
    if (!overlayData) return;
    sendWs({ type: 'HIDE_OVERLAY' });
    setTimeout(() => {
      sendWs({ type: 'UPDATE_OVERLAY', data: overlayData });
    }, 300);
  }, [buildOverlayData, currentIndex, sendWs]);

  const nextAthlete = () => {
    if (athletes.length === 0) return;
    sendAthleteData((currentIndex + 1) % athletes.length);
  };

  const handleAthleteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    sendAthleteData(parseInt(e.target.value, 10));
  };

  // --- Platform / Group management ---
  const addPlatform = () => {
    const pNum = platforms.length + 1;
    setPlatforms([...platforms, {
      id: genId(), name: `Plateau ${pNum}`,
      groups: [{ id: genId(), name: 'Groupe 1', excelPath: '', athletes: [] }],
    }]);
  };

  const removePlatform = (pId: string) => {
    setPlatforms(platforms.filter(p => p.id !== pId));
  };

  const updatePlatformName = (pId: string, name: string) => {
    setPlatforms(platforms.map(p => p.id === pId ? { ...p, name } : p));
  };

  const addGroup = (pId: string) => {
    setPlatforms(platforms.map(p => {
      if (p.id !== pId) return p;
      const gNum = p.groups.length + 1;
      return { ...p, groups: [...p.groups, { id: genId(), name: `Groupe ${gNum}`, excelPath: '', athletes: [] }] };
    }));
  };

  const removeGroup = (pId: string, gId: string) => {
    setPlatforms(platforms.map(p => {
      if (p.id !== pId) return p;
      return { ...p, groups: p.groups.filter(g => g.id !== gId) };
    }));
  };

  const updateGroupName = (pId: string, gId: string, name: string) => {
    setPlatforms(platforms.map(p => {
      if (p.id !== pId) return p;
      return { ...p, groups: p.groups.map(g => g.id === gId ? { ...g, name } : g) };
    }));
  };

  const updateGroupExcelPath = (pId: string, gId: string, excelPath: string) => {
    setPlatforms(platforms.map(p => {
      if (p.id !== pId) return p;
      return { ...p, groups: p.groups.map(g => g.id === gId ? { ...g, excelPath } : g) };
    }));
  };

  const updateGroupAthletes = (pId: string, gId: string, athletes: AthleteRaw[]) => {
    setPlatforms(platforms.map(p => {
      if (p.id !== pId) return p;
      return { ...p, groups: p.groups.map(g => g.id === gId ? { ...g, athletes } : g) };
    }));
  };

  // File upload for a specific group
  const handleGroupFileUpload = async (pId: string, gId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const apiUrl = `http://${window.location.hostname}:${apiPort}`;
      const response = await fetch(`${apiUrl}/upload-excel`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Erreur serveur : ${response.statusText}`);
      }

      const result = await response.json();
      updateGroupExcelPath(pId, gId, result.path);
      updateGroupAthletes(pId, gId, result.athletes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur upload : ${message}`);
    } finally {
      setIsLoading(false);
      const ref = fileInputRefs.current[gId];
      if (ref) ref.value = '';
    }
  };

  // Refresh a specific group by path
  const refreshGroup = async (pId: string, gId: string, excelPath: string) => {
    if (!excelPath) {
      setError('Merci de renseigner le chemin du fichier Excel.');
      return;
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

      const athleteData = await response.json();
      updateGroupAthletes(pId, gId, athleteData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur API : ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all groups
  const refreshAllGroups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const apiUrl = `http://${window.location.hostname}:${apiPort}`;

      for (const p of platforms) {
        for (const g of p.groups) {
          if (!g.excelPath) continue;
          try {
            const params = new URLSearchParams({ excelPath: g.excelPath });
            const response = await fetch(`${apiUrl}/getData?${params.toString()}`);
            if (response.ok) {
              const athleteData = await response.json();
              updateGroupAthletes(p.id, g.id, athleteData);
            }
          } catch { /* skip failed groups */ }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoRefresh = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    await refreshAllGroups();

    setProgress(0);
    const totalDuration = intervalSec * 1000;
    const updateRate = 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => Math.min(100, prev + (updateRate / totalDuration) * 100));
    }, updateRate);

    intervalRef.current = setInterval(async () => {
      setProgress(0);
      await refreshAllGroups();
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

  // Auto-apply settings on change
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendWs({ type: 'OVERLAY_SETTINGS', data: settings });
    }
  }, [settings, sendWs]);

  // --- Ranking ---
  const getFilteredRankingAthletes = useCallback(() => {
    const selectedAthletes = platforms
      .flatMap(p => p.groups.filter(g => rankingConfig.selectedGroupIds.includes(g.id)).flatMap(g => g.athletes));

    return selectedAthletes.filter(a => {
      if (rankingConfig.sexFilter.length > 0 && !rankingConfig.sexFilter.includes(a.sex as 'M' | 'F')) return false;
      if (rankingConfig.ageCategoryFilter.length > 0 && !rankingConfig.ageCategoryFilter.some(cat => a.category_age?.includes(cat))) return false;
      return true;
    });
  }, [platforms, rankingConfig]);

  const sendRanking = useCallback(() => {
    const filtered = getFilteredRankingAthletes();
    const ranked: RankedAthlete[] = filtered
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

    if (ranked.length === 0) {
      setError('Aucun athlète avec GL Points trouvé pour les filtres sélectionnés.');
      return;
    }

    sendWs({ type: 'UPDATE_RANKING', data: ranked });
  }, [getFilteredRankingAthletes, sendWs]);

  const toggleRankingGroup = (gId: string) => {
    setRankingConfig(prev => ({
      ...prev,
      selectedGroupIds: prev.selectedGroupIds.includes(gId)
        ? prev.selectedGroupIds.filter(id => id !== gId)
        : [...prev.selectedGroupIds, gId],
    }));
  };

  const toggleSexFilter = (sex: 'M' | 'F') => {
    setRankingConfig(prev => ({
      ...prev,
      sexFilter: prev.sexFilter.includes(sex)
        ? prev.sexFilter.filter(s => s !== sex)
        : [...prev.sexFilter, sex],
    }));
  };

  const toggleAgeCategoryFilter = (cat: string) => {
    setRankingConfig(prev => ({
      ...prev,
      ageCategoryFilter: prev.ageCategoryFilter.includes(cat)
        ? prev.ageCategoryFilter.filter(c => c !== cat)
        : [...prev.ageCategoryFilter, cat],
    }));
  };

  const tabs = [
    { id: 'controls' as const, label: 'Contrôles' },
    { id: 'athletes' as const, label: `Athlètes (${athletes.length})` },
    { id: 'ranking' as const, label: 'Classement' },
    { id: 'settings' as const, label: 'Personnalisation' },
  ];

  const currentAthlete = athletes[currentIndex];

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
                      <option key={`${athlete.first_name}-${athlete.last_name}-${index}`} value={index}>
                        {athlete.first_name} {athlete.last_name} — {athlete.weight_category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={nextAthlete}
                    disabled={athletes.length === 0}
                    className="bg-green-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50 hover:bg-green-700"
                  >
                    Suivant
                  </button>
                  <button
                    onClick={replayAnimation}
                    disabled={athletes.length === 0}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                    title="Relancer l'animation pour l'athlète en cours"
                  >
                    Relancer
                  </button>
                </div>
              </div>

              {currentAthlete && (
                <AthleteDetailCard athlete={currentAthlete} isSelected />
              )}
            </section>

            {/* OpenPowerlifting inline section */}
            {currentAthlete && (
              <OpenPowerliftingPanel
                firstName={currentAthlete.first_name}
                lastName={currentAthlete.last_name}
              />
            )}

            {/* Platform / Group Configuration */}
            <section className="space-y-6 p-6 bg-indigo-50 rounded-2xl shadow-inner">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-2xl font-bold">Plateaux & Groupes</h2>
                <button
                  onClick={addPlatform}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  + Ajouter un plateau
                </button>
              </div>

              {platforms.map((platform) => (
                <div key={platform.id} className="bg-white rounded-xl p-4 border border-indigo-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={platform.name}
                      onChange={(e) => updatePlatformName(platform.id, e.target.value)}
                      className="font-bold text-lg border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none px-1 bg-transparent"
                    />
                    <span className="text-xs text-gray-400">
                      {platform.groups.reduce((s, g) => s + g.athletes.length, 0)} athlètes
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => addGroup(platform.id)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-lg text-sm transition"
                    >
                      + Groupe
                    </button>
                    {platforms.length > 1 && (
                      <button
                        onClick={() => removePlatform(platform.id)}
                        className="text-red-400 hover:text-red-600 text-sm transition"
                        title="Supprimer le plateau"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {platform.groups.map((group) => (
                    <div key={group.id} className="ml-4 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroupName(platform.id, group.id, e.target.value)}
                          className="font-semibold text-sm border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 bg-transparent"
                        />
                        <span className="text-xs text-gray-400">({group.athletes.length} athlètes)</span>
                        <div className="flex-1" />
                        {platform.groups.length > 1 && (
                          <button
                            onClick={() => removeGroup(platform.id, group.id)}
                            className="text-red-400 hover:text-red-600 text-xs transition"
                            title="Supprimer le groupe"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={group.excelPath}
                          onChange={(e) => updateGroupExcelPath(platform.id, group.id, e.target.value)}
                          className="flex-1 p-2 border rounded-lg text-sm"
                          placeholder="Chemin vers le fichier Excel..."
                        />
                        <button
                          onClick={() => fileInputRefs.current[group.id]?.click()}
                          className="bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg font-semibold text-xs transition"
                        >
                          Parcourir
                        </button>
                        <input
                          ref={el => { fileInputRefs.current[group.id] = el; }}
                          type="file"
                          accept=".xlsx,.xlsm,.xls"
                          onChange={(e) => handleGroupFileUpload(platform.id, group.id, e)}
                          className="hidden"
                        />
                        <button
                          onClick={() => refreshGroup(platform.id, group.id, group.excelPath)}
                          disabled={!group.excelPath || isLoading}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition disabled:opacity-50"
                        >
                          Rafraîchir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Global settings */}
              <div className="space-y-4 pt-4 border-t border-indigo-200">
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

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={startAutoRefresh}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 flex-1 disabled:opacity-50"
                  >
                    {isLoading ? 'Chargement...' : 'Rafraîchir tous les groupes'}
                  </button>
                  <button
                    onClick={stopAutoRefresh}
                    className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition hover:-translate-y-0.5 flex-1"
                  >
                    Arrêter
                  </button>
                </div>

                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
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
              <p className="text-center text-gray-500 py-8">Aucun athlète chargé. Importez des fichiers Excel dans l&apos;onglet Contrôles.</p>
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

        {/* Tab: Ranking */}
        {activeTab === 'ranking' && (
          <div className="space-y-6">
            {/* Group selection */}
            <section className="p-6 bg-indigo-50 rounded-2xl shadow-inner border border-indigo-100">
              <h2 className="text-xl font-bold border-b pb-3 mb-4">Sélection des groupes</h2>
              {platforms.map(platform => (
                <div key={platform.id} className="mb-3">
                  <h3 className="font-semibold text-sm text-gray-700 mb-1">{platform.name}</h3>
                  <div className="flex flex-wrap gap-2 ml-2">
                    {platform.groups.map(group => (
                      <label key={group.id} className="flex items-center gap-1.5 cursor-pointer text-sm bg-white px-3 py-1.5 rounded-lg border hover:border-indigo-400 transition">
                        <input
                          type="checkbox"
                          checked={rankingConfig.selectedGroupIds.includes(group.id)}
                          onChange={() => toggleRankingGroup(group.id)}
                          className="w-4 h-4 rounded"
                        />
                        {group.name}
                        <span className="text-xs text-gray-400">({group.athletes.length})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {platforms.flatMap(p => p.groups).length === 0 && (
                <p className="text-gray-400 text-sm">Ajoutez des groupes dans l&apos;onglet Contrôles.</p>
              )}
            </section>

            {/* Filters */}
            <section className="p-6 bg-purple-50 rounded-2xl shadow-inner border border-purple-100">
              <h2 className="text-xl font-bold border-b pb-3 mb-4">Filtres</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sex filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Sexe</h3>
                  <div className="flex gap-3">
                    {(['M', 'F'] as const).map(sex => (
                      <label key={sex} className="flex items-center gap-1.5 cursor-pointer text-sm bg-white px-4 py-2 rounded-lg border hover:border-purple-400 transition">
                        <input
                          type="checkbox"
                          checked={rankingConfig.sexFilter.includes(sex)}
                          onChange={() => toggleSexFilter(sex)}
                          className="w-4 h-4 rounded"
                        />
                        {sex === 'M' ? 'Homme' : 'Femme'}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Age category filter */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Catégories d&apos;âge</h3>
                  <div className="flex flex-wrap gap-2">
                    {AGE_CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-sm bg-white px-3 py-1.5 rounded-lg border hover:border-purple-400 transition">
                        <input
                          type="checkbox"
                          checked={rankingConfig.ageCategoryFilter.includes(cat)}
                          onChange={() => toggleAgeCategoryFilter(cat)}
                          className="w-3.5 h-3.5 rounded"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Preview */}
            <section className="p-6 bg-green-50 rounded-2xl shadow-inner border border-green-100">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h2 className="text-xl font-bold">Aperçu du classement</h2>
                <button
                  onClick={sendRanking}
                  disabled={rankingConfig.selectedGroupIds.length === 0}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  Envoyer le Classement
                </button>
              </div>

              {(() => {
                const filtered = getFilteredRankingAthletes();
                const ranked = filtered
                  .filter(a => a.gl_points != null && a.gl_points > 0)
                  .sort((a, b) => (b.gl_points ?? 0) - (a.gl_points ?? 0));

                if (rankingConfig.selectedGroupIds.length === 0) {
                  return <p className="text-gray-400 text-sm text-center py-4">Sélectionnez au moins un groupe ci-dessus.</p>;
                }

                if (ranked.length === 0) {
                  return <p className="text-gray-400 text-sm text-center py-4">Aucun athlète avec GL Points trouvé pour les filtres sélectionnés. ({filtered.length} athlètes correspondent aux filtres mais sans GL Points)</p>;
                }

                return (
                  <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-2 w-10">#</th>
                          <th className="text-left p-2">Nom</th>
                          <th className="text-left p-2">Club</th>
                          <th className="text-center p-2">Sexe</th>
                          <th className="text-left p-2">Cat. âge</th>
                          <th className="text-left p-2">Cat. poids</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">GL Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((a, i) => (
                          <tr key={`${a.first_name}-${a.last_name}-${i}`} className={`border-t hover:bg-gray-50 ${i < 5 ? 'font-semibold' : ''}`}>
                            <td className="p-2">
                              <span className={`${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : ''}`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="p-2">{a.first_name} {a.last_name}</td>
                            <td className="p-2 text-gray-500">{a.club}</td>
                            <td className="p-2 text-center">{a.sex}</td>
                            <td className="p-2">{a.category_age}</td>
                            <td className="p-2">{a.weight_category}</td>
                            <td className="p-2 text-right">{a.total?.toFixed(1) ?? '-'}</td>
                            <td className="p-2 text-right font-bold text-purple-700">{a.gl_points?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </section>
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <OverlaySettingsPanel settings={settings} onChange={setSettings} onApply={applySettings} />
        )}
      </div>
    </div>
  );
}
