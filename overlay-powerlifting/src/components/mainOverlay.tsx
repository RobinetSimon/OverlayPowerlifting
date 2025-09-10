'use client';
import React, { useLayoutEffect, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import RecordAttempt from './RecordAttempt'
import { OverlayAttempt, Lifter } from '../types/athlete';

const AttemptBox = ({ weight, status }: { weight: number; status: string }) => {
  const getAttemptClasses = () => {
    if (status === 'good') return 'bg-green-500 text-white';
    if (status === 'fail') return 'bg-red-600 text-white';
    return 'text-white';
  };

  return (
    <div className={`card-box ${getAttemptClasses()} font-bold px-2 text-sm flex items-center justify-center min-w-[40px] h-[18px]`}>
      {weight}
    </div>
  );
};

interface PowerliftingOverlayProps {
  category: string;
  rankInfo: string;
  timer: string;
  lifter: Lifter;
  attempts: OverlayAttempt[];
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
  const animation = useRef<gsap.core.Timeline | null>(null);

  // --- VOTRE ANIMATION D'ENTRÉE (INCHANGÉE) ---
  useLayoutEffect(() => {
    if (visible && overlayRef.current) {
      const ctx = gsap.context(() => {
        animation.current = gsap.timeline();
        animation.current.from(['#category-box', '#movement-box'], { scaleX: 0, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 });
        animation.current.from('#lifter-bg', { x: -50, opacity: 0, duration: 0.5, ease: 'power2.out' }, "-=0.4");
        animation.current.from('#lifter-name', { x: -20, opacity: 0, duration: 0.5, ease: 'power2.out' }, "-=0.3");
        animation.current.from('.attempt-box-wrapper', { scale: 0.5, opacity: 0, duration: 0.3, stagger: 0.1 }, "-=0.3");
        animation.current.from('#total-box', { scale: 0.5, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });
        animation.current.from('#competition-row', { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, "-=0.4");
      }, overlayRef);
      return () => ctx.revert();
    }
  }, [visible]);

  // --- NOUVELLE ANIMATION DE SORTIE "MIROIR" (GSAP) ---
  useEffect(() => {
    // Se déclenche uniquement quand l'overlay doit disparaître
    if (!visible && overlayRef.current) {
      // On ne touche pas à l'animation d'entrée, on en crée une nouvelle pour la sortie.
      const exitTl = gsap.timeline();
      
      // On anime les éléments dans l'ORDRE INVERSE de l'animation d'entrée
      exitTl.to('#competition-row', { y: 20, opacity: 0, duration: 0.3, ease: 'power2.in' });
      exitTl.to('#total-box', { scale: 0.5, opacity: 0, duration: 0.2, ease: 'power2.in' }, "-=0.2");
      exitTl.to('.attempt-box-wrapper', { scale: 0.5, opacity: 0, duration: 0.15, stagger: { from: "end", each: 0.05 } }, "<");
      exitTl.to(['#lifter-name', '#lifter-bg'], { x: -20, opacity: 0, duration: 0.3, ease: 'power2.in' }, "<");
      exitTl.to(['#category-box', '#movement-box'], { scaleX: 0, opacity: 0, duration: 0.4, ease: 'power3.in', stagger: { from: "end", each: 0.1 } });
    }
  }, [visible]);


  const isRecordAttempt = attempts.some(
    (att) => att.status === 'pending' && att.isRecordAttempt
  );

  const formatMovement = (movement: string) => {
    switch (movement) {
      case 'squat': return 'Squat';
      case 'bench_press': return 'Bench';
      case 'deadlift': return 'Deadlift';
      default: return movement;
    }
  };

  return (
    // Le wrapper motion.div est inchangé et reste nécessaire
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
    >
      <div ref={overlayRef} className="fixed bottom-4 left-4 right-4 flex items-end justify-between z-50 pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto">
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

              {[0, 1, 2].map(index => {
                const attempt = attempts[index];
                return (
                  <div className="attempt-box-wrapper" key={index}>
                    {attempt && attempt.weight != null ? (
                      <AttemptBox weight={attempt.weight} status={attempt.status} />
                    ) : (
                      <div className="min-w-[40px] h-[18px]" />
                    )}
                  </div>
                );
              })}

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

        <div className="pointer-events-auto">
          <RecordAttempt visible={isRecordAttempt} />
        </div>
      </div>
    </motion.div>
  );
}