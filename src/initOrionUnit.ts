import { config, OrionUnit } from '.';
import { isValidChainId } from './utils';

const { chains, envs } = config;

export default function initOrionUnit(chain: string, env: string) {
  if (!isValidChainId(chain)) throw new Error(`Chain '${chain}' is not valid.`);

  if (!(env in envs)) throw new Error(`Env '${env}' not found. Available environments is: ${Object.keys(envs).join(', ')}`);
  const envInfo = envs[env];
  const envNetworks = envInfo?.networks;

  if (!(chain in envNetworks)) {
    throw new Error(`Chain '${chain}' not found. `
          + `Available chains in selected environment (${env}) is: ${Object.keys(envNetworks).join(', ')}`);
  }

  const envNetworkInfo = envNetworks[chain];
  const chainInfo = chains[chain];

  if (!envNetworkInfo) throw new Error('Env network info is required');
  if (!chainInfo) throw new Error('Chain info is required');

  return new OrionUnit(
    chainInfo.chainId,
    envNetworkInfo.rpc ?? chainInfo.rpc,
    env,
    envNetworkInfo.api,
  );
}
