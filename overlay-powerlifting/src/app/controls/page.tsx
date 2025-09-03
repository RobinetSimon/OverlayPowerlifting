// Fichier : page.tsx (modifié)
'use client';
import React, { useEffect, useRef, useState } from 'react';
// Assurez-vous que le chemin vers votre type est correct
import { AthleteRaw, OverlayData, AttemptRaw } from '../../types/athlete'; 
import LiftSelector from '../../components/liftSelector';
import NextAthleteButton from '../../components/nextAthleteButton';

export default function Controls() {
  const [athletes, setAthletes] = useState<AthleteRaw[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLift, setSelectedLift] = useState<'squat' | 'bench_press' | 'deadlift'>('squat');

  const wsRef = useRef<WebSocket | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [jsonPath, setJsonPath] = useState('C:/Users/simon/OneDrive/Bureau/StreamBFC/ProjetOverlay/OverlayPowerlifting/overlay-powerlifting/public/json/datas.json');
  const [excelPath, setExcelPath] = useState('C:/Users/simon/OneDrive/Bureau/StreamBFC/ProjetOverlay/OverlayPowerlifting/dataset/Régional FA JEUNES COMP.xlsm');
  const [intervalSec, setIntervalSec] = useState(30);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [competitionName, setCompetitionName] = useState('NOM COMPETITION');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => console.log("Panneau de contrôle connecté au serveur WebSocket !");
    ws.onclose = () => console.log("Panneau de contrôle déconnecté.");
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(jsonPath);
        if (!res.ok) {
          throw new Error(`Failed to fetch JSON from ${jsonPath}`);
        }
        const json = await res.json();
        setAthletes(json);
      } catch (error) {
        console.error("Erreur lors de la récupération du JSON:", error);
        setAthletes([]);
      }
    };
    fetchData();
  }, [jsonPath]);

  const sendAthleteData = (athleteIndex: number) => {
    if (athletes.length === 0 || !athletes[athleteIndex]) return;

    setCurrentIndex(athleteIndex);

    const a = athletes[athleteIndex];
    const overlayData: OverlayData = {
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
        status: at.status === 'valid' ? 'good' : at.status === 'invalid' ? 'fail' : 'pending',
      })),
      total: a.total,
      competition: competitionName,
      currentMovement: selectedLift,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = { type: 'UPDATE_OVERLAY', data: overlayData };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Données de ${a.first_name} ${a.last_name} envoyées via WebSocket.`);
    } else {
      alert("La connexion au serveur WebSocket n'est pas active.");
    }
  };
  
  const nextAthlete = () => {
    if (athletes.length === 0) return;
    const nextIndex = (currentIndex + 1) % athletes.length;
    sendAthleteData(nextIndex);
  };
  
  const handleAthleteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedIndex = parseInt(e.target.value, 10);
      sendAthleteData(selectedIndex);
  };


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
      const json = await response.json();
      setAthletes(json);

      return true;
    } catch (err) {
      alert(`Erreur lors de l'appel API : ${err}`);
      return false;
    }
  };

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
    const updateRate = 100;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 py-12 px-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-10 border border-gray-100 transform transition-all duration-300 hover:shadow-2xl">
        <h1 className="text-4xl font-extrabold text-center text-blue-800 mb-6 tracking-tight">
          Panneau de Contrôle <span className="text-indigo-600">Stream BFC</span>
        </h1>

        <section className="space-y-6 p-6 bg-blue-50 rounded-2xl shadow-inner border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37h.003z"></path></svg>
            Contrôles Principaux
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
            <button
              onClick={() => window.open('/overlay', 'OverlayWindow', 'width=1200,height=675')}
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300 w-full col-span-full md:col-span-1"
            >
              Ouvrir l&apos;Overlay
            </button>
            <LiftSelector selectedLift={selectedLift} onSelect={setSelectedLift} />

            <div className="flex flex-col gap-2 col-span-full md:col-span-1">
              <label htmlFor="athlete-select" className="text-sm font-medium text-gray-700">Sélectionner un athlète</label>
              <select 
                id="athlete-select"
                value={currentIndex} 
                onChange={handleAthleteSelect}
                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out"
              >
                {athletes.map((athlete, index) => (
                  <option key={`${athlete.first_name}-${athlete.last_name}-${index}`} value={index}>
                    {athlete.first_name} {athlete.last_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* CHANGEMENT 1 : ATHLÈTE SUIVANT DÉPLACÉ ICI */}
            <div className="col-span-full mt-2 text-center">
                <p className="text-sm text-gray-600">
                    Athlète suivant :{' '}
                    {athletes.length > 0
                    ? <span className="font-bold text-gray-800">{athletes[(currentIndex + 1) % athletes.length].first_name} {athletes[(currentIndex + 1) % athletes.length].last_name}</span>
                    : <span className="text-gray-500">Aucun athlète chargé.</span>}
                </p>
            </div>
            
            {athletes[currentIndex] && (
              <div className="col-span-full p-5 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border border-gray-200 transform hover:scale-[1.01] transition duration-200 ease-in-out">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 border-b pb-2 border-gray-200">
                      Détails de l&apos;Athlète
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-700">
                      <p>
                          <strong className="text-gray-800">Club :</strong> {athletes[currentIndex].club}
                      </p>
                      <p>
                          <strong className="text-gray-800">Sexe :</strong> {athletes[currentIndex].sex === 'M' ? 'Masculin' : 'Féminin'}
                      </p>
                      <p>
                          <strong className="text-gray-800">Catégorie d&apos;âge :</strong> {athletes[currentIndex].category_age}
                      </p>
                      <p>
                          <strong className="text-gray-800">Catégorie de poids :</strong> {athletes[currentIndex].weight_category}
                      </p>
                  </div>
              </div>
            )}
            
            <NextAthleteButton onClick={nextAthlete} />
          </div>
        </section>
        
         <section className="pt-8 border-t border-gray-200 space-y-6 p-6 bg-indigo-50 rounded-2xl shadow-inner border border-indigo-100">
          <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center">
             <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
             Configuration API et Fichiers
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="json-path" className="block text-sm font-medium text-gray-700 mb-1">Chemin vers le JSON</label>
              <input
                id="json-path"
                type="text"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out"
                placeholder="Ex: C:/path/to/datas.json"
              />
            </div>

            <div>
              <label htmlFor="excel-path" className="block text-sm font-medium text-gray-700 mb-1">Chemin vers le fichier Excel</label>
              <input
                id="excel-path"
                type="text"
                value={excelPath}
                onChange={(e) => setExcelPath(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out"
                placeholder="Ex: C:/path/to/file.xlsm"
              />
            </div>

            <div>
              <label htmlFor="competition-name" className="block text-sm font-medium text-gray-700 mb-1">Nom de la compétition</label>
              <input
                id="competition-name"
                type="text"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out"
                placeholder="Ex: Championnat Régional"
              />
            </div>

            <div>
              <label htmlFor="interval-sec" className="block text-sm font-medium text-gray-700 mb-1">Intervalle de mise à jour (en secondes)</label>
              <input
                id="interval-sec"
                type="number"
                min={5}
                value={intervalSec}
                onChange={(e) => setIntervalSec(parseInt(e.target.value) || 30)}
                className="w-full p-3 border border-gray-300 rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button
                onClick={launchPythonScript}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-purple-300 flex-1"
              >
                Lancer le script de chargement
              </button>
              <button
                onClick={stopScript}
                className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-red-300 flex-1"
              >
                Arrêter le script
              </button>
            </div>

            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mt-4 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {/* CHANGEMENT 2 : LE TEXTE DU POURCENTAGE A ÉTÉ RETIRÉ */}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16 border-t border-gray-200 pt-8">
            <img src="/images/ffforce.png" alt="Logo FFFORCE" className="h-20 sm:h-24 object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105" />
            <img src="/images/ffforce_bfc.png" alt="Logo BFC" className="h-20 sm:h-24 object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105" />
          </div>
        </section>
      </div>
    </div>
  );
}