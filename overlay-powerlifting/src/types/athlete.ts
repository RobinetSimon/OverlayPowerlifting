export type AttemptStatus = 'valid' | 'invalid' | 'pending';

export type AttemptRaw = {
  weight: number;
  status: AttemptStatus;
};

export type AthleteRaw = {
  first_name: string;
  last_name: string;
  club: string;
  sex: 'M' | 'F';
  category_age: string;
  weight_category: string;
  total: number;
  attempts: {
    squat: AttemptRaw[];
    bench_press: AttemptRaw[];
    deadlift: AttemptRaw[];
  };
};

export type OverlayAttempt = {
  weight: number;
  status: 'good' | 'fail' | 'pending';
};

export type OverlayData = {
  category: string;
  rankInfo: string;
  timer: string;
  lifter: {
    flag: string;
    country: string;
    name: string;
    firstName: string;
  };
  attempts: OverlayAttempt[];
  total: number;
  competition: string;
  currentMovement: string;
};

