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
  bodyweight: number | null;
  total: number;
  ipf_coefficient: number | null;
  ranking: number | null;
  gl_points: number | null;
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
  glPoints?: number | null;
};

export type OverlaySettings = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    validAttempt: string;
    invalidAttempt: string;
  };
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  scale: number;
  visibility: {
    glPoints: boolean;
    ageCategory: boolean;
    weightCategory: boolean;
    club: boolean;
    total: boolean;
    competition: boolean;
  };
  logoUrl: string | null;
};

export type RankedAthlete = {
  rank: number;
  first_name: string;
  last_name: string;
  club: string;
  weight_category: string;
  total: number;
  gl_points: number;
};

export type Group = {
  id: string;
  name: string;
  excelPath: string;
  athletes: AthleteRaw[];
};

export type Platform = {
  id: string;
  name: string;
  groups: Group[];
};

export type RankingConfig = {
  selectedGroupIds: string[];
  sexFilter: ('M' | 'F')[];
  ageCategoryFilter: string[];
};

export const AGE_CATEGORIES = ['SubJunior', 'Junior', 'Senior', 'Master 1', 'Master 2', 'Master 3', 'Master 4'] as const;

export type BrowseEntry = {
  name: string;
  path: string;
  is_directory: boolean;
  extension: string | null;
};

export type BrowseResponse = {
  current_path: string;
  parent_path: string | null;
  entries: BrowseEntry[];
};

export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  colors: {
    primary: '#1e3a5f',
    secondary: '#eab308',
    accent: '#ffffff',
    validAttempt: '#22c55e',
    invalidAttempt: '#dc2626',
  },
  position: 'bottom-left',
  scale: 1.0,
  visibility: {
    glPoints: true,
    ageCategory: true,
    weightCategory: true,
    club: false,
    total: true,
    competition: true,
  },
  logoUrl: null,
};
