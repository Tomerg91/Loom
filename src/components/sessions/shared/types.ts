export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'coach' | 'client';
}

export interface SessionFormData {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  sessionType: 'video' | 'phone' | 'in-person';
  location: string;
  meetingUrl: string;
  notes: string;
  goals: string[];
  coachId: string;
  clientId: string;
}

export interface Session {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  sessionType: 'video' | 'phone' | 'in-person';
  location?: string;
  meetingUrl?: string;
  notes?: string;
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
  };
  rating?: number;
  feedback?: string;
  actionItems?: string[];
  goals?: string[];
  createdAt: string;
  updatedAt: string;
}

export type SessionFormField = keyof SessionFormData;