export interface ClientCache<TClient> {
  get(): TClient | null;
  set(client: TClient): void;
  clear(): void;
}

const globalRef = globalThis as unknown as {
  __loomSupabaseClient?: unknown;
};

let cachedClient: unknown = globalRef.__loomSupabaseClient ?? null;

export function createClientCache<TClient>(): ClientCache<TClient> {
  return {
    get() {
      return (cachedClient as TClient | null) ?? null;
    },
    set(client: TClient) {
      cachedClient = client;
      if (process.env.NODE_ENV !== 'production') {
        globalRef.__loomSupabaseClient = client;
      }
    },
    clear() {
      cachedClient = null;
      if (process.env.NODE_ENV !== 'production') {
        delete globalRef.__loomSupabaseClient;
      }
    },
  } satisfies ClientCache<TClient>;
}
