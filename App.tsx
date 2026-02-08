
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TEAMS, VENUES, MOCK_PLAYERS } from './constants';
import { PredictionEngine } from './services/engine';
import { PredictionResult, TournamentProbabilities } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'match' | 'tournament' | 'players' | 'specs'>('match');
  const [teamA, setTeamA] = useState('India');
  const [teamB, setTeamB] = useState('Australia');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handlePredict();
  }, [teamA, teamB]);

  const handlePredict = () => {
    setLoading(true);
    const result = PredictionEngine.predictMatch(teamA, teamB);
    setPrediction(result);
    setLoading(false);
  };

  const getGeminiInsight = async () => {
    if (!prediction) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Act as a senior cricket analyst. Explain why ${prediction.winner} has a ${Math.round(prediction.winProbability * 100)}% chance to win against ${prediction.winner === teamA ? teamB : teamA} in the 2026 T20WC in India. Mention pitch conditions (spin friendly), xR metrics, and potential for an upset if the risk is ${prediction.upsetRisk}. Keep it concise (3 paragraphs max).`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAnalysis(response.text || 'No insights available.');
    } catch (err) {
      setAnalysis('Failed to fetch AI insights. Check API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-20">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-orange-500">CricketQuant <span className="text-white">2026</span></h1>
          <div className="bg-green-600 px-2 py-1 rounded text-xs font-bold animate-pulse">LIVE ENGINE</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Navigation Tabs */}
        <nav className="flex bg-slate-800 p-1 rounded-lg overflow-x-auto whitespace-nowrap scrollbar-hide">
          {(['match', 'tournament', 'players', 'specs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>

        {activeTab === 'match' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Match Selector */}
            <div className="grid grid-cols-2 gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Team A</label>
                <select 
                  value={teamA} 
                  onChange={(e) => setTeamA(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Team B</label>
                <select 
                  value={teamB} 
                  onChange={(e) => setTeamB(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Prediction Results */}
            {prediction && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-orange-600 shadow-md">
                    <p className="text-xs text-slate-400 uppercase">Predicted Winner</p>
                    <p className="text-2xl font-black text-white">{prediction.winner}</p>
                    <p className="text-sm text-orange-400 font-bold">{(prediction.winProbability * 100).toFixed(1)}% Win Prob</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-blue-500 shadow-md">
                    <p className="text-xs text-slate-400 uppercase">Expected Score (Inn 1)</p>
                    <p className="text-2xl font-black text-white">{prediction.expectedTotal.toFixed(0)}</p>
                    <p className="text-sm text-blue-400 font-bold">xR Analysis</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-red-500 shadow-md">
                    <p className="text-xs text-slate-400 uppercase">Upset Risk</p>
                    <p className={`text-2xl font-black ${prediction.upsetRisk === 'High' ? 'text-red-500' : prediction.upsetRisk === 'Medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                      {prediction.upsetRisk}
                    </p>
                    <p className="text-sm text-slate-400">Monte Carlo Sim</p>
                  </div>
                </div>

                {/* WP Chart */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                  <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-tighter">Win Probability Evolution (SDE Projection)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prediction.wpCurve}>
                        <defs>
                          <linearGradient id="colorWp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="overs" stroke="#94a3b8" label={{ value: 'Overs', position: 'insideBottom', offset: -5 }} />
                        <YAxis stroke="#94a3b8" domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Area type="monotone" dataKey="teamAWP" stroke="#f97316" fillOpacity={1} fill="url(#colorWp)" strokeWidth={3} name={teamA} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                   <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase">Strategic AI Insight</h3>
                    <button 
                      onClick={getGeminiInsight} 
                      disabled={loading}
                      className="text-xs bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Analyzing...' : 'Generate Insight'}
                    </button>
                   </div>
                   {analysis ? (
                     <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{analysis}</p>
                   ) : (
                     <p className="text-slate-500 italic text-sm">Click 'Generate Insight' for deep technical analysis of this matchup.</p>
                   )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tournament' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-700 text-slate-300 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Super 8 %</th>
                    <th className="px-4 py-3">Semi %</th>
                    <th className="px-4 py-3">Final %</th>
                    <th className="px-4 py-3 text-orange-500">Win %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {MOCK_TOURNAMENT_PROBS.map((tp, idx) => (
                    <tr key={tp.team} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-4 font-bold flex items-center gap-2">
                        <span className="text-slate-500">#{idx+1}</span>
                        {tp.team}
                      </td>
                      <td className="px-4 py-4">{(tp.super8 * 100).toFixed(0)}%</td>
                      <td className="px-4 py-4">{(tp.semi * 100).toFixed(0)}%</td>
                      <td className="px-4 py-4">{(tp.final * 100).toFixed(0)}%</td>
                      <td className="px-4 py-4 font-black text-orange-500">{(tp.win * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 text-center uppercase tracking-widest italic">Based on 10,000 Monte Carlo Simulations of the 2026 Schedule</p>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_PLAYERS.map(player => (
                <div key={player.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-orange-500 transition-all">
                  <div>
                    <h4 className="font-bold text-white text-lg">{player.name}</h4>
                    <p className="text-xs text-slate-400 uppercase">{player.team} • {player.role}</p>
                    <div className="flex gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">xR/Ball</p>
                        <p className="text-orange-500 font-black">{player.expectedRunsPerBall}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">xW/Ball</p>
                        <p className="text-blue-500 font-black">{player.expectedWicketsPerBall}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Form</p>
                        <p className="text-green-500 font-black">{(player.formIndex * 100).toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center text-2xl border-2 border-slate-600 group-hover:border-orange-500 transition-colors">
                    {player.name[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'specs' && (
          <div className="space-y-6 animate-fadeIn bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-300">
            <h2 className="text-xl font-bold text-orange-500 mb-4">Technical Specs & SDE Formula</h2>
            
            <section className="space-y-3">
              <h3 className="text-white font-bold text-sm uppercase">SDE Scoring Equation</h3>
              <div className="bg-slate-900 p-4 rounded font-mono text-sm border border-slate-700">
                dRₜ = μ(t, Wₜ, P)dt + σ(t)dBₜ<br/>
                dWₜ = Poisson(λ(t, P))dt
              </div>
              <p className="text-xs italic">μ = Team scoring drift, σ = scoring volatility, Bₜ = Brownian motion, Wₜ = Wicket state process.</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-white font-bold text-sm uppercase">API Endpoints (Python Ready)</h3>
              <ul className="text-xs space-y-2 list-disc list-inside">
                <li><code className="bg-slate-900 px-1 rounded text-orange-400">GET /predict/match?tA={teamA}&tB={teamB}</code> - Returns win probability and xR.</li>
                <li><code className="bg-slate-900 px-1 rounded text-orange-400">POST /simulate/tournament</code> - Runs 10k Monte Carlo sims using SDE core.</li>
                <li><code className="bg-slate-900 px-1 rounded text-orange-400">GET /player/{'{id}'}/impact</code> - Returns actual vs expected metrics.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-white font-bold text-sm uppercase">Data Schema</h3>
              <div className="bg-slate-900 p-4 rounded font-mono text-xs overflow-x-auto">
                <pre>{`
TABLE deliveries (
  match_id UUID,
  ball_num FLOAT,
  batter_id UUID,
  bowler_id UUID,
  line_length VARCHAR,
  expected_runs FLOAT, -- xR
  actual_runs INT,
  expected_wicket FLOAT, -- xW
  is_wicket BOOLEAN
);
                `}</pre>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Mobile Footer Navigation Placeholder */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-2 flex justify-around items-center md:hidden">
         <div className="text-center">
            <div className="w-1 h-1 bg-orange-500 rounded-full mx-auto mb-1"></div>
            <p className="text-[10px] text-slate-300">Dashboard</p>
         </div>
         <div className="text-center opacity-50">
            <p className="text-[10px] text-slate-300">Live</p>
         </div>
         <div className="text-center opacity-50">
            <p className="text-[10px] text-slate-300">Settings</p>
         </div>
      </footer>
    </div>
  );
};

const MOCK_TOURNAMENT_PROBS: TournamentProbabilities[] = [
  { team: 'India', super8: 0.98, semi: 0.75, final: 0.45, win: 0.28 },
  { team: 'Australia', super8: 0.95, semi: 0.68, final: 0.40, win: 0.22 },
  { team: 'South Africa', super8: 0.88, semi: 0.55, final: 0.30, win: 0.15 },
  { team: 'England', super8: 0.92, semi: 0.60, final: 0.25, win: 0.12 },
  { team: 'Afghanistan', super8: 0.70, semi: 0.35, final: 0.10, win: 0.05 },
];

export default App;
