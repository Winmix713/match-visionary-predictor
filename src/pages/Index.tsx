
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
import { TrendingUp, Users, Goal, Loader2, ArrowUpRight, Play } from 'lucide-react';

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

    return Math.min(Math.round(
      (homeStats.bothTeamsScoredPercentage * 0.3) +
      (awayStats.bothTeamsScoredPercentage * 0.3) +
      (homeStats.formPercentage * 0.1) +
      (awayStats.formPercentage * 0.1) +
      (((homeStats.homeGoalsScored / homeStats.homeMatches) * 10) * 0.1) +
      (((awayStats.awayGoalsScored / awayStats.awayMatches) * 10) * 0.1)
    ), 100);
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
      <div className="min-h-screen flex items

If there's knowledge, context or custom instructions you want to include in every edit in this project, set it below.

<lov-actions>
<lov-knowledge>
</lov-actions>

If your project requires backend functionality, such as persistent storage for match data and user settings, you can use the Supabase menu on the top right to connect your project to Supabase.
<lov-actions>
<lov-message-prompt message="Tell me more about Supabase">Learn more about Supabase</lov-message-prompt>
</lov-actions>
