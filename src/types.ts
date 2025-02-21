
export interface TeamRanking {
  team: string;
  matches: number;
  bttsRate: number;
  form: number[];
  avgGoalsScored: number;
  avgGoalsConceded: number;
  totalBTTS: number;
  score: number;
}

export interface MatchData {
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  both_teams_scored: boolean;
}
