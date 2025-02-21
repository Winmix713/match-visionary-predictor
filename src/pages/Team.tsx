
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TeamRanking, MatchData } from "../types";

const Team = () => {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [teamStats, setTeamStats] = useState<TeamRanking | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchData[]>([]);

  useEffect(() => {
    // Itt majd betöltjük a csapat statisztikáit és a legutóbbi mérkőzéseit
  }, [teamName]);

  if (!teamStats) {
    return <div className="text-white text-center py-12">Betöltés...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">{teamName}</h1>
          <button
            onClick={() => navigate('/h2h')}
            className="px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors"
          >
            H2H Összehasonlítás
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Csapat Statisztikák</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">BTTS Arány:</span>
                <span className="text-cyan-400">{teamStats.bttsRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Átlag Lőtt Gól:</span>
                <span className="text-cyan-400">{teamStats.avgGoalsScored.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Átlag Kapott Gól:</span>
                <span className="text-cyan-400">{teamStats.avgGoalsConceded.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Forma:</span>
                <div className="flex gap-1">
                  {teamStats.form.map((result, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        result ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Legutóbbi Mérkőzések</h2>
            <div className="space-y-4">
              {recentMatches.map((match, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span className="text-white">{match.home_team}</span>
                  <span className="text-cyan-400">
                    {match.home_score} - {match.away_score}
                  </span>
                  <span className="text-white">{match.away_team}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;
