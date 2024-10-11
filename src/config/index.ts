import jsonChains from './chains.json' assert { type: 'json' };
import jsonEnvs from './envs.json' assert { type: 'json' };
import { pureEnvSchema, pureChainInfoSchema } from './schemas';

const chains = pureChainInfoSchema.parse(jsonChains);
const envs = pureEnvSchema.parse(jsonEnvs);

export {
  chains,
  envs,
};

export * as schemas from './schemas/index.js';
