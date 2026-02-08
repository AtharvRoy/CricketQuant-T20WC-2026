
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { PredictionEngine } from './services/engine';
import { PredictionResult, DiscoveredMatch, LiveMatchState } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  const [schedule, setSchedule] = useState<DiscoveredMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<DiscoveredMatch | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  // Fetch Today's Matches
  const fetchSchedule = async () => {
    setIsSearching(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "List all major cricket matches (T20I, domestic T20 leagues) scheduled for today or currently live. Provide data in JSON array format: [{ id, teamA, teamB, venue, status, startTime }]. status must be 'Scheduled' or 'Live'.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                teamA: { type: Type.STRING },
                teamB: { type: Type.STRING },
                venue: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['Scheduled', 'Live'] },
                startTime: { type: Type.STRING }
              }
            }
          }
        }
      });
      const data = JSON.parse(response.text || '[]') as DiscoveredMatch[];
      setSchedule(data);
    } catch (e) {
      console.error("Failed to fetch schedule", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Sync details for a specific match
  const syncMatchDetails = async (match: DiscoveredMatch) => {
    setIsSyncing(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Find the specific live details for ${match.teamA} vs ${match.teamB} at ${match.venue}. If live, include current score, wickets, overs, and toss winner. If scheduled, confirm venue and expected toss time. Return as JSON.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              runs: { type: Type.NUMBER },
              wickets: { type: Type.NUMBER },
              overs: { type: Type.NUMBER },
              tossWinner: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Scheduled', 'Live', 'Finished'] },
              liveStatusText: { type: Type.STRING }
            }
          }
        }
      });
      const details = JSON.parse(response.text || '{}');
      setSelectedMatch({ ...match, ...details });
    } catch (e) {
      console.error("Match sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const prediction = useMemo(() => {
    if (!selectedMatch) return null;
    const state: LiveMatchState = { 
      currentRuns: selectedMatch.runs || 0, 
      currentWickets: selectedMatch.wickets || 0, 
      currentOvers: selectedMatch.overs || 0 
    };
    return PredictionEngine.getPrediction(
      selectedMatch.teamA, 
      selectedMatch.teamB, 
      selectedMatch.venue, 
      selectedMatch.tossWinner, 
      state
    );
  }, [selectedMatch]);

  const getDeepAnalysis = async () => {
    if (!selectedMatch || !prediction) return;
    setLoadingAnalysis(true);
    try {
      const prompt = `Act as a senior cricket analyst. Breakdown the match between ${selectedMatch.teamA} and ${selectedMatch.teamB} at ${selectedMatch.venue}. 
      Status: ${selectedMatch.status}. Win Prob: ${(prediction.winProbability * 100).toFixed(1)}% for ${prediction.winner}. 
      Explain venue impact (${prediction.venueImpact}) and SDE expected total (${prediction.liveProjectedScore}).`;
      const res = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt
      });
      setAnalysisText(res.text || '');
    } catch (e) {
      setAnalysisText("Could not generate deep analysis at this time.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-100 font-sans selection:bg-orange-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      </div>

      <header className="relative z-10 border-b border-white/5 bg-slate-900/20 backdrop-blur-xl p-4 sticky top-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 font-black italic text-xl">Q</div>
            <div>
              <h1 className="text-lg font-bold tracking-tighter leading-none uppercase">Cricket<span className="text-orange-500">Quant</span></h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1 uppercase">Today's Forecast Radar</p>
            </div>
          </div>
          
          <button 
            onClick={fetchSchedule}
            disabled={isSearching}
            className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isSearching ? 'SEARCHING...' : 'REFRESH SCHEDULE'}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Schedule Grid */}
        {!selectedMatch && (
          <div className="space-y-6">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Matches for Today</h2>
            {isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-900/40 rounded-[32px] border border-white/5 animate-pulse" />)}
              </div>
            ) : schedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedule.map(match => (
                  <button 
                    key={match.id} 
                    onClick={() => { setSelectedMatch(match); syncMatchDetails(match); }}
                    className="group bg-slate-900/40 border border-white/5 hover:border-orange-500/50 p-6 rounded-[32px] text-left transition-all hover:translate-y-[-4px] shadow-xl"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${match.status === 'Live' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                        {match.status}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">{match.startTime}</span>
                    </div>
                    <div className="text-xl font-black mb-1 leading-tight">{match.teamA}</div>
                    <div className="text-xs font-bold text-slate-600 mb-1 italic">vs</div>
                    <div className="text-xl font-black mb-4 leading-tight">{match.teamB}</div>
                    <div className="pt-4 border-t border-white/5 text-[10px] text-slate-500 font-bold uppercase truncate">
                      📍 {match.venue}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-900/20 rounded-[40px] border border-dashed border-white/10">
                <p className="text-slate-500 text-sm font-bold">No major matches found for today.</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Match Analysis */}
        {selectedMatch && prediction && (
          <div className="space-y-8 animate-fadeIn">
            {/* Back Button */}
            <button onClick={() => { setSelectedMatch(null); setAnalysisText(''); }} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-2">
              ← Back to Schedule
            </button>

            {/* Main Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Prediction Center */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-slate-900 border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
                        {selectedMatch.status === 'Live' ? 'Live Win Probability' : 'Pre-Match Forecast'}
                      </span>
                      <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter mt-2">
                        {(prediction.winProbability * 100).toFixed(0)}<span className="text-orange-500">%</span>
                      </h2>
                      <p className="text-lg font-bold text-slate-400 mt-2">Favorite: <span className="text-white underline decoration-orange-500">{prediction.winner}</span></p>
                    </div>
                    <div className="text-right">
                      <button onClick={() => syncMatchDetails(selectedMatch)} disabled={isSyncing} className="text-[10px] font-black text-blue-500 uppercase hover:text-blue-400">
                        {isSyncing ? 'SYNCING...' : 'FORCE RE-SYNC'}
                      </button>
                      <div className="mt-4 text-[10px] font-mono text-slate-500 space-y-1">
                        <div>VENUE: {selectedMatch.venue.toUpperCase()}</div>
                        <div>TOSS: {selectedMatch.tossWinner?.toUpperCase() || 'PENDING'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Run Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8 border-y border-white/5">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Venue Adjusted xR</p>
                      <p className="text-2xl font-black">{prediction.breakdown.venueBase}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">{prediction.venueImpact}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Team Strength Multiplier</p>
                      <p className="text-2xl font-black text-orange-500">x{prediction.breakdown.teamStrengthMod}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Elo-Based Drift</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Expected Score (SDE)</p>
                      <p className="text-2xl font-black text-white">{prediction.liveProjectedScore}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">Mean Projected Total</p>
                    </div>
                  </div>

                  {/* Live Status If Active */}
                  {selectedMatch.status === 'Live' && (
                    <div className="mt-8 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-red-500 uppercase mb-1">Live Match Progress</p>
                        <p className="text-2xl font-black text-white">{selectedMatch.runs}/{selectedMatch.wickets} <span className="text-sm text-slate-500">({selectedMatch.overs} ov)</span></p>
                      </div>
                      <div className="text-right text-xs font-bold text-slate-400">
                        {selectedMatch.liveStatusText}
                      </div>
                    </div>
                  )}

                  <div className="h-32 mt-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prediction.wpCurve}>
                        <Area type="monotone" dataKey="teamAWP" stroke="#f97316" fill="#f9731633" strokeWidth={3} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Side: Detailed Analysis */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900 border border-white/5 p-8 rounded-[40px] shadow-xl h-full flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Strategic Breakdown</h3>
                  
                  <div className="flex-1 space-y-6">
                    {!analysisText && !loadingAnalysis && (
                      <button 
                        onClick={getDeepAnalysis} 
                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-8 rounded-3xl text-xs font-bold text-slate-400 transition-all"
                      >
                        Click to generate deep predictive analysis
                      </button>
                    )}
                    
                    {loadingAnalysis && (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                      </div>
                    )}

                    {analysisText && (
                      <div className="prose prose-invert prose-sm text-slate-400 font-medium leading-relaxed italic">
                        {analysisText}
                      </div>
                    )}
                  </div>

                  <div className="pt-8 border-t border-white/5 mt-8">
                    <p className="text-[9px] font-black text-slate-600 uppercase mb-4 tracking-tighter underline">Model Parameters</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-700 uppercase">Solver</p>
                        <p className="text-[10px] font-bold text-slate-500">Euler-Maruyama</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-700 uppercase">Simulations</p>
                        <p className="text-[10px] font-bold text-slate-500">1,000 Iterations</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-white/5 text-center text-[8px] text-slate-600 font-mono tracking-[0.4em] uppercase z-40">
        Data: Google Search Grounding • Model: CricketQuant-SDE-V4 • Real-time Sync Active
      </footer>
    </div>
  );
};

export default App;
