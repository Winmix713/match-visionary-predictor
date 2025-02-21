
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MatchData } from "../types";

const H2H = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [h2hStats, setH2hStats] = useState<any>(null);
  const navigate = useNavigate();

  const calculateH2H = () => {
    // Itt majd implementáljuk a H2H számításokat
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">H2H Összehasonlítás</h1>
        
        <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Első Csapat
              </label>
              <select
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
              >
                <option value="">Válassz csapatot...</option>
                {/* Itt majd felsoroljuk a csapatokat */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Második Csapat
              </label>
              <select
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
              >
                <option value="">Válassz csapatot...</option>
                {/* Itt majd felsoroljuk a csapatokat */}
              </select>
            </div>
          </div>
          
          <button
            onClick={calculateH2H}
            className="w-full mt-8 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors"
          >
            Összehasonlítás
          </button>
        </div>

        {h2hStats && (
          <div className="bg-gray-800/50 rounded-xl shadow-xl p-8 backdrop-blur-lg border border-gray-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Eredmények</h2>
            {/* Itt jelenítjük majd meg a H2H statisztikákat */}
          </div>
        )}
      </div>
    </div>
  );
};

export default H2H;
