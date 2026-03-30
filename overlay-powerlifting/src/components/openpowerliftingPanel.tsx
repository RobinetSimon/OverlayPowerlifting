'use client';
import React, { useState } from 'react';

type PersonalBests = {
  best_squat: number | null;
  best_bench: number | null;
  best_deadlift: number | null;
  best_total: number | null;
  best_dots: number | null;
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
  dots: number | null;
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
  const [manualUrl, setManualUrl] = useState('');

  const search = async (overrideFirstName?: string, overrideLastName?: string) => {
    const fn = overrideFirstName ?? firstName;
    const ln = overrideLastName ?? lastName;
    if (!fn || !ln) return;

    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3000';
      const apiUrl = `http://${window.location.hostname}:${apiPort}`;
      const params = new URLSearchParams({ firstName: fn, lastName: ln });
      const res = await fetch(`${apiUrl}/openpowerlifting?${params}`);

      if (res.status === 404) {
        setError(`Profil non trouvé pour "${fn} ${ln}". Essayez de saisir l'URL manuellement.`);
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
  };

  function PrCard({ label, value }: { label: string; value: number | null | undefined }) {
    return (
      <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
        <div className="text-xs text-gray-500 uppercase">{label}</div>
        <div className="text-lg font-bold text-gray-800">{value != null ? `${value} kg` : '-'}</div>
      </div>
    );
  }

  return (
    <section className="space-y-4 p-6 bg-orange-50 rounded-2xl shadow-inner border border-orange-100">
      <h2 className="text-2xl font-bold border-b pb-3 mb-4">OpenPowerlifting</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => search()}
          disabled={loading || !firstName || !lastName}
          className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold px-6 py-2 rounded-xl shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50"
        >
          {loading ? 'Recherche...' : `Rechercher ${firstName} ${lastName}`}
        </button>
      </div>

      {/* Manual URL fallback */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">URL manuelle (si non trouvé)</label>
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://www.openpowerlifting.org/u/..."
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-3 rounded text-sm">
          {error}
        </div>
      )}

      {profile && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-800">{profile.name}</span>
            <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline">
              Voir sur OpenPowerlifting
            </a>
            <span className="text-sm text-gray-500">({profile.competition_count} compétitions)</span>
          </div>

          {/* Personal Bests */}
          {profile.personal_bests && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Records personnels</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <PrCard label="Squat" value={profile.personal_bests.best_squat} />
                <PrCard label="Bench" value={profile.personal_bests.best_bench} />
                <PrCard label="Deadlift" value={profile.personal_bests.best_deadlift} />
                <PrCard label="Total" value={profile.personal_bests.best_total} />
                <PrCard label="DOTS" value={profile.personal_bests.best_dots} />
              </div>
            </div>
          )}

          {/* Competition History */}
          {profile.competitions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Historique ({profile.competitions.length})</h3>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border">
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
                      <th className="text-right p-2">DOTS</th>
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
                        <td className="p-2 text-right">{c.dots ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
