
export enum MatchStage {
  GROUP = 'Group Stage',
  SUPER8 = 'Super 8',
  SEMIFINAL = 'Semi-Final',
  FINAL = 'Final'
}

export interface Player {
  id: string;
  name: string;
  team: string;
  role: 'Batter' | 'Bowler' | 'All-rounder';
  expectedRunsPerBall: number; // xR
  expectedWicketsPerBall: number; // xW
  formIndex: number; // 0-1
}

export interface MatchState {
  overs: number;
  runs: number;
  wickets: number;
  target?: number;
  battingTeam: string;
  bowlingTeam: string;
}

export interface WPPoint {
  overs: number;
  teamAWP: number;
  teamBWP: number;
}

export interface TournamentProbabilities {
  team: string;
  super8: number;
  semi: number;
  final: number;
  win: number;
}

export interface PredictionResult {
  winner: string;
  winProbability: number;
  expectedTotal: number;
  upsetRisk: 'Low' | 'Medium' | 'High';
  wpCurve: WPPoint[];
}
