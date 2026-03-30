'use client';
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { RankedAthlete, OverlaySettings, DEFAULT_OVERLAY_SETTINGS } from '../types/athlete';

type Props = {
  athletes: RankedAthlete[];
  visible: boolean;
  settings?: OverlaySettings;
};

export default function RankingOverlay({ athletes, visible, settings = DEFAULT_OVERLAY_SETTINGS }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (visible && ref.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();
        tl.from('#ranking-header', { scaleX: 0, opacity: 0, duration: 0.5, ease: 'power3.out' });
        tl.from('.ranking-row', { x: -40, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }, '-=0.2');
      }, ref);
      return () => ctx.revert();
    }
  }, [visible, athletes]);

  if (!visible || athletes.length === 0) return null;

  const s = settings;

  return (
    <div ref={ref} className={`fixed bottom-4 left-4 z-50 flex flex-col gap-1 min-w-[500px]`}>
      <div
        id="ranking-header"
        className="card-box font-bold text-sm px-4 py-2"
        style={{ backgroundColor: s.colors.primary, color: s.colors.accent }}
      >
        CLASSEMENT GL POINTS
      </div>

      <div className="space-y-0.5">
        {athletes.map((a) => (
          <div key={a.rank} className="ranking-row relative">
            <div className="card-bg absolute inset-0 -z-10" style={{ backgroundColor: s.colors.primary }} />
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm" style={{ color: s.colors.accent }}>
              <span className={`font-bold text-lg min-w-[28px] text-center ${
                a.rank === 1 ? 'text-yellow-400' : a.rank === 2 ? 'text-gray-300' : a.rank === 3 ? 'text-amber-600' : ''
              }`}>
                {a.rank}
              </span>
              <span className="font-bold flex-1">{a.first_name} {a.last_name}</span>
              <span className="text-xs text-gray-300 min-w-[60px]">{a.weight_category}</span>
              <span className="font-semibold min-w-[70px] text-right">{a.total.toFixed(1)} kg</span>
              <div
                className="card-box font-bold px-2 py-0.5 text-sm min-w-[80px] text-center"
                style={{ backgroundColor: s.colors.secondary, color: '#000' }}
              >
                {a.gl_points.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
