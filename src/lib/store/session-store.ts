import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Session, SessionStatus } from '@/types';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  upcomingSessions: Session[];
  isLoading: boolean;
  error: string | null;
}

interface SessionActions {
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (session: Session | null) => void;
  setUpcomingSessions: (sessions: Session[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSessions: () => void;
  getSessionById: (sessionId: string) => Session | undefined;
  getSessionsByStatus: (status: SessionStatus) => Session[];
  getSessionsByUser: (userId: string, role: 'coach' | 'client') => Session[];
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      // State
      sessions: [],
      currentSession: null,
      upcomingSessions: [],
      isLoading: false,
      error: null,

      // Actions
      setSessions: (sessions) => set({ sessions, error: null }),

      addSession: (session) => {
        const sessions = get().sessions;
        set({ sessions: [...sessions, session] });
      },

      updateSession: (sessionId, updates) => {
        const sessions = get().sessions;
        const updatedSessions = sessions.map((session) =>
          session.id === sessionId ? { ...session, ...updates } : session
        );
        set({ sessions: updatedSessions });

        // Update current session if it's the one being updated
        const currentSession = get().currentSession;
        if (currentSession?.id === sessionId) {
          set({ currentSession: { ...currentSession, ...updates } });
        }
      },

      removeSession: (sessionId) => {
        const sessions = get().sessions;
        const filteredSessions = sessions.filter((session) => session.id !== sessionId);
        set({ sessions: filteredSessions });

        // Clear current session if it's the one being removed
        const currentSession = get().currentSession;
        if (currentSession?.id === sessionId) {
          set({ currentSession: null });
        }
      },

      setCurrentSession: (currentSession) => set({ currentSession }),

      setUpcomingSessions: (upcomingSessions) => set({ upcomingSessions }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      clearSessions: () => set({
        sessions: [],
        currentSession: null,
        upcomingSessions: [],
        error: null,
        isLoading: false,
      }),

      // Selectors
      getSessionById: (sessionId) => {
        const sessions = get().sessions;
        return sessions.find((session) => session.id === sessionId);
      },

      getSessionsByStatus: (status) => {
        const sessions = get().sessions;
        return sessions.filter((session) => session.status === status);
      },

      getSessionsByUser: (userId, role) => {
        const sessions = get().sessions;
        return sessions.filter((session) =>
          role === 'coach' ? session.coachId === userId : session.clientId === userId
        );
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        sessions: state.sessions,
        upcomingSessions: state.upcomingSessions,
      }), // Only persist session data
    }
  )
);

// Selectors for better performance
export const useSessions = () => useSessionStore((state) => state.sessions);
export const useCurrentSession = () => useSessionStore((state) => state.currentSession);
export const useUpcomingSessions = () => useSessionStore((state) => state.upcomingSessions);
export const useSessionLoading = () => useSessionStore((state) => state.isLoading);
export const useSessionError = () => useSessionStore((state) => state.error);