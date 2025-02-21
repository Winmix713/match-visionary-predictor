import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, Users, Goal, Loader2, ArrowUpRight, Play, Settings, Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MatchData {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  both_teams_scored: boolean;
}

interface TeamStats {
  totalMatches: number;
  homeMatches: number;
  awayMatches: number;
  bothTeamsScoredCount: number;
  bothTeamsScoredPercentage: number;
  averageGoalsScored: number;
  averageGoalsConceded: number;
  homeGoalsScored: number;
  homeGoalsConceded: number;
  awayGoalsScored: number;
  awayGoalsConceded: number;
  lastFiveMatches: boolean[];
  formPercentage: number;
  expectedGoals?: number;
  headToHeadStats?: {
    homeWins: number;
    awayWins: number;
    draws: number;
    homeWinPercentage: number;
    awayWinPercentage: number;
    drawPercentage: number;
  };
  recentPredictions?: {
    total: number;
    correct: number;
    accuracy: number;
  };
}

interface MatchPrediction {
  homeTeam: string;
  awayTeam: string;
  probability: number;
  timestamp: number;
  actualResult?: boolean;
  verified: boolean;
  isDerby?: boolean;
  isSeasonEnd?: boolean;
  h2hStats?: {
    lastEncounters: number;
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  formTrend?: {
    home: number[];
    away: number[];
  };
}

const Index = () => {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<{[key: string]: TeamStats}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<Array<{home: string, away: string}>>([]);
  const [predictedMatches, setPredictedMatches] = useState<MatchPrediction[]>([]);
  const [weights, setWeights] = useState({
    homeBTTS: 25,
    awayBTTS: 20,
    homeForm: 15,
    awayForm: 15,
    homeGoalsScored: 10,
    homeGoalsConceded: 5,
    awayGoalsScored: 5,
    awayGoalsConceded: 5
  });
  const [showWeights, setShowWeights] = useState(false);
  const [professionalMode, setProfessionalMode] = useState(false);
  const [savedPredictions, setSavedPredictions] = useState<MatchPrediction[]>([]);
  const [h2hAnalysis, setH2hAnalysis] = useState<any>(null);
  const [seasonalTrends, setSeasonalTrends] = useState<any>(null);
  const [modelAccuracy, setModelAccuracy] = useState<{
    total: number;
    correct: number;
    accuracy: number;
  }>({ total: 0, correct: 0, accuracy: 0 });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/Winmix713/matches12/refs/heads/main/cleaned_matches_supabase.csv');
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const text = await response.text();
        const rows = text.split('\n').slice(1).filter(row => row.trim());
        const parsedData: MatchData[] = rows.map(row => {
          const [home_team, away_team, home_score, away_score, both_teams_scored] = row.split(',');
          return {
            home_team,
            away_team,
            home_score: parseInt(home_score),
            away_score: parseInt(away_score),
            both_teams_scored: both_teams_scored.trim() === 'True'
          };
        });

        const uniqueTeams = Array.from(new Set([
          ...parsedData.map(match => match.home_team),
          ...parsedData.map(match => match.away_team)
        ])).sort();

        setMatchData(parsedData);
        setTeams(uniqueTeams);
        calculateTeamStats(parsedData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateTeamStats = (data: MatchData[]) => {
    const stats: {[key: string]: TeamStats} = {};
    const allTeams = new Set([...data.map(m => m.home_team), ...data.map(m => m.away_team)]);
    
    allTeams.forEach(team => {
      stats[team] = {
        totalMatches: 0,
        homeMatches: 0,
        awayMatches: 0,
        bothTeamsScoredCount: 0,
        bothTeamsScoredPercentage: 0,
        averageGoalsScored: 0,
        averageGoalsConceded: 0,
        homeGoalsScored: 0,
        homeGoalsConceded: 0,
        awayGoalsScored: 0,
        awayGoalsConceded: 0,
        lastFiveMatches: [],
        formPercentage: 0
      };
    });

    data.forEach(match => {
      stats[match.home_team].totalMatches++;
      stats[match.home_team].homeMatches++;
      stats[match.home_team].bothTeamsScoredCount += match.both_teams_scored ? 1 : 0;
      stats[match.home_team].homeGoalsScored += match.home_score;
      stats[match.home_team].homeGoalsConceded += match.away_score;
      stats[match.home_team].lastFiveMatches.push(match.both_teams_scored);

      stats[match.away_team].totalMatches++;
      stats[match.away_team].awayMatches++;
      stats[match.away_team].bothTeamsScoredCount += match.both_teams_scored ? 1 : 0;
      stats[match.away_team].awayGoalsScored += match.away_score;
      stats[match.away_team].awayGoalsConceded += match.home_score;
      stats[match.away_team].lastFiveMatches.push(match.both_teams_scored);
    });

    Object.keys(stats).forEach(team => {
      const teamStat = stats[team];
      teamStat.lastFiveMatches = teamStat.lastFiveMatches.slice(-5);
      teamStat.formPercentage = (teamStat.lastFiveMatches.filter(Boolean).length / 
        teamStat.lastFiveMatches.length) * 100;
      teamStat.bothTeamsScoredPercentage = (teamStat.bothTeamsScoredCount / teamStat.totalMatches) * 100;
      teamStat.averageGoalsScored = 
        (teamStat.homeGoalsScored + teamStat.awayGoalsScored) / teamStat.totalMatches;
      teamStat.averageGoalsConceded = 
        (teamStat.homeGoalsConceded + teamStat.awayGoalsConceded) / teamStat.totalMatches;
    });

    setTeamStats(stats);
  };

  const calculateMatchProbability = (home: string, away: string): number => {
    if (!teamStats[home] || !teamStats[away]) return 0;
    
    const homeStats = teamStats[home];
    const awayStats = teamStats[away];

    let probability: number;

    if (professionalMode) {
      const currentSystemProb = 
        (homeStats.bothTeamsScoredPercentage * (weights.homeBTTS / 200)) +
        (awayStats.bothTeamsScoredPercentage * (weights.awayBTTS / 200)) +
        (homeStats.formPercentage * (weights.homeForm / 200)) +
        (awayStats.formPercentage * (weights.awayForm / 200)) +
        (((homeStats.homeGoalsScored / homeStats.homeMatches) * 100) * (weights.homeGoalsScored / 200)) +
        (((homeStats.homeGoalsConceded / homeStats.homeMatches) * 100) * (weights.homeGoalsConceded / 200)) +
        (((awayStats.awayGoalsScored / awayStats.awayMatches) * 100) * (weights.awayGoalsScored / 200)) +
        (((awayStats.awayGoalsConceded / awayStats.awayMatches) * 100) * (weights.awayGoalsConceded / 200));

      const complexSystemProb = calculateComplexProbability(homeStats, awayStats);
      
      probability = currentSystemProb + complexSystemProb;
    } else {
      probability = 
        (homeStats.bothTeamsScoredPercentage * (weights.homeBTTS / 100)) +
        (awayStats.bothTeamsScoredPercentage * (weights.awayBTTS / 100)) +
        (homeStats.formPercentage * (weights.homeForm / 100)) +
        (awayStats.formPercentage * (weights.awayForm / 100)) +
        (((homeStats.homeGoalsScored / homeStats.homeMatches) * 100) * (weights.homeGoalsScored / 100)) +
        (((homeStats.homeGoalsConceded / homeStats.homeMatches) * 100) * (weights.homeGoalsConceded / 100)) +
        (((awayStats.awayGoalsScored / awayStats.awayMatches) * 100) * (weights.awayGoalsScored / 100)) +
        (((awayStats.awayGoalsConceded / awayStats.awayMatches) * 100) * (weights.awayGoalsConceded / 100));
    }

    return Math.min(Math.round(probability), 100);
  };

  const calculateComplexProbability = (homeStats: TeamStats, awayStats: TeamStats): number => {
    const expectedGoalsWeight = 15;
    const formIndexWeight = 15;
    const h2hStatsWeight = 20;

    const homeExpectedGoals = homeStats.averageGoalsScored || 0;
    const awayExpectedGoals = awayStats.averageGoalsScored || 0;
    const expectedGoalsProb = 
      ((homeExpectedGoals + awayExpectedGoals) / 4) * expectedGoalsWeight;

    const homeForm = homeStats.formPercentage || 0;
    const awayForm = awayStats.formPercentage || 0;
    const formProb = ((homeForm + awayForm) / 200) * formIndexWeight;

    const h2hProb = (homeStats.bothTeamsScoredPercentage + 
      awayStats.bothTeamsScoredPercentage) / 2 * (h2hStatsWeight / 100);

    return expectedGoalsProb + formProb + h2hProb;
  };

  const handleAddMatch = () => {
    if (homeTeam && awayTeam) {
      setSelectedMatches(prev => [...prev, { home: homeTeam, away: awayTeam }].slice(-8));
      setHomeTeam('');
      setAwayTeam('');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('predictions');
    if (saved) {
      setSavedPredictions(JSON.parse(saved));
      calculateModelAccuracy(JSON.parse(saved));
    }
  }, []);

  const calculateH2HStats = (home: string, away: string) => {
    const h2hMatches = matchData.filter(match => 
      (match.home_team === home && match.away_team === away) ||
      (match.home_team === away && match.away_team === home)
    ).slice(-50);

    const stats = {
      totalMatches: h2hMatches.length,
      homeWins: h2hMatches.filter(m => 
        m.home_team === home && m.home_score > m.away_score ||
        m.home_team === away && m.away_score > m.home_score
      ).length,
      awayWins: h2hMatches.filter(m => 
        m.home_team === home && m.home_score < m.away_score ||
        m.home_team === away && m.away_score < m.home_score
      ).length,
      draws: h2hMatches.filter(m => m.home_score === m.away_score).length,
      recentForm: h2hMatches.map(m => ({
        timestamp: Date.now(),
        result: m.both_teams_scored ? 1 : 0
      }))
    };

    return stats;
  };

  const calculateSeasonalTrends = (team: string) => {
    const teamMatches = matchData.filter(m => 
      m.home_team === team || m.away_team === team
    ).slice(-50);

    return {
      form: teamMatches.map(m => m.both_teams_scored ? 1 : 0),
      homeAdvantage: teamMatches.filter(m => 
        m.home_team === team && m.home_score > m.away_score
      ).length / teamMatches.filter(m => m.home_team === team).length,
      awayDisadvantage: teamMatches.filter(m => 
        m.away_team === team && m.away_score < m.home_score
      ).length / teamMatches.filter(m => m.away_team === team).length
    };
  };

  const calculateModelAccuracy = (predictions: MatchPrediction[]) => {
    const verifiedPredictions = predictions.filter(p => p.verified);
    const correct = verifiedPredictions.filter(p => p.actualResult).length;
    setModelAccuracy({
      total: verifiedPredictions.length,
      correct: correct,
      accuracy: verifiedPredictions.length > 0 
        ? (correct / verifiedPredictions.length) * 100 
        : 0
    });
  };

  const verifyPrediction = (index: number, wasCorrect: boolean) => {
    const newPredictions = [...savedPredictions];
    newPredictions[index] = {
      ...newPredictions[index],
      actualResult: wasCorrect,
      verified: true
    };
    setSavedPredictions(newPredictions);
    localStorage.setItem('predictions', JSON.stringify(newPredictions));
    calculateModelAccuracy(newPredictions);
    
    toast({
      title: "Eredmény rögzítve",
      description: wasCorrect ? "A predikció helyes volt!" : "A predikció nem volt pontos.",
      variant: wasCorrect ? "default" : "destructive",
    });
  };

  const exportPredictions = () => {
    const data = savedPredictions.map(p => ({
      ...p,
      date: new Date(p.timestamp).toLocaleDateString(),
      status: p.verified ? (p.actualResult ? 'Helyes' : 'Helytelen') : 'Nem ellenőrzött'
    }));

    const csv = [
      ['Dátum', 'Hazai', 'Vendég', 'Valószínűség', 'Státusz'].join(','),
      ...data.map(row => [
        row.date,
        row.homeTeam,
        row.awayTeam,
        `${row.probability}%`,
        row.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'predikciok.csv';
    link.click();
  };

  const handleRunPredictions = () => {
    const predictions = selectedMatches.map(match => {
      const h2hStats = calculateH2HStats(match.home, match.away);
      const homeTrends = calculateSeasonalTrends(match.home);
      const awayTrends = calculateSeasonalTrends(match.away);

      const prediction: MatchPrediction = {
        homeTeam: match.home,
        awayTeam: match.away,
        probability: calculateMatchProbability(match.home, match.away),
        timestamp: Date.now(),
        verified: false,
        isDerby: h2hStats.totalMatches > 10,
        isSeasonEnd: new Date().getMonth() >= 4,
        h2hStats: {
          lastEncounters: h2hStats.totalMatches,
          homeWins: h2hStats.homeWins,
          awayWins: h2hStats.awayWins,
          draws: h2hStats.draws
        },
        formTrend: {
          home: homeTrends.form,
          away: awayTrends.form
        }
      };

      const newPredictions = [...savedPredictions, prediction];
      setSavedPredictions(newPredictions);
      localStorage.setItem('predictions', JSON.stringify(newPredictions));

      return prediction;
    });
    
    predictions.sort((a, b) => b.probability - a.probability);
    setPredictedMatches(predictions);

    toast({
      title: "Predikciók elkészültek",
      description: `${predictions.length} mérkőzés elemezve`,
    });
  };

  const AccuracyChart = () => {
    const data = {
      labels: savedPredictions.slice(-20).map(p => 
        `${p.homeTeam} vs ${p.awayTeam}`
      ),
      datasets: [{
        label: 'Predikciós Pontosság',
        data: savedPredictions.slice(-20).map(p => 
          p.verified ? (p.actualResult ? 100 : 0) : null
        ),
        borderColor: 'rgb(6, 182, 212)',
        tension: 0.4
      }]
    };

    return (
      <div className="h-64">
        <Line data={data} options={{
          responsive: true,
          plugins: {
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              min: 0,
              max: 100
            }
          }
        }} />
      </div>
    );
  };

  const PredictionHistory = () => {
    const recentPredictions = savedPredictions
      .slice()
      .reverse()
      .slice(0, 10);

    if (recentPredictions.length === 0) {
      return null;
    }

    return (
      <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Előző Predikciók</h2>
          <div className="flex items-center gap-4">
            <div className="text-gray-400">
              Pontosság: {modelAccuracy.accuracy.toFixed(1)}%
              ({modelAccuracy.correct}/{modelAccuracy.total})
            </div>
            <button
              onClick={exportPredictions}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Exportálás CSV-be"
            >
              <Download className="h-5 w-5 text-gray-300" />
            </button>
          </div>
        </div>

        <AccuracyChart />

        <div className="space-y-4 mt-8">
          {recentPredictions.map((pred, index) => (
            <div key={pred.timestamp} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-cyan-400">{pred.homeTeam}</span>
                <span className="text-gray-400">vs</span>
                <span className="text-pink-500">{pred.awayTeam}</span>
                <span className="text-white font-bold">{pred.probability}%</span>
                {pred.isDerby && (
                  <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                    Derby
                  </span>
                )}
                {pred.isSeasonEnd && (
                  <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded">
                    Szezonvég
                  </span>
                )}
              </div>
              {!pred.verified ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => verifyPrediction(savedPredictions.length - 1 - index, true)}
                    className="px-3 py-1 bg-green-600/30 text-green-400 rounded-lg hover:bg-green-600/50"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => verifyPrediction(savedPredictions.length - 1 - index, false)}
                    className="px-3 py-1 bg-red-600/30 text-red-400 rounded-lg hover:bg-red-600/50"
                  >
                    ✗
                  </button>
                </div>
              ) : (
                <div className={`px-3 py-1 rounded-lg ${
                  pred.actualResult 
                    ? 'bg-green-600/30 text-green-400' 
                    : 'bg-red-600/30 text-red-400'
                }`}>
                  {pred.actualResult ? 'Helyes' : 'Helytelen'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400">
          <p className="text-xl font-semibold">Error loading data</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-4 mb-4">
            <Goal className="h-12 w-12 text-cyan-400" />
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowWeights(!showWeights)}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                title="Súlyozási beállítások"
              >
                <Settings className="h-6 w-6 text-cyan-400" />
              </button>
              <button
                onClick={() => setProfessionalMode(!professionalMode)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  professionalMode 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
                title="Professzionális mód"
              >
                PRO
              </button>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4">Soccer Match Predictor</h1>
          <p className="text-xl text-gray-400">
            Advanced analysis based on {matchData.length.toLocaleString()} historical matches
            {professionalMode && " - Professional Mode"}
          </p>
        </div>

        {showWeights && (
          <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Súlyozási Beállítások</h2>
              <div className="flex items-center gap-4">
                <p className="text-gray-400">
                  Összeg: {Object.values(weights).reduce((a, b) => a + b, 0)}%
                  {professionalMode && " (50% súlyozással)"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hazai BTTS Súly ({weights.homeBTTS}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.homeBTTS}
                  onChange={(e) => setWeights(prev => ({ ...prev, homeBTTS: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vendég BTTS Súly ({weights.awayBTTS}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.awayBTTS}
                  onChange={(e) => setWeights(prev => ({ ...prev, awayBTTS: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hazai Forma Súly ({weights.homeForm}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.homeForm}
                  onChange={(e) => setWeights(prev => ({ ...prev, homeForm: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vendég Forma Súly ({weights.awayForm}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.awayForm}
                  onChange={(e) => setWeights(prev => ({ ...prev, awayForm: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hazai Gól Súly ({weights.homeGoalsScored}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.homeGoalsScored}
                  onChange={(e) => setWeights(prev => ({ ...prev, homeGoalsScored: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hazai Kapott Gól Súly ({weights.homeGoalsConceded}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.homeGoalsConceded}
                  onChange={(e) => setWeights(prev => ({ ...prev, homeGoalsConceded: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vendég Gól Súly ({weights.awayGoalsScored}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.awayGoalsScored}
                  onChange={(e) => setWeights(prev => ({ ...prev, awayGoalsScored: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vendég Kapott Gól Súly ({weights.awayGoalsConceded}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.awayGoalsConceded}
                  onChange={(e) => setWeights(prev => ({ ...prev, awayGoalsConceded: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Match Selection</h2>
              <ArrowUpRight className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Home Team</label>
                <select
                  className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition duration-200"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                >
                  <option value="">Select Home Team</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Away Team</label>
                <select
                  className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition duration-200"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                >
                  <option value="">Select Away Team</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                className="flex-1 bg-cyan-500 text-white py-3 px-6 rounded-lg hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddMatch}
                disabled={!homeTeam || !awayTeam}
              >
                <TrendingUp className="h-5 w-5" />
                Add Match
              </button>
              <button
                className="flex-1 bg-pink-500 text-white py-3 px-6 rounded-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRunPredictions}
                disabled={selectedMatches.length === 0}
              >
                <Play className="h-6 w-6 text-pink-400" />
                Run Predictions
              </button>
            </div>
          </div>
        </div>

        <PredictionHistory />
      </div>
    </div>
  );
};

export default Index;
