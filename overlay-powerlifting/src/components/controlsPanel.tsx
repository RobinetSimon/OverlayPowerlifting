'use client'
import React from 'react';
import LiftSelector from './liftSelector';
import NextAthleteButton from './nextAthleteButton';

type Props = {
  selectedLift: 'squat' | 'bench_press' | 'deadlift';
  onSelectLift: (lift: 'squat' | 'bench_press' | 'deadlift') => void;
  onNextAthlete: () => void;
};

const ControlsPanel: React.FC<Props> = ({ selectedLift, onSelectLift, onNextAthlete }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
    <LiftSelector selectedLift={selectedLift} onSelect={onSelectLift} />
    <NextAthleteButton onClick={onNextAthlete} />
  </div>
);

export default ControlsPanel;
