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

# Usage

## High level methods

### Easy start

```ts
import "dotenv/config";
import { initOrionUnit } from "@orionprotocol/sdk";
import { Wallet } from "ethers";

const chain = process.env.CHAINID; // 0x56
const env = process.env.ENV; // production
const privateKey = process.env.PRIVATE_KEY; // 0x...

if (!chain) throw new Error("CHAINID is required");
if (!env) throw new Error("ENV is required");
if (!privateKey) throw new Error("PRIVATE_KEY is required");

const wallet = new Wallet(privateKey);
// OrionUnit is chain-in-environment abstraction
const orionUnit = initOrionUnit(chain, env);
```

## Low level methods

### Using contracts

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

### Get tradable pairs

```ts
const pairsList = await orionUnit.orionAggregator.getPairsList();
```

### Get swap info

```ts
const swapInfo = await orionUnit.orionAggregator.getSwapInfo(
  // Use 'exactSpend' when 'amount' is how much you want spend. Use 'exactReceive' otherwise
  type: 'exactSpend',
  assetIn: 'ORN',
  assetOut: 'USDT',
  amount: 6.23453457,
);
```

### Place order in Orion Aggregator

```ts

const { orderId } = await orionUnit.orionAggregator.placeOrder(
  {
    senderAddress: '0x61eed69c0d112c690fd6f44bb621357b89fbe67f',
    matcherAddress: '0xfbcad2c3a90fbd94c335fbdf8e22573456da7f68',
    baseAsset: '0xf223eca06261145b3287a0fefd8cfad371c7eb34',
    quoteAsset: '0xcb2951e90d8dcf16e1fa84ac0c83f48906d6a744',
    matcherFeeAsset: '0xf223eca06261145b3287a0fefd8cfad371c7eb34',
    amount: 500000000
    price: 334600000,
    matcherFee: '29296395', // Orion Fee + Network Fee
    nonce: 1650345051276
    expiration: 1652850651276
    buySide: 0,
    isPersonalSign: false, // https://docs.metamask.io/guide/signing-data.html#a-brief-history
  },
  false // Place in internal orderbook
)
```
