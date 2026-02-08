
import { MatchState, WPPoint, PredictionResult } from '../types';

/**
 * Cricket SDE Modeling Logic
 * -------------------------
 * We treat the score R(t) as a stochastic process:
 * dR_t = μ(t, W_t, Players)dt + σ(t)dB_t
 * Where:
 * - μ is the expected run rate (drift)
 * - σ is the volatility (variance in scoring)
 * - W_t is the wicket state process (jumps)
 */

export class PredictionEngine {
  private static simulateInnings(
    startState: MatchState, 
    teamStrength: number, 
    volatility: number = 0.5
  ): { finalRuns: number; path: { overs: number; runs: number; wickets: number }[] } {
    let currentRuns = startState.runs;
    let currentWickets = startState.wickets;
    let path = [{ overs: startState.overs, runs: currentRuns, wickets: currentWickets }];
    
    // Euler-Maruyama discretization (simulating ball-by-ball or over-by-over)
    const dt = 1/6; // one ball
    for (let t = startState.overs; t < 20; t += dt) {
      if (currentWickets >= 10) break;

      // Drift calculation (influenced by team strength and remaining wickets)
      const wicketPressure = (10 - currentWickets) / 10;
      const drift = teamStrength * wicketPressure * dt;
      
      // Diffusion/Stochastic component
      const noise = (Math.random() - 0.5) * volatility * Math.sqrt(dt);
      
      // Poisson-style wicket check
      const wicketProb = 0.04 * (1 + (20 - t) / 20); // Higher risk at the end
      if (Math.random() < wicketProb * dt * 6) {
        currentWickets++;
      }

      currentRuns += Math.max(0, drift + noise * 6); // Scale noise back to runs
      path.push({ overs: Math.min(20, t + dt), runs: Math.floor(currentRuns), wickets: currentWickets });
    }

    return { finalRuns: Math.floor(currentRuns), path };
  }

  public static predictMatch(teamA: string, teamB: string): PredictionResult {
    const iterations = 500;
    let teamAWins = 0;
    let totalTeamARuns = 0;
    
    // Simple strength map for demo
    const strengths: Record<string, number> = { 'India': 8.5, 'Australia': 8.3, 'England': 8.1, 'Afghanistan': 7.2 };
    const sA = strengths[teamA] || 7.5;
    const sB = strengths[teamB] || 7.5;

    for (let i = 0; i < iterations; i++) {
      const inn1 = this.simulateInnings({ overs: 0, runs: 0, wickets: 0, battingTeam: teamA, bowlingTeam: teamB }, sA);
      const inn2 = this.simulateInnings({ overs: 0, runs: 0, wickets: 0, battingTeam: teamB, bowlingTeam: teamA }, sB);
      
      totalTeamARuns += inn1.finalRuns;
      if (inn1.finalRuns > inn2.finalRuns) teamAWins++;
    }

    const winProb = teamAWins / iterations;
    
    // Generate WP Curve (Conceptual)
    const wpCurve: WPPoint[] = Array.from({ length: 21 }, (_, i) => ({
      overs: i,
      teamAWP: Math.max(0.1, Math.min(0.9, winProb + (Math.random() - 0.5) * 0.1)),
      teamBWP: 1 - Math.max(0.1, Math.min(0.9, winProb + (Math.random() - 0.5) * 0.1))
    }));

    return {
      winner: winProb > 0.5 ? teamA : teamB,
      winProbability: winProb > 0.5 ? winProb : 1 - winProb,
      expectedTotal: totalTeamARuns / iterations,
      upsetRisk: winProb > 0.3 && winProb < 0.7 ? 'Medium' : 'Low',
      wpCurve
    };
  }
}
