'use client';
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

const AttemptBox = ({ weight, status }: { weight: number; status: string }) => {
  const getColor = () => {
    if (status === 'good') return 'bg-green-500';
    if (status === 'fail') return 'bg-red-600';
    return 'bg-gray-300';
  };

  return (
    <div className={`card-box ${getColor()} text-white font-bold px-2 text-sm flex items-center justify-center min-w-[40px] h-[18px]`}>
      {weight}
    </div>
  );
};

interface Attempt {
  weight: number;
  status: string;
}

interface LifterInfo {
  name: string;
  firstName: string;
  category?: string;
}

interface PowerliftingOverlayProps {
  category: string;
  rankInfo: string;
  timer: string;
  lifter: LifterInfo;
  attempts: Attempt[];
  total: number;
  competition: string;
  currentMovement: string;
  visible: boolean;
}

export default function PowerliftingOverlay({
  category,
  lifter,
  attempts,
  total,
  competition,
  currentMovement,
  visible,
}: PowerliftingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (visible && overlayRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.row-1 .card-box', {
          x: -80,
          opacity: 0,
          duration: 1.1,
          ease: 'power3.out',
        });
        gsap.from('.row-2 .card-box', {
          x: -80,
          opacity: 0,
          duration: 1.1,
          delay: 0.3,
          ease: 'power3.out',
        });
        gsap.from('.row-3 .card-box', {
          x: -80,
          opacity: 0,
          duration: 1.1,
          delay: 0.6,
          ease: 'power3.out',
        });
      }, overlayRef);
      return () => ctx.revert();
    }
  }, [visible]);

  if (!visible) return null;

  const formatMovement = (movement: string) => {
    switch (movement) {
      case 'squat':
        return 'Squat';
      case 'bench_press':
        return 'Bench';
      case 'deadlift':
        return 'Deadlift';
      default:
        return movement;
    }
  };

  return (
    <div ref={overlayRef} className="fixed bottom-4 left-4 z-50 flex flex-col gap-1">
      {/* Ligne 1 - catégorie et mouvement */}
      <div className="row-1 flex h-8 text-white text-sm font-bold gap-1">
        {/* Bloc gauche : catégorie */}
        <div className="relative px-3 flex items-center bg-blue-900/60 clip-both-left">
          {category}
        </div>

        {/* Bloc droit : currentMovement */}
        <div className="relative px-3 flex-1 flex items-center bg-blue-900/60 clip-both-right">
          {formatMovement(currentMovement)}
        </div>
      </div>




      {/* Ligne 2 - nom, prénom, essais, total */}
      <div className="relative row-2">
        <div className="card-bg bg-blue-900/60 absolute inset-0 -z-10" />
        <div className="flex gap-1 p-0.5 items-center">
          <div className="text-white font-bold text-lg ml-1">
            {lifter.firstName} {lifter.name}
          </div>

          {attempts.map((a, i) =>
            a.weight != null ? (
              <AttemptBox key={i} weight={a.weight} status={a.status} />
            ) : (
              <div key={i} className="card-box bg-gray-600 w-[40px] h-[18px]" />
            )
          )}

          <div className="card-box bg-yellow-400 text-black font-bold px-2 text-md h-[18px] flex items-center justify-center">
            {total.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Ligne 3 - compétition */}
      <div className="relative row-3">
        <div className="card-bg bg-blue-900/60 absolute inset-0 -z-10" />
        <div className="flex items-center p-0.5">
          <div className="card-box bg-blue-900 text-xs text-gray-300 px-2 py-0.5">
            {competition}
          </div>
        </div>
      </div>
    </div>
  );
}
