'use client';
import React, { useState } from 'react';
import { AthleteRaw } from '../types/athlete';

type Props = {
  athlete: AthleteRaw;
  isSelected?: boolean;
  onSelect?: () => void;
};

const liftLabels = { squat: 'Squat', bench_press: 'Bench', deadlift: 'Deadlift' } as const;

function AttemptCell({ weight, status }: { weight: number | null; status: string }) {
  const bg =
    status === 'valid' ? 'bg-green-500 text-white' :
    status === 'invalid' ? 'bg-red-500 text-white' :
    'bg-gray-200 text-gray-600';

  return (
    <div className={`${bg} rounded px-2 py-1 text-center text-sm font-semibold min-w-[50px]`}>
      {weight != null ? weight : '-'}
    </div>
  );
}

export default function AthleteDetailCard({ athlete, isSelected, onSelect }: Props) {
  const [expanded, setExpanded] = useState(isSelected ?? false);

  const bestAttempt = (attempts: { weight: number; status: string }[]) => {
    const valid = attempts.filter(a => a.status === 'valid' && a.weight != null);
    return valid.length > 0 ? Math.max(...valid.map(a => a.weight)) : null;
  };

  return (
    <div className={`rounded-xl border transition ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-t-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {athlete.ranking ?? '-'}
          </span>
          <span className="font-bold text-gray-800">{athlete.first_name} {athlete.last_name}</span>
          <span className="text-sm text-gray-500">{athlete.weight_category}</span>
        </div>
        <div className="flex items-center gap-3">
          {athlete.gl_points != null && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
              {athlete.gl_points.toFixed(2)} GL
            </span>
          )}
          <span className="font-bold text-yellow-600">{(athlete.total ?? 0).toFixed(1)} kg</span>
          {onSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Envoyer
            </button>
          )}
          <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t bg-gray-50 rounded-b-xl space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <p><strong>Club :</strong> {athlete.club}</p>
            <p><strong>Sexe :</strong> {athlete.sex === 'M' ? 'Masculin' : 'Féminin'}</p>
            <p><strong>Cat. âge :</strong> {athlete.category_age}</p>
            <p><strong>Poids :</strong> {athlete.bodyweight != null ? `${athlete.bodyweight} kg` : '-'}</p>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[100px_1fr_60px] gap-2 text-xs font-semibold text-gray-500 px-1">
              <span>Mouvement</span>
              <div className="grid grid-cols-3 gap-1 text-center">
                <span>1er</span><span>2e</span><span>3e</span>
              </div>
              <span className="text-right">Best</span>
            </div>

            {(Object.keys(liftLabels) as (keyof typeof liftLabels)[]).map(lift => {
              const attempts = athlete.attempts[lift];
              const best = bestAttempt(attempts);
              return (
                <div key={lift} className="grid grid-cols-[100px_1fr_60px] gap-2 items-center">
                  <span className="text-sm font-semibold text-gray-700">{liftLabels[lift]}</span>
                  <div className="grid grid-cols-3 gap-1">
                    {attempts.map((a, i) => (
                      <AttemptCell key={i} weight={a.weight} status={a.status} />
                    ))}
                  </div>
                  <span className="text-right text-sm font-bold text-gray-800">
                    {best != null ? best : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
