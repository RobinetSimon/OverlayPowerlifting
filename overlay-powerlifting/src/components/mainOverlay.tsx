'use client';
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { OverlaySettings, DEFAULT_OVERLAY_SETTINGS } from '../types/athlete';

const AttemptBox = ({ weight, status, settings }: { weight: number; status: string; settings: OverlaySettings }) => {
  const bg =
    status === 'good' ? settings.colors.validAttempt :
    status === 'fail' ? settings.colors.invalidAttempt :
    'transparent';

  return (
    <div
      className="card-box font-bold px-2 text-sm flex items-center justify-center min-w-[40px] h-[18px]"
      style={{ backgroundColor: bg, color: settings.colors.accent }}
    >
      {weight}
    </div>
  );
};

interface Attempt {
  weight: number;
  status: string;
}

interface PowerliftingOverlayProps {
  category: string;
  lifter: { name: string; firstName: string };
  attempts: Attempt[];
  total: number;
  competition: string;
  currentMovement: string;
  glPoints?: number | null;
  visible: boolean;
  settings?: OverlaySettings;
}

const positionClasses: Record<OverlaySettings['position'], string> = {
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
};

const transformOrigins: Record<OverlaySettings['position'], string> = {
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
  'top-left': 'top left',
  'top-right': 'top right',
};

export default function PowerliftingOverlay({
  category,
  lifter,
  attempts,
  total,
  competition,
  currentMovement,
  glPoints,
  visible,
  settings = DEFAULT_OVERLAY_SETTINGS,
}: PowerliftingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || !overlayRef.current) return;

    const tl = gsap.timeline();
    tl.fromTo(['#category-box', '#movement-box'], { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1 });
    tl.fromTo('#lifter-bg', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, "-=0.4");
    tl.fromTo('#lifter-content > *', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }, "-=0.3");
    tl.fromTo('.attempt-box-wrapper', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.1 }, "-=0.2");
    tl.fromTo('#total-box', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' });
    if (glPoints != null) {
      tl.fromTo('#gl-box', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, "-=0.3");
    }
    tl.fromTo('#competition-row', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, "-=0.4");

    return () => { tl.kill(); };
  }, [visible, glPoints]);

  if (!visible || !lifter || !Array.isArray(attempts)) return null;

  const formatMovement = (movement: string) => {
    switch (movement) {
      case 'squat': return 'Squat';
      case 'bench_press': return 'Bench';
      case 'deadlift': return 'Deadlift';
      default: return movement;
    }
  };

  const s = settings;

  return (
    <div
      ref={overlayRef}
      className={`fixed ${positionClasses[s.position]} z-50 flex flex-col gap-1`}
      style={{ transform: `scale(${s.scale})`, transformOrigin: transformOrigins[s.position] }}
    >
      {/* Row 1: Category + Movement */}
      <div className="row-1 flex h-8 text-sm font-bold gap-1" style={{ color: s.colors.accent }}>
        {s.visibility.weightCategory && (
          <div id="category-box" className="relative px-3 flex items-center clip-both-left" style={{ backgroundColor: s.colors.primary }}>
            {category}
          </div>
        )}
        <div id="movement-box" className="relative px-3 flex-1 flex items-center clip-both-right" style={{ backgroundColor: s.colors.primary }}>
          {formatMovement(currentMovement)}
        </div>
      </div>

      {/* Row 2: Lifter + Attempts + Total */}
      <div className="relative row-2">
        <div id="lifter-bg" className="card-bg absolute inset-0 -z-10" style={{ backgroundColor: s.colors.primary }} />
        <div id="lifter-content" className="flex gap-1 p-0.5 items-center">
          <div className="font-bold text-lg ml-1" style={{ color: s.colors.accent }}>
            {lifter.firstName} {lifter.name}
          </div>

          {[0, 1, 2].map(index => {
            const attempt = attempts[index];
            return (
              <div className="attempt-box-wrapper" key={index}>
                {attempt && attempt.weight != null ? (
                  <AttemptBox weight={attempt.weight} status={attempt.status} settings={s} />
                ) : (
                  <div className="min-w-[40px] h-[18px]" />
                )}
              </div>
            );
          })}

          {s.visibility.total && (
            <div id="total-box" className="card-box font-bold px-2 text-md h-[18px] flex items-center justify-center"
              style={{ backgroundColor: s.colors.secondary, color: '#000' }}>
              {(total ?? 0).toFixed(1)}
            </div>
          )}

          {s.visibility.glPoints && glPoints != null && (
            <div id="gl-box" className="card-box font-bold px-2 text-xs h-[18px] flex items-center justify-center bg-purple-600 text-white">
              {glPoints.toFixed(2)} GL
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Competition + Logo */}
      {s.visibility.competition && (
        <div id="competition-row" className="relative row-3">
          <div className="card-bg absolute inset-0 -z-10" style={{ backgroundColor: s.colors.primary }} />
          <div className="flex items-center p-0.5">
            <div className="card-box text-xs px-2 py-0.5 flex items-center gap-1" style={{ backgroundColor: s.colors.primary, color: '#9ca3af' }}>
              {competition}
              {s.logoUrl && (
                <img src={s.logoUrl} alt="" className="h-5 w-5 object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
