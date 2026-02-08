
import { Player } from './types';

export const TEAMS = [
  'India', 'Australia', 'England', 'South Africa', 
  'Pakistan', 'New Zealand', 'West Indies', 'Sri Lanka',
  'Afghanistan', 'Bangladesh', 'Netherlands', 'USA'
];

export const VENUES = [
  { name: 'Wankhede Stadium', city: 'Mumbai', xR_Modifier: 1.1 },
  { name: 'R. Premadasa Stadium', city: 'Colombo', xR_Modifier: 0.9 },
  { name: 'Narendra Modi Stadium', city: 'Ahmedabad', xR_Modifier: 1.05 },
  { name: 'Pallekele International', city: 'Kandy', xR_Modifier: 0.95 }
];

export const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'Virat Kohli', team: 'India', role: 'Batter', expectedRunsPerBall: 1.45, expectedWicketsPerBall: 0, formIndex: 0.92 },
  { id: '2', name: 'Jasprit Bumrah', team: 'India', role: 'Bowler', expectedRunsPerBall: 0, expectedWicketsPerBall: 0.08, formIndex: 0.98 },
  { id: '3', name: 'Travis Head', team: 'Australia', role: 'Batter', expectedRunsPerBall: 1.62, expectedWicketsPerBall: 0.02, formIndex: 0.88 },
  { id: '4', name: 'Rashid Khan', team: 'Afghanistan', role: 'All-rounder', expectedRunsPerBall: 1.2, expectedWicketsPerBall: 0.07, formIndex: 0.95 },
];