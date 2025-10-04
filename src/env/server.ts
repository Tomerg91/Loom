import 'server-only';

import { env, type ServerEnv } from './base';

export const serverEnv: ServerEnv = env.server;
