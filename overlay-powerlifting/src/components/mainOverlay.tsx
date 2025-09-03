'use client';
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

const AttemptBox = ({ weight, status }: { weight: number; status: string }) => {
  const getAttemptClasses = () => {
    if (status === 'good') {
      return 'bg-green-500 text-white';
    }
    if (status === 'fail') {
      return 'bg-red-600 text-white';
    }
    return 'text-white';
  };

  return (
    <div className={`card-box ${getAttemptClasses()} font-bold px-2 text-sm flex items-center justify-center min-w-[40px] h-[18px]`}>
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
        const tl = gsap.timeline();
        tl.from(['#category-box', '#movement-box'], { scaleX: 0, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 });
        tl.from('#lifter-bg', { x: -50, opacity: 0, duration: 0.5, ease: 'power2.out' }, "-=0.4");
        tl.from('#lifter-name', { x: -20, opacity: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3");
        tl.from('.attempt-box-wrapper', { scale: 0.5, opacity: 0, duration: 0.3, stagger: 0.1 }, "-=0.3");
        tl.from('#total-box', { scale: 0.5, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });
        tl.from('#competition-row', { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, "-=0.4");
      }, overlayRef);
      return () => ctx.revert();
    }
  }, [visible]);

  if (!visible || !lifter || !Array.isArray(attempts)) {
    return null;
  }

  const formatMovement = (movement: string) => {
    switch (movement) {
      case 'squat': return 'Squat';
      case 'bench_press': return 'Bench';
      case 'deadlift': return 'Deadlift';
      default: return movement;
    }
  };

  return (
    <div ref={overlayRef} className="fixed bottom-4 left-4 z-50 flex flex-col gap-1">
      <div className="row-1 flex h-8 text-white text-sm font-bold gap-1">
        <div id="category-box" className="relative px-3 flex items-center bg-blue-900 clip-both-left">
          {category}
        </div>
        <div id="movement-box" className="relative px-3 flex-1 flex items-center bg-blue-900 clip-both-right">
          {formatMovement(currentMovement)}
        </div>
      </div>

      <div className="relative row-2">
        <div id="lifter-bg" className="card-bg bg-blue-900 absolute inset-0 -z-10" />
        <div className="flex gap-1 p-0.5 items-center">
          <div id="lifter-name" className="text-white font-bold text-lg ml-1">
            {lifter.firstName} {lifter.name}
          </div>

          {attempts.map((a, i) =>
            a.weight != null ? (
              <div className="attempt-box-wrapper" key={i}>
                <AttemptBox weight={a.weight} status={a.status} />
              </div>
            ) : (
              <div key={i} className="card-box bg-gray-600 w-[40px] h-[18px]" />
            )
          )}

          <div id="total-box" className="card-box bg-yellow-400 text-black font-bold px-2 text-md h-[18px] flex items-center justify-center">
            {total.toFixed(1)}
          </div>
        </div>
      </div>

      <div id="competition-row" className="relative row-3">
        <div className="card-bg bg-blue-900 absolute inset-0 -z-10" />
        <div className="flex items-center p-0.5">
          <div className="card-box bg-blue-900 text-xs text-gray-300 px-2 py-0.5">
            {competition}
          </div>
        </div>
      </div>
    </div>
  );
}