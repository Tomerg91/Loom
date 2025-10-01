export interface PracticeJournalEntryRow {
  id: string;
  client_id: string;
  content: string;
  title: string | null;
  sensations: string[] | null;
  emotions: string[] | null;
  body_areas: string[] | null;
  insights: string | null;
  practices_done: string[] | null;
  mood_rating: number | null;
  energy_level: number | null;
  shared_with_coach: boolean;
  shared_at: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeJournalEntry {
  id: string;
  clientId: string;
  content: string;
  title?: string;
  sensations?: string[];
  emotions?: string[];
  bodyAreas?: string[];
  insights?: string;
  practicesDone?: string[];
  moodRating?: number;
  energyLevel?: number;
  sharedWithCoach: boolean;
  sharedAt?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export function mapPracticeJournalEntry(
  row: PracticeJournalEntryRow
): PracticeJournalEntry {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    title: row.title ?? undefined,
    sensations: row.sensations ?? undefined,
    emotions: row.emotions ?? undefined,
    bodyAreas: row.body_areas ?? undefined,
    insights: row.insights ?? undefined,
    practicesDone: row.practices_done ?? undefined,
    moodRating: row.mood_rating ?? undefined,
    energyLevel: row.energy_level ?? undefined,
    sharedWithCoach: row.shared_with_coach,
    sharedAt: row.shared_at ?? undefined,
    sessionId: row.session_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPracticeJournalEntries(
  rows: PracticeJournalEntryRow[] | null
): PracticeJournalEntry[] {
  if (!rows) {
    return [];
  }

  return rows.map((row) => mapPracticeJournalEntry(row));
}
