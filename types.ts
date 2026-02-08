
export interface Player {
  id: string;
  name: string;
  team: string;
  role: 'Batter' | 'Bowler' | 'All-rounder';
  expectedRunsPerBall: number;
  expectedWicketsPerBall: number;
  formIndex: number;
}

export interface LiveMatchState {
  currentRuns: number;
  currentWickets: number;
  currentOvers: number;
  target?: number;
}

export interface DiscoveredMatch {
  id: string;
  teamA: string;
  teamB: string;
  venue: string;
  status: 'Scheduled' | 'Live' | 'Finished';
  startTime?: string;
  runs?: number;
  wickets?: number;
  overs?: number;
  tossWinner?: string;
  liveStatusText?: string;
}

export interface PredictionResult {
  winner: string;
  winProbability: number;
  expectedTotal: number;
  liveProjectedScore: number;
  upsetRisk: 'Low' | 'Medium' | 'High' | 'Extreme';
  wpCurve: { overs: number; teamAWP: number }[];
  venueImpact: string;
  breakdown: {
    venueBase: number;
    teamStrengthMod: number;
    tossAdvantage: number;
  };
}
