import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TeamRanking, MatchData } from "../types";

const Rankings = () => {
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Itt majd bekérjük a mérkőzés adatokat és kiszámoljuk a ranglistát
    calculateTeamRankings();
  }, []);

  const calculateTeamRankings = () => {
    const matches: MatchData[] = [
      {
        home_team: "Real Madrid",
        away_team: "Barcelona",
        home_score: 2,
        away_score: 1,
        both_teams_scored: true,
      },
      {
        home_team: "Liverpool",
        away_team: "Manchester United",
        home_score: 3,
        away_score: 2,
        both_teams_scored: true,
      },
      {
        home_team: "Bayern Munich",
        away_team: "Dortmund",
        home_score: 1,
        away_score: 1,
        both_teams_scored: true,
      },
      {
        home_team: "Juventus",
        away_team: "Milan",
        home_score: 2,
        away_score: 0,
        both_teams_scored: false,
      },
      {
        home_team: "PSG",
        away_team: "Marseille",
        home_score: 4,
        away_score: 2,
        both_teams_scored: true,
      },
      {
        home_team: "Arsenal",
        away_team: "Tottenham",
        home_score: 1,
        away_score: 0,
        both_teams_scored: false,
      },
      {
        home_team: "Chelsea",
        away_team: "Manchester City",
        home_score: 1,
        away_score: 1,
        both_teams_scored: true,
      },
      {
        home_team: "Atletico Madrid",
        away_team: "Sevilla",
        home_score: 2,
        away_score: 1,
        both_teams_scored: true,
      },
      {
        home_team: "Inter",
        away_team: "Napoli",
        home_score: 1,
        away_score: 1,
        both_teams_scored: true,
      },
      {
        home_team: "Lyon",
        away_team: "Monaco",
        home_score: 3,
        away_score: 2,
        both_teams_scored: true,
      },
    ];

    const teamStats: { [team: string]: { scored: number; conceded: number; matches: number; btts: number; form: boolean[] } } = {};

    matches.forEach((match) => {
      const { home_team, away_team, home_score, away_score, both_teams_scored } = match;

      if (!teamStats[home_team]) {
        teamStats[home_team] = { scored: 0, conceded: 0, matches: 0, btts: 0, form: [] };
      }
      if (!teamStats[away_team]) {
        teamStats[away_team] = { scored: 0, conceded: 0, matches: 0, btts: 0, form: [] };
      }

      teamStats[home_team].scored += home_score;
      teamStats[home_team].conceded += away_score;
      teamStats[home_team].matches++;
      teamStats[away_team].scored += away_score;
      teamStats[away_team].conceded += home_score;
      teamStats[away_team].matches++;

      if (both_teams_scored) {
        teamStats[home_team].btts++;
        teamStats[away_team].btts++;
      }

      teamStats[home_team].form.push(home_score > away_score);
      teamStats[away_team].form.push(away_score > home_score);
    });

    const calculatedRankings: TeamRanking[] = Object.entries(teamStats).map(([team, stats]) => {
      const bttsRate = (stats.btts / stats.matches) * 100;
      const avgGoalsScored = stats.scored / stats.matches;
      const avgGoalsConceded = stats.conceded / stats.matches;
      const form = stats.form.slice(-10);
      const score = (avgGoalsScored * 2 + (100 - bttsRate) / 10) - avgGoalsConceded;

      return {
        team,
        matches: stats.matches,
        bttsRate,
        form,
        avgGoalsScored,
        avgGoalsConceded,
        totalBTTS: stats.btts,
        score,
      };
    });

    calculatedRankings.sort((a, b) => b.score - a.score);
    setTeamRankings(calculatedRankings);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Csapat Rangsor</h1>
        <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3">Helyezés</th>
                  <th className="px-4 py-3">Csapat</th>
                  <th className="px-4 py-3">Mérkőzések</th>
                  <th className="px-4 py-3">BTTS %</th>
                  <th className="px-4 py-3">Átlag Gól</th>
                  <th className="px-4 py-3">Átlag Kapott</th>
                  <th className="px-4 py-3">Forma (10)</th>
                  <th className="px-4 py-3">Pontszám</th>
                </tr>
              </thead>
              <tbody>
                {teamRankings.map((team, index) => (
                  <tr 
                    key={team.team} 
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 cursor-pointer"
                    onClick={() => navigate(`/team/${team.team}`)}
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-cyan-400">{team.team}</td>
                    <td className="px-4 py-3">{team.matches}</td>
                    <td className="px-4 py-3">{team.bttsRate.toFixed(1)}%</td>
                    <td className="px-4 py-3">{team.avgGoalsScored.toFixed(2)}</td>
                    <td className="px-4 py-3">{team.avgGoalsConceded.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {team.form.map((result, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              result ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-pink-500">
                      {team.score.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
