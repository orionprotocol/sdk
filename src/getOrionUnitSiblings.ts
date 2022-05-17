import { SupportedChainId } from './types';
import { isValidChainId } from './utils';
import { envs } from './config';
import OrionUnit from './OrionUnit';

export default function getOrionUnitSiblings(siblingChain: SupportedChainId, env: string) {
  if (!(env in envs)) throw new Error(`Env '${env}' not found. Available environments is: ${Object.keys(envs).join(', ')}`);
  const envInfo = envs[env];
  const envNetworks = envInfo?.networks;

  if (!(siblingChain in envNetworks)) {
    throw new Error(`Chain '${siblingChain}' not found. `
          + `Available chains in selected environment (${env}) is: ${Object.keys(envNetworks).join(', ')}`);
  }
  const siblingsNetworks = Object
    .keys(envNetworks)
    .filter(isValidChainId)
    .filter((chainId) => chainId !== siblingChain);
  return siblingsNetworks.map((chainId) => new OrionUnit(chainId, env));
}
