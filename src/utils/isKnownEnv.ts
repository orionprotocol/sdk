import { knownEnvs } from '../config/schemas/index.js';
import type { KnownEnv, } from '../types.js';

const isKnownEnv = (env: string): env is KnownEnv => {
  return knownEnvs.some((knownEnv) => knownEnv === env);
}

export default isKnownEnv;
