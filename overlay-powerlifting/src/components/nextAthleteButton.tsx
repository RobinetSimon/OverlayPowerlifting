'use client'
import React from 'react';

type Props = {
  onClick: () => void;
};

const NextAthleteButton: React.FC<Props> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
  >
    Athlète suivant
  </button>
);

export default NextAthleteButton;
