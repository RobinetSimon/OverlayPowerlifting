'use client';
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { RankedAthlete } from '../types/athlete';

type Props = {
  athletes: RankedAthlete[];
  visible: boolean;
};

export default function RankingOverlay({ athletes, visible }: Props) {
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

  return (
    <div ref={ref} className="fixed bottom-4 left-4 z-50 flex flex-col gap-1 min-w-[500px]">
      <div id="ranking-header" className="card-box bg-blue-900 text-white font-bold text-sm px-4 py-2">
        CLASSEMENT GL POINTS
      </div>

      <div className="space-y-0.5">
        {athletes.map((a) => (
          <div key={a.rank} className="ranking-row relative">
            <div className="card-bg bg-blue-900 absolute inset-0 -z-10" />
            <div className="flex items-center gap-2 px-2 py-1.5 text-white text-sm">
              <span className={`font-bold text-lg min-w-[28px] text-center ${
                a.rank === 1 ? 'text-yellow-400' : a.rank === 2 ? 'text-gray-300' : a.rank === 3 ? 'text-amber-600' : ''
              }`}>
                {a.rank}
              </span>
              <span className="font-bold flex-1">{a.first_name} {a.last_name}</span>
              <span className="text-xs text-gray-300 min-w-[60px]">{a.weight_category}</span>
              <span className="font-semibold min-w-[70px] text-right">{a.total.toFixed(1)} kg</span>
              <div className="card-box bg-yellow-400 text-black font-bold px-2 py-0.5 text-sm min-w-[80px] text-center">
                {a.gl_points.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
