# UI

Let's consider integration of Orion Protocol with your UI.

## 1. Initialization

Orion Protocol's SDK operate with OrionUnit — chain-in-environment abstraction. "Ethereum-in-production", "bsc-in-production", "fantom-in-testing", etc.

```ts
import { OrionUnit } from "@orionprotocol/sdk";
const orionUnit = new OrionUnit("bsc", "production"); // eth, bsc, ftm available
```

## 2. Signer accessing

When your UI connected to wallet (through Metamask or Wallet Connect foe example), you should get access to signer.
Signer is API's entity that allows to sign transactions.

Currently for SDK required Ethers.js using. Possibly in future we will add common signer interface.

For example, you can access signer through Metamask:

```ts
import detectEthereumProvider from "@metamask/detect-provider";
import { BaseProvider } from "@metamask/providers";
import { ethers } from "ethers";

const startApp = async (provider: BaseProvider) => {
  const web3Provider = new ethers.providers.Web3Provider(provider);
  await web3Provider.ready;
  const signer = web3Provider.getSigner(); // ready to go
};

detectEthereumProvider().then((provider) => {
  if (provider) {
    startApp(provider as BaseProvider);
  } else {
    console.log("Please install MetaMask!");
  }
});
```

## 3. Getting a list of trading pairs

```ts
import { simpleFetch } from "@orionprotocol/sdk";
const pairsList = await simpleFetch(orionUnit.orionAggregator.getPairsList)();

// Response example
// ['ORN-USDT', 'BNB-ORN', 'FTM-ORN', 'ETH-ORN', ...]
```

That's all. You can easy get tradable assets this way:

```ts
const tradableAssets = pairs.reduce((acc, pair) => {
  const [base, quote] = pair.split("-");
  acc.push(base, quote);
  return acc;
}, []);
const uniqueTradableAssets = [...new Set(tradableAssets).values()];
const sortedTradableAssets = uniqueTradableAssets.sort((a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
});
```

## 4. Getting fee assets info

Orion Protocol charge you only with available fee assets. You can get fee assets list:

```ts
import { simpleFetch } from "@orionprotocol/sdk";
const feeAssets = await simpleFetch(orionUnit.orionBlockchain.getTokensFee)();

// Response example:
// {
//   "ORN": "0.2",
//   "BNB": "0.3",
//   "USDT": "0.3"
// }
```

- If you choose ORN as fee asset, you will pay 0.2% of your order's amount (quoted in ORN).
- If you choose BNB as fee asset, you will pay 0.3% of your order's amount (quoted in BNB).
- If you choose USDT as fee asset, you will pay 0.3% of your order's amount (quoted in USDT).

## 5. Get swap info

You can swap one asset for another in two ways:

1. You can specify how much funds you want spend (exact spend)
2. You can specify how much funds you want receive (exact receive)

Each time when user change form inputs, you should get swap info:

```ts
const {
  swapInfo, // Contains information about swap (e.g. how much you will receive, how much you will spend, price)
  fee, // Contains fee information. You can display it in UI.
  route, // "pool" or "aggregator"
} = await orionUnit.exchange.getSwapInfo({
  type: "exactSpend", // Also "exactReceive" is available
  assetIn: "ORN", // What user selected as input asset
  assetOut: "USDT", // What user selected as output asset
  feeAsset: "ORN", // What user selected as fee asset (that we got from previous step)
  amount: 23.89045345, // How much user want to spend (because we specified "exactSpend" in "type" param)
  options: {
    instantSettlement: true, // Set true to ensure that funds can be instantly transferred to wallet (otherwise, there is a possibility of receiving funds to the balance of the exchange contract)
    poolOnly: false, // Please read note below
  },
});
```

When you call `getSwapInfo` method, internally SDK make request to service, that decides execution route — "pool" or "aggregator".

When you got "pool" that means that you need just call method on exchange contract to make swap (DEX only swap execution).
When you got "aggregator" that means that you need to send order to aggregator and wait for execution (aggregator can execute order on CEX'es and DEX'es)

Orion Protocol requires method to transfer your funds from you. When you swap tokens (not ETH in Ethereum, not FTM in Fantom, not BNB in Binance Smart Chain), we using approve to reach this goal. But approve is not always possible. For example, if you want to swap BNB for ORN, you can't approve BNB because BNB is **not token**. BNB is native currency of Binance Smart Chain. So, in case when native currency is asset in AND route is "aggregator", you **should [deposit](../README.md#deposit)** funds (native cryptocurrency) to the exchange contract.

If you don't want to deposit funds to the exchange contract, you can set "poolOnly" option to true.

## 6. Swap

SDK have multiple ways to make swap:

1. Call `orionUnit.exchange.swapMarket`. This is the simplest way to swap. All inclusive method. [See description](../README.md#make-swap-market)
2. Call `orionUnit.orionAggregator.placeOrder`. This is method to place order to **aggregator**. More verbose. [See description](../README.md#place-order-in-orion-aggregator)
3. Call method `swapThroughOrionPool` on exchange contract. This is method to swap tokens through **pool**. [See code example](../src/OrionUnit/Exchange/swapMarket.ts)
