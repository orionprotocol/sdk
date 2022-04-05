import jsonChains from './chains.json';
import jsonEnvs from './envs.json';
import { pureChainSchema, pureEnvSchema } from './schemas';

const chains = pureChainSchema.parse(jsonChains);
const envs = pureEnvSchema.parse(jsonEnvs);

export {
  chains,
  envs,
};

export * as schemas from './schemas';
