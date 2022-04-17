# Orion Protocol SDK

## Install

Before install SDK you need create Personal Access Token.

1. Create PAT [here](https://github.com/settings/tokens):
   1. type any name (for example `READ_PACKAGES`)
   2. select scope `read:packages`)
2. At your machine go to `~` (your home directory, **not project!**)
3. Create or modify `.npmrc` file with content:

```
//npm.pkg.github.com/:_authToken=YOUR_PAT
@orionprotocol:registry=https://npm.pkg.github.com/
```

4. Save `.npmrc` file
5. Now you can install `@orionprotocol/sdk` as dependency in your package

## Easy start

```ts
import "dotenv/config";
import { config, OrionUnit, utils } from "@orionprotocol/sdk";
import { Wallet } from "ethers";

const { chains, envs } = config;

const chain = process.env.CHAINID; // 0x38
const env = process.env.ENV; // production
const privateKey = process.env.PRIVATE_KEY; // 0x...

if (!chain) throw new Error("CHAINID is required");
if (!env) throw new Error("ENV is required");
if (!privateKey) throw new Error("PRIVATE_KEY is required");
if (!utils.isValidChainId(chain))
  throw new Error(`Chain '${chain}' is not valid.`);

if (!(env in envs))
  throw new Error(
    `Env '${env}' not found. Available environments is: ${Object.keys(
      envs
    ).join(", ")}`
  );
const envInfo = envs[env];
const envNetworks = envInfo?.networks;

if (!(chain in envNetworks)) {
  throw new Error(
    `Chain '${chain}' not found. Available chains in selected environment (${env}) is: ${Object.keys(
      envNetworks
    ).join(", ")}`
  );
}

const envNetworkInfo = envNetworks[chain];
const chainInfo = chains[chain];

if (!envNetworkInfo) throw new Error("Env network info is required");
if (!chainInfo) throw new Error("Chain info is required");

const wallet = new Wallet(privateKey);

// Orion Unit is chain-in-environment abstraction
const orionUnit = new OrionUnit(
  chainInfo.chainId,
  envNetworkInfo.rpc ?? chainInfo.rpc,
  env,
  envNetworkInfo.api
);
```

## Using contracts

```ts
import { contracts } from "@orionprotocol/sdk";

const exchangeContract = contracts.Exchange__factory.connect(
  exchangeContractAddress,
  orionUnit.provider
);
const erc20Contract = contracts.ERC20__factory.connect(
  tokenAddress,
  orionUnit.provider
);
const governanceContract = contracts.OrionGovernance__factory.connect(
  governanceAddress,
  orionUnit.provider
);
const orionVoting = contracts.OrionVoting__factory.connect(
  votingContractAddress,
  orionUnit.provider
);
```
