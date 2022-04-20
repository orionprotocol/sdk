import jsonChains from './chains.json';
import jsonEnvs from './envs.json';
import { pureEnvSchema, pureChainInfoSchema } from './schemas';

const chains = pureChainInfoSchema.parse(jsonChains);
const envs = pureEnvSchema.parse(jsonEnvs);

export {
  chains,
  envs,
};

export * as schemas from './schemas';
