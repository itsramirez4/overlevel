export interface AuthResponse {
  user: import('./index').User;
  access_token: string;
  refresh_token: string;
}

export interface AnalyticsSummary {
  workouts_this_month: number;
  total_volume: number;
  recommended_routine: import('./index').Routine | null;
}
