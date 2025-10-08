import { env, type ServerEnv } from './base';

if (typeof window !== 'undefined') {
  throw new Error('serverEnv can only be used in a server-side context');
}

export const serverEnv: ServerEnv = env.server;
