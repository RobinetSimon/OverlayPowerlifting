'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

type PersonalBests = {
  best_squat: number | null;
  best_bench: number | null;
  best_deadlift: number | null;
  best_total: number | null;
  best_gl_points: number | null;
};

type CompetitionEntry = {
  date: string | null;
  federation: string | null;
  meet_name: string | null;
  place: string | null;
  equipment: string | null;
  bodyweight: number | null;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
  total: number | null;
  gl_points: number | null;
};

type Profile = {
  name: string;
  url: string;
  personal_bests: PersonalBests | null;
  competition_count: number;
  competitions: CompetitionEntry[];
};

type Props = {
  firstName: string;
  lastName: string;
};

export default function OpenPowerliftingPanel({ firstName, lastName }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const prevAthleteKeyRef = useRef<string>('');

  const athleteKey = `${firstName}-${lastName}`;

  const search = useCallback(async () => {
    if (!firstName || !lastName) return;

    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const apiUrl = `http://${window.location.hostname}:${apiPort}`;
      const params = new URLSearchParams({ firstName, lastName });
      const res = await fetch(`${apiUrl}/openpowerlifting?${params}`);

      if (res.status === 404) {
        setError(`Profil non trouvé pour "${firstName} ${lastName}".`);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur serveur');
      }

      setProfile(await res.json());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName]);

  // Always auto-fetch when athlete changes
  useEffect(() => {
    if (athleteKey !== prevAthleteKeyRef.current && firstName && lastName) {
      prevAthleteKeyRef.current = athleteKey;
      search();
    }
  }, [athleteKey, search, firstName, lastName]);

  function PrCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
    return (
      <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
        <div className="text-xs text-gray-500 uppercase">{label}</div>
        <div className="text-lg font-bold text-gray-800">{value != null ? `${value}${unit ? ` ${unit}` : ''}` : '-'}</div>
      </div>
    );
  }

  return (
    <section className="p-4 bg-orange-50 rounded-2xl shadow-inner border border-orange-100">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-lg font-bold text-gray-800"
        >
          <span className={`transition-transform text-sm ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
          OpenPowerlifting — {firstName} {lastName}
          {loading && <span className="text-sm font-normal text-orange-500 ml-2">Recherche...</span>}
          {profile && !loading && <span className="text-sm font-normal text-green-600 ml-2">({profile.competition_count} compétitions)</span>}
          {error && !loading && <span className="text-sm font-normal text-red-500 ml-2">Non trouvé</span>}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {error && (
            <div className="bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {profile && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Voir sur OpenPowerlifting
                </a>
              </div>

              {/* Personal Bests */}
              {profile.personal_bests && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Records personnels</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <PrCard label="Squat" value={profile.personal_bests.best_squat} unit="kg" />
                    <PrCard label="Bench" value={profile.personal_bests.best_bench} unit="kg" />
                    <PrCard label="Deadlift" value={profile.personal_bests.best_deadlift} unit="kg" />
                    <PrCard label="Total" value={profile.personal_bests.best_total} unit="kg" />
                    <PrCard label="GL Points" value={profile.personal_bests.best_gl_points} />
                  </div>
                </div>
              )}

              {/* Competition History */}
              {profile.competitions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Historique</h3>
                  <div className="max-h-[250px] overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Compétition</th>
                          <th className="text-right p-2">Place</th>
                          <th className="text-right p-2">SQ</th>
                          <th className="text-right p-2">BP</th>
                          <th className="text-right p-2">DL</th>
                          <th className="text-right p-2">Total</th>
                          <th className="text-right p-2">GL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.competitions.map((c, i) => (
                          <tr key={i} className="border-t hover:bg-gray-50">
                            <td className="p-2 whitespace-nowrap">{c.date ?? '-'}</td>
                            <td className="p-2 truncate max-w-[200px]">{c.meet_name ?? '-'}</td>
                            <td className="p-2 text-right">{c.place ?? '-'}</td>
                            <td className="p-2 text-right">{c.squat ?? '-'}</td>
                            <td className="p-2 text-right">{c.bench ?? '-'}</td>
                            <td className="p-2 text-right">{c.deadlift ?? '-'}</td>
                            <td className="p-2 text-right font-semibold">{c.total ?? '-'}</td>
                            <td className="p-2 text-right">{c.gl_points ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!profile && !error && !loading && (
            <p className="text-gray-400 text-sm text-center py-2">Recherche automatique en cours...</p>
          )}
        </div>
      )}
    </section>
  );
}
