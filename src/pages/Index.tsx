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
import { TrendingUp, Users, Goal, Loader2, ArrowUpRight, Play, Settings } from 'lucide-react';

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
}

interface MatchPrediction {
  homeTeam: string;
  awayTeam: string;
  probability: number;
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
      // Első 50% - jelenlegi súlyozási rendszer felére csökkentve
      const currentSystemProb = 
        (homeStats.bothTeamsScoredPercentage * (weights.homeBTTS / 200)) +
        (awayStats.bothTeamsScoredPercentage * (weights.awayBTTS / 200)) +
        (homeStats.formPercentage * (weights.homeForm / 200)) +
        (awayStats.formPercentage * (weights.awayForm / 200)) +
        (((homeStats.homeGoalsScored / homeStats.homeMatches) * 100) * (weights.homeGoalsScored / 200)) +
        (((homeStats.homeGoalsConceded / homeStats.homeMatches) * 100) * (weights.homeGoalsConceded / 200)) +
        (((awayStats.awayGoalsScored / awayStats.awayMatches) * 100) * (weights.awayGoalsScored / 200)) +
        (((awayStats.awayGoalsConceded / awayStats.awayMatches) * 100) * (weights.awayGoalsConceded / 200));

      // Második 50% - PHP alapú komplex számítási rendszer
      const complexSystemProb = calculateComplexProbability(homeStats, awayStats);
      
      probability = currentSystemProb + complexSystemProb;
    } else {
      // Eredeti számítási mód
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
    // Az eredeti PHP kódból átvett komplex számítási logika
    const expectedGoalsWeight = 15; // 15%
    const formIndexWeight = 15;    // 15%
    const h2hStatsWeight = 20;     // 20%

    // Várható gólok alapján
    const homeExpectedGoals = homeStats.averageGoalsScored || 0;
    const awayExpectedGoals = awayStats.averageGoalsScored || 0;
    const expectedGoalsProb = 
      ((homeExpectedGoals + awayExpectedGoals) / 4) * expectedGoalsWeight;

    // Forma index alapján
    const homeForm = homeStats.formPercentage || 0;
    const awayForm = awayStats.formPercentage || 0;
    const formProb = ((homeForm + awayForm) / 200) * formIndexWeight;

    // Head-to-head statisztikák alapján
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

  const handleRunPredictions = () => {
    const predictions = selectedMatches.map(match => ({
      homeTeam: match.home,
      awayTeam: match.away,
      probability: calculateMatchProbability(match.home, match.away)
    }));
    
    predictions.sort((a, b) => b.probability - a.probability);
    setPredictedMatches(predictions);
  };

  const getHomeTeamData = () => {
    if (!homeTeam) return Array(7).fill(0);
    return [
      Math.round(teamStats[homeTeam]?.bothTeamsScoredPercentage || 0),
      Math.round((teamStats[homeTeam]?.averageGoalsScored || 0) * 20),
      Math.round((teamStats[homeTeam]?.averageGoalsConceded || 0) * 20),
      Math.round(teamStats[homeTeam]?.formPercentage || 0),
      Math.round(teamStats[homeTeam]?.homeGoalsScored || 0),
      Math.round(teamStats[homeTeam]?.awayGoalsScored || 0),
      Math.round(teamStats[homeTeam]?.totalMatches || 0)
    ];
  };

  const getAwayTeamData = () => {
    if (!awayTeam) return Array(7).fill(0);
    return [
      Math.round(teamStats[awayTeam]?.bothTeamsScoredPercentage || 0),
      Math.round((teamStats[awayTeam]?.averageGoalsScored || 0) * 20),
      Math.round((teamStats[awayTeam]?.averageGoalsConceded || 0) * 20),
      Math.round(teamStats[awayTeam]?.formPercentage || 0),
      Math.round(teamStats[awayTeam]?.homeGoalsScored || 0),
      Math.round(teamStats[awayTeam]?.awayGoalsScored || 0),
      Math.round(teamStats[awayTeam]?.totalMatches || 0)
    ];
  };

  const chartData = {
    labels: ['BTTS %', 'Avg Goals', 'Avg Conceded', 'Form %', 'Home Goals', 'Away Goals', 'Total Matches'],
    datasets: [
      {
        label: homeTeam || 'Home Team',
        data: getHomeTeamData(),
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
          return gradient;
        },
        borderColor: 'rgb(6, 182, 212)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: awayTeam || 'Away Team',
        data: getAwayTeamData(),
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(236, 72, 153, 0.5)');
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.0)');
          return gradient;
        },
        borderColor: 'rgb(236, 72, 153)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 12
          },
          padding: 10
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 12
          },
          padding: 10
        },
        border: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'system-ui',
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6
      }
    }
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
                <Play className="h-5 w-5" />
                Run Predictions
              </button>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Selected Matches ({selectedMatches.length}/8)</h3>
              <div className="space-y-3">
                {selectedMatches.map((match, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
                    <span className="text-cyan-400 font-medium">{match.home}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="text-pink-500 font-medium">{match.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {predictedMatches.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">BTTS Predictions</h2>
                <Users className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="space-y-4">
                {predictedMatches.map((match, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">#{index + 1}</span>
                        <span className="text-cyan-400 font-medium">{match.homeTeam}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="text-pink-500 font-medium">{match.awayTeam}</span>
                      </div>
                      <span className="text-white font-bold">{match.probability}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-700/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${match.probability}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(homeTeam || awayTeam) && (
          <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Performance Analysis</h2>
              <TrendingUp className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="h-96">
              <Line 
                data={chartData} 
                options={chartOptions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
