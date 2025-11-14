import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  UserPreferences,
  NotificationPreferences,
  UserSettings,
  SettingsAuditLog
} from '@/types';

interface SettingsState {
  // Preferences
  preferences: UserPreferences | null;
  notifications: NotificationPreferences | null;

  // Complete settings (cached)
  settings: UserSettings | null;

  // Audit history
  auditLogs: SettingsAuditLog[];
  auditPagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  } | null;

  // Loading states
  isLoadingPreferences: boolean;
  isLoadingNotifications: boolean;
  isLoadingSettings: boolean;
  isLoadingAudit: boolean;
  isSaving: boolean;

  // Error states
  error: string | null;
  auditError: string | null;
}

interface SettingsActions {
  // Preferences actions
  setPreferences: (preferences: UserPreferences) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  clearPreferences: () => void;

  // Notification preferences actions
  setNotifications: (notifications: NotificationPreferences) => void;
  updateNotifications: (updates: Partial<NotificationPreferences>) => void;
  clearNotifications: () => void;

  // Combined settings actions
  setSettings: (settings: UserSettings) => void;
  clearSettings: () => void;

  // Audit actions
  setAuditLogs: (logs: SettingsAuditLog[]) => void;
  appendAuditLogs: (logs: SettingsAuditLog[]) => void;
  setAuditPagination: (pagination: SettingsState['auditPagination']) => void;
  clearAuditLogs: () => void;

  // Loading state actions
  setLoadingPreferences: (loading: boolean) => void;
  setLoadingNotifications: (loading: boolean) => void;
  setLoadingSettings: (loading: boolean) => void;
  setLoadingAudit: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;

  // Error actions
  setError: (error: string | null) => void;
  setAuditError: (error: string | null) => void;
  clearErrors: () => void;

  // Reset all
  reset: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
  preferences: null,
  notifications: null,
  settings: null,
  auditLogs: [],
  auditPagination: null,
  isLoadingPreferences: false,
  isLoadingNotifications: false,
  isLoadingSettings: false,
  isLoadingAudit: false,
  isSaving: false,
  error: null,
  auditError: null,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      ...initialState,

      // Preferences actions
      setPreferences: (preferences) =>
        set((state) => {
          state.preferences = preferences;
          state.error = null;
        }),

      updatePreferences: (updates) =>
        set((state) => {
          if (state.preferences) {
            state.preferences = { ...state.preferences, ...updates };
          }
        }),

      clearPreferences: () =>
        set((state) => {
          state.preferences = null;
        }),

      // Notification preferences actions
      setNotifications: (notifications) =>
        set((state) => {
          state.notifications = notifications;
          state.error = null;
        }),

      updateNotifications: (updates) =>
        set((state) => {
          if (state.notifications) {
            state.notifications = { ...state.notifications, ...updates };
          }
        }),

      clearNotifications: () =>
        set((state) => {
          state.notifications = null;
        }),

      // Combined settings actions
      setSettings: (settings) =>
        set((state) => {
          state.settings = settings;
          state.preferences = settings.preferences;
          state.notifications = settings.notifications;
          state.error = null;
        }),

      clearSettings: () =>
        set((state) => {
          state.settings = null;
          state.preferences = null;
          state.notifications = null;
        }),

      // Audit actions
      setAuditLogs: (logs) =>
        set((state) => {
          state.auditLogs = logs;
          state.auditError = null;
        }),

      appendAuditLogs: (logs) =>
        set((state) => {
          state.auditLogs = [...state.auditLogs, ...logs];
        }),

      setAuditPagination: (pagination) =>
        set((state) => {
          state.auditPagination = pagination;
        }),

      clearAuditLogs: () =>
        set((state) => {
          state.auditLogs = [];
          state.auditPagination = null;
        }),

      // Loading state actions
      setLoadingPreferences: (isLoadingPreferences) =>
        set((state) => {
          state.isLoadingPreferences = isLoadingPreferences;
        }),

      setLoadingNotifications: (isLoadingNotifications) =>
        set((state) => {
          state.isLoadingNotifications = isLoadingNotifications;
        }),

      setLoadingSettings: (isLoadingSettings) =>
        set((state) => {
          state.isLoadingSettings = isLoadingSettings;
        }),

      setLoadingAudit: (isLoadingAudit) =>
        set((state) => {
          state.isLoadingAudit = isLoadingAudit;
        }),

      setSaving: (isSaving) =>
        set((state) => {
          state.isSaving = isSaving;
        }),

      // Error actions
      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      setAuditError: (auditError) =>
        set((state) => {
          state.auditError = auditError;
        }),

      clearErrors: () =>
        set((state) => {
          state.error = null;
          state.auditError = null;
        }),

      // Reset all
      reset: () => set(initialState),
    })),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist preferences and notifications for offline access
        preferences: state.preferences,
        notifications: state.notifications,
      }),
    }
  )
);

// Selectors for better performance and convenience
export const usePreferences = () => useSettingsStore((state) => state.preferences);
export const useNotificationPreferences = () => useSettingsStore((state) => state.notifications);
export const useUserSettings = () => useSettingsStore((state) => state.settings);
export const useAuditLogs = () => useSettingsStore((state) => state.auditLogs);
export const useSettingsLoading = () => useSettingsStore((state) => ({
  preferences: state.isLoadingPreferences,
  notifications: state.isLoadingNotifications,
  settings: state.isLoadingSettings,
  audit: state.isLoadingAudit,
  saving: state.isSaving,
}));
export const useSettingsError = () => useSettingsStore((state) => state.error);
export const useAuditError = () => useSettingsStore((state) => state.auditError);

// Computed selectors
export const useTheme = () => useSettingsStore((state) => state.preferences?.theme || 'system');
export const useLanguage = () => useSettingsStore((state) => state.preferences?.language || 'en');
export const useTimezone = () => useSettingsStore((state) => state.preferences?.timezone || 'UTC');
export const useDateFormat = () => useSettingsStore((state) => state.preferences?.dateFormat || 'MM/DD/YYYY');
export const useTimeFormat = () => useSettingsStore((state) => state.preferences?.timeFormat || '12h');
