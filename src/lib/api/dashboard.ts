export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  language?: string;
}

export interface DashboardSummary {
  actions: Array<{ id: string; title: string; count: number }>;
  stats: { active_clients: number; upcoming_sessions: number };
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await fetch('/api/user/profile', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch('/api/dashboard/summary', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch dashboard summary: ${response.statusText}`
    );
  }

  return response.json();
}
