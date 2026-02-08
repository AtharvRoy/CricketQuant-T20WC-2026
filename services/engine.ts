
import { LiveMatchState, PredictionResult, Player } from '../types';
import { MOCK_PLAYERS, VENUES } from '../constants';

export class PredictionEngine {
  private static STRENGTHS: Record<string, number> = {
    'India': 9.2, 'Australia': 8.9, 'England': 8.6, 'South Africa': 8.4, 
    'Pakistan': 8.0, 'New Zealand': 8.2, 'West Indies': 7.8, 'Afghanistan': 7.5,
    'Sri Lanka': 7.7, 'Bangladesh': 7.0, 'USA': 6.0, 'Netherlands': 6.5
  };

  private static getFormMultiplier(team: string): number {
    const players = MOCK_PLAYERS.filter(p => p.team === team);
    if (!players.length) return 1.0;
    const avg = players.reduce((sum, p) => sum + p.formIndex, 0) / players.length;
    return 0.95 + (avg * 0.1);
  }

  private static findVenueModifier(venueName: string): number {
    const venue = VENUES.find(v => 
      venueName.toLowerCase().includes(v.name.toLowerCase()) || 
      venueName.toLowerCase().includes(v.city.toLowerCase())
    );
    return venue ? venue.xR_Modifier : 1.0;
  }

  private static simulateToEnd(
    state: LiveMatchState,
    team: string,
    venueMod: number,
    hasToss: boolean,
    iterations: number = 1000
  ): number[] {
    const base = this.STRENGTHS[team] || 7.0;
    const form = this.getFormMultiplier(team);
    const tossBias = hasToss ? 1.05 : 1.0;
    const mu = base * venueMod * form * tossBias;
    const sigma = 0.7;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let r = state.currentRuns;
      let w = state.currentWickets;
      const dt = 1/6;

      for (let t = state.currentOvers; t < 20; t += dt) {
        if (w >= 10) break;
        const wicketProb = 0.04 * (1 + (t / 20)); 
        if (Math.random() < wicketProb) {
          w++;
          continue;
        }
        const noise = (Math.random() - 0.5) * sigma;
        const drift = (mu / 6) * ((10 - w) / 10);
        r += Math.max(0, drift + noise);
      }
      results.push(Math.floor(r));
    }
    return results;
  }

  public static getPrediction(
    teamA: string,
    teamB: string,
    venueName: string,
    tossWinner: string | undefined,
    liveState: LiveMatchState
  ): PredictionResult {
    const venueMod = this.findVenueModifier(venueName);
    const hasToss = tossWinner === teamA;
    
    const simA = this.simulateToEnd(liveState, teamA, venueMod, hasToss);
    const simB = this.simulateToEnd({ currentRuns: 0, currentWickets: 0, currentOvers: 0 }, teamB, venueMod, tossWinner === teamB);

    const avgA = simA.reduce((a, b) => a + b, 0) / simA.length;
    const avgB = simB.reduce((a, b) => a + b, 0) / simB.length;

    let aWins = 0;
    for (let i = 0; i < 1000; i++) {
      if (simA[i] > simB[i]) aWins++;
    }

    const winProb = aWins / 1000;
    const strengthA = this.STRENGTHS[teamA] || 7.0;
    const strengthB = this.STRENGTHS[teamB] || 7.0;

    return {
      winner: winProb > 0.5 ? teamA : teamB,
      winProbability: winProb > 0.5 ? winProb : 1 - winProb,
      expectedTotal: avgA,
      liveProjectedScore: Math.floor(avgA),
      upsetRisk: Math.abs(strengthA - strengthB) > 1.2 && winProb > 0.4 ? 'High' : 'Low',
      venueImpact: venueMod > 1.0 ? 'Batting Friendly' : venueMod < 1.0 ? 'Bowling Friendly' : 'Neutral',
      wpCurve: Array.from({ length: 21 }, (_, i) => ({
        overs: i,
        teamAWP: Math.max(0, Math.min(1, winProb + (Math.random() - 0.5) * 0.1))
      })),
      breakdown: {
        venueBase: Math.floor(160 * venueMod),
        teamStrengthMod: Number((strengthA / 8).toFixed(2)),
        tossAdvantage: hasToss ? 1.05 : 1.0
      }
    };
  }
}
