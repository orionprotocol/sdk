import OrionUnit from './OrionUnit';
import { isValidChainId } from './utils';
import { chains, envs } from './config';
import { SupportedChainId } from './types';

export default function initOrionUnit(chain: string, env: string) {
  if (!(env in envs)) {
    throw new Error(`Env '${env}' not found. Available environments is: ${Object.keys(envs).join(', ')}`);
  }

  const envInfo = envs[env];
  const envNetworks = envInfo?.networks;
  let chainId: SupportedChainId;

  if (isValidChainId(chain)) chainId = chain;
  else {
    const targetChains = Object
      .keys(chains)
      .filter(isValidChainId)
      .filter((ch) => {
        const chainInfo = chains[ch];
        if (!chainInfo) return false;
        return (chainInfo.chainId in envNetworks)
          && (chainInfo.code.toLowerCase() === chain.toLowerCase());
      });
    if (targetChains.length !== 1) {
      throw new Error(
        targetChains.length > 1
          ? 'Ambiguation detected. '
            + `Found ${targetChains.length} chain ids [${targetChains.join(', ')}] for chain name '${chain}' in env '${env}'. Expected 1.`
          : `Chains not found for chain name '${chain}' in env '${env}'.`,
      );
    }
    [chainId] = targetChains;
  }

  if (!(chainId in envNetworks)) {
    throw new Error(`Chain '${chainId}' not found. `
          + `Available chains in selected environment (${env}) is: ${Object.keys(envNetworks).join(', ')}`);
  }

  const envNetworkInfo = envNetworks[chainId];
  const chainInfo = chains[chainId];

  if (!envNetworkInfo) throw new Error('Env network info is required');
  if (!chainInfo) throw new Error('Chain info is required');

  return new OrionUnit(
    chainId,
    envNetworkInfo.rpc ?? chainInfo.rpc,
    env,
    envNetworkInfo.api,
  );
}
