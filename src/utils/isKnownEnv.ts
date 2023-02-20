import { knownEnvs } from '../config/schemas';
import type { KnownEnv, } from '../types';

const isKnownEnv = (env: string): env is KnownEnv => {
  return knownEnvs.some((knownEnv) => knownEnv === env);
}

export default isKnownEnv;
