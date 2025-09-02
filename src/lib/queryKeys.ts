// Centralized React Query key factories for stable and typed keys
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  files: {
    list: (folderId?: string) => ['files', 'list', { folderId }] as const,
    detail: (id: string) => ['files', 'detail', id] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
  },
  sessions: {
    list: ['sessions', 'list'] as const,
    detail: (id: string) => ['sessions', 'detail', id] as const,
  },
  users: {
    detail: (id: string) => ['users', 'detail', id] as const,
  },
} as const;

export type QueryKey = ReturnType<
  | typeof queryKeys.files.list
  | typeof queryKeys.files.detail
  | typeof queryKeys.sessions.detail
  | typeof queryKeys.users.detail
> | typeof queryKeys.auth.me | typeof queryKeys.notifications.list | typeof queryKeys.sessions.list;

