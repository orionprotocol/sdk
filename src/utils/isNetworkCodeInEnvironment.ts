import { chains, envs } from '../config';

export default function isNetworkCodeInEnvironment(networkCode: string, env: string) {
  if (!(env in envs)) {
    throw new Error(`Env ${env} is not supported. Available environments is: ${Object.keys(envs).join(', ')}`);
  }
  const envInfo = envs[env];
  const envNetworks = envInfo?.networks;
  return Object.values(chains)
    .some((chain) => chain.code.toLowerCase() === networkCode.toLowerCase()
        && chain.chainId in envNetworks);
}
