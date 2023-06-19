<!-- Insert logo -->

<div align="center">
    <img 
        src="./logo.svg"
        width="300"
        alt="Orion Protocol SDK logo"
     />
    <h1>Orion Protocol SDK</h1>
    <p>Use CEX and DEX liquidity without KYC.</p>
</div>

[![npm version](https://img.shields.io/npm/v/@orionprotocol/sdk.svg)](https://www.npmjs.com/package/@orionprotocol/sdk)
![npm bundle size (version)](https://img.shields.io/bundlephobia/minzip/@orionprotocol/sdk)
[![Downloads](https://img.shields.io/npm/dm/@orionprotocol/sdk.svg)](https://www.npmjs.com/package/@orionprotocol/sdk)

Do you want to integrate the Orion protocol into your application? See [integration guide](./docs/INTEGRATION.md)

## Overview

Orion Software Developer Kit is a set of functions and methods that allow dApp developers connect to the superior aggregated liquidity of Orion Protocol which combines orderbooks of centralized exchanges as well decentralized automatic market makers such as Uniswap or Spookyswap across several supported blockchains.
Through this connection, developers using the SDK can perform a wide range of actions, including swapping selected tokens using Orion’s aggregated liquidity, obtaining relevant market information through subscriptions, add and remove liquidity to Orion’s pools.

## API Key

Orion’s SDK is free to use and does not require an API key or registration. Refer to integration examples for more detailed information.

- [Overview](#overview)
- [API Key](#api-key)
- [Install](#install)
- [Usage](#usage)
- [Initialization](#initialization)
- [High level methods](#high-level-methods)
  - [Get assets](#get-assets)
  - [Get pairs](#get-pairs)
  - [Get Orion Bridge history](#get-orion-bridge-history)
  - [Bridge swap](#bridge-swap)
  - [Withdraw](#withdraw)
  - [Deposit](#deposit)
  - [Get swap info](#get-swap-info)
  - [Make swap limit](#make-swap-limit)
  - [Make swap market](#make-swap-market)
  - [Add liquidity](#add-liquidity)
  - [Remove all liquidity](#remove-all-liquidity)
- [Low level methods](#low-level-methods)
  - [Get aggregated orderbook](#get-aggregated-orderbook)
  - [Get historical price](#get-historical-price)
  - [Get tradable pairs](#get-tradable-pairs)
  - [Get fee assets](#get-fee-assets)
  - [Get swap info](#get-swap-info-1)
  - [Place order in Aggregator](#place-order-in-aggregator)
  - [Cancel order in Aggregator](#cancel-order-in-aggregator)
  - [Aggregator WebSocket](#aggregator-websocket)
  - [Swap Info](#swap-info)
  - [Balances and order history stream](#balances-and-order-history-stream)
  - [Orderbook stream](#orderbook-stream)
  - [Aggregator WS Stream Unsubscribing](#aggregator-ws-stream-unsubscribing)
- [Price Feed Websocket Stream](#price-feed-websocket-stream)
- [Data fetching](#data-fetching)
- [Using contracts](#using-contracts)
- [Utils](#utils)
  - [Parsing trade transactions](#parsing-trade-transactions)

## Install

```console
npm i @orionprotocol/sdk
```

## Usage

## Initialization

> :warning: **Ethers ^5.6.0 required**

```js
// Node.js
import { Unit, Orion } from "@orionprotocol/sdk";
import { Wallet } from "ethers";

const orion = new Orion();
const unit = orion.getUnit("bsc"); // eth, bsc, ftm, polygon, okc available
const wallet = new Wallet("0x...", unit.provider);
// Unit is chain-in-environment abstraction
```

```ts
// Metamask
import { Unit } from "@orionprotocol/sdk";
import detectEthereumProvider from "@metamask/detect-provider";
import { BaseProvider } from "@metamask/providers";
import { providers } from "ethers";

const startApp = async (provider: BaseProvider) => {
  const web3Provider = new providers.Web3Provider(provider);
  await web3Provider.ready;
  const signer = web3Provider.getSigner(); // ready to go
  const orion = new Orion();
  const unit = orion.getUnit("eth"); // ready to go
};

detectEthereumProvider().then((provider) => {
  if (provider) {
    startApp(provider as BaseProvider);
  } else {
    console.log("Please install MetaMask!");
  }
});
```

## High level methods

### Get assets

```ts
const assets = await orion.getAssets(); // Optional: tradableOnly: boolean (default: true)

// Response example:
// {
//   ORN: {
//     '1': { address: '0x0258f474786ddfd37abce6df6bbb1dd5dfc4434a' },
//     '56': { address: '0xe4ca1f75eca6214393fce1c1b316c237664eaa8e' },
//     '66': { address: '0xd2cdcb6bdee6f78de7988a6a60d13f6ef0b576d9' },
//     '137': { address: '0xd2cdcb6bdee6f78de7988a6a60d13f6ef0b576d9' },
//     '250': { address: '0xd2cdcb6bdee6f78de7988a6a60d13f6ef0b576d9' }
//   },
//   BNB: {
//     '56': { address: '0x0000000000000000000000000000000000000000' },
//     '250': { address: '0xd67de0e0a0fd7b15dc8348bb9be742f3c5850454' }
//   },
// }
```

### Get pairs

```ts
const pairs = await orion.getPairs("spot"); // 'spot' | 'futures'

// Response example:
// {
//   'ORN-USDT': [ '250', '66', '1', '56', '137' ],
//   'USDT-USDC': [ '250', '66', '1', '56', '137' ],
// }
```

### Get Orion Bridge history

```ts
const bridgeHistory = await orion.bridge.getHistory(
  "0x0000000000000000000000000000000000000000"
);
```

### Bridge swap

```ts
const orion = new Orion("production");
const wallet = new Wallet(privateKey);

orion.bridge.swap(
  "ORN", // Asset name
  0.12345678, // Amount
  SupportedChainId.FANTOM_OPERA,
  SupportedChainId.BSC,
  wallet,
  {
    autoApprove: true,
    logger: console.log,
    withdrawToWallet: true, // Enable withdraw to wallet
  }
);
```

### Withdraw

```ts
unit.exchange.withdraw({
  amount: 435.275,
  asset: "USDT",
  signer: wallet, // or signer when UI
});
```

### Deposit

```ts
unit.exchange.deposit({
  amount: 2.5,
  asset: "ORN",
  signer: wallet, // or signer when UI
});
```

### Get swap info

```ts
const { swapInfo, fee } = await unit.exchange.getSwapInfo({
  type: "exactSpend",
  assetIn: "ORN",
  assetOut: "USDT",
  feeAsset: "ORN",
  amount: 23.89045345,
  options: {
    // Optional
    instantSettlement: true,
    poolOnly: false,
  },
});

console.log(swapInfo);
console.log(fee);

// {
//   route: 'pool',
//   swapInfo: {
//     id: 'e5d50b8e-ca82-4826-b454-3fa12b693c11',
//     amountIn: 20,
//     amountOut: 25.68,
//     assetIn: 'ORN',
//     assetOut: 'USDT',
//     path: [ 'ORN', 'USDT' ],
//     executionInfo: '...',
//     orderInfo: {
//       assetPair: 'ORN-USDT',
//       side: 'SELL',
//       amount: 20,
//       safePrice: 1.284
//     },
//     exchanges: [ 'BINANCE' ],
//     price: 1.284,
//     minAmountOut: 12,
//     minAmountIn: 9.4,
//     marketPrice: 1.284,
//     availableAmountOut: null,
//     availableAmountIn: 20,
//     marketAmountOut: 25.68,
//     marketAmountIn: null,
//     type: 'exactSpend'
//   },
//   fee: {
//     assetName: 'FTM',
//     assetAddress: '0x0000000000000000000000000000000000000000',
//     networkFeeInFeeAsset: '0.00073929546',
//     protocolFeeInFeeAsset: undefined
//   }
// }
```

### Make swap limit

```ts
import { simpleFetch } from "simple-typed-fetch";

// Each trading pair has its own quantity precision
// You need to prepare (round) the quantity according to quantity precision

const pairConfig = await simpleFetch(aggregator.getPairConfig)("ORN-USDT");
if (!pairConfig) throw new Error(`Pair config ORN-USDT not found`);

const { qtyPrecision } = pairConfig;

const amount = 23.5346563;
const roundedAmount = new BigNumber(amount).decimalPlaces(
  qtyPrecision,
  BigNumber.ROUND_FLOOR
); // You can use your own Math lib

unit.exchange
  .swapLimit({
    type: "exactSpend",
    assetIn: "ORN",
    assetOut: "USDT",
    feeAsset: "ORN",
    amount: roundedAmount.toNumber(),
    price: 20,
    signer: wallet, // or signer when UI
    options: {
      // All options are optional 🙂
      poolOnly: true, // You can specify whether you want to perform the exchange only through the pool
      instantSettlement: true, // Set true to ensure that funds can be instantly transferred to wallet (otherwise, there is a possibility of receiving funds to the balance of the exchange contract)
      logger: console.log,
      // Set it to true if you want the issues associated with
      // the lack of allowance to be automatically corrected
      autoApprove: true,
    },
  })
  .then(console.log);
```

### Make swap market

```ts
import { simpleFetch } from "simple-typed-fetch";

// Each trading pair has its own quantity precision
// You need to prepare (round) the quantity according to quantity precision

const pairConfig = await simpleFetch(aggregator.getPairConfig)("ORN-USDT");
if (!pairConfig) throw new Error(`Pair config ORN-USDT not found`);

const { qtyPrecision } = pairConfig;

const amount = 23.5346563;
const roundedAmount = new BigNumber(amount).decimalPlaces(
  qtyPrecision,
  BigNumber.ROUND_FLOOR
); // You can use your own Math lib

unit.exchange
  .swapMarket({
    type: "exactSpend",
    assetIn: "ORN",
    assetOut: "USDT",
    feeAsset: "ORN",
    amount: roundedAmount.toNumber(),
    slippagePercent: 1,
    signer: wallet, // or signer when UI
    options: {
      // All options are optional 🙂
      poolOnly: true, // You can specify whether you want to perform the exchange only through the pool
      instantSettlement: true, // Set true to ensure that funds can be instantly transferred to wallet (otherwise, there is a possibility of receiving funds to the balance of the exchange contract)
      logger: console.log,
      // Set it to true if you want the issues associated with
      // the lack of allowance to be automatically corrected
      autoApprove: true,
    },
  })
  .then(console.log);
```

### Add liquidity

```ts
unit.farmingManager.addLiquidity({
  poolName: "ORN-USDT",
  amountAsset: "ORN", // ORN or USDT for this pool
  amount: 23.352345,
  signer: wallet, // or signer when UI
});
```

### Remove all liquidity

```ts
unit.farmingManager.removeAllLiquidity({
  poolName: "ORN-USDT",
  signer: wallet, // or signer when UI
});
```

## Low level methods

### Get aggregated orderbook

```ts
import { simpleFetch } from "simple-typed-fetch";

const orderbook = await simpleFetch(unit.aggregator.getAggregatedOrderbook)(
  "ORN-USDT",
  20 // Depth
);
```

### Get historical price

```ts
import { simpleFetch } from "simple-typed-fetch";

const candles = await simpleFetch(unit.priceFeed.getCandles)(
  "ORN-USDT",
  1650287678, // interval start, unix timestamp
  1650374078, // interval end, unix timestamp
  "5m" // '5m' or '30m' or '1h' or '1d',
);
```

### Get tradable pairs

```ts
import { simpleFetch } from "simple-typed-fetch";
const pairsList = await simpleFetch(unit.aggregator.getPairsList)();
console.log(pairsList); // ['ORN-USDT', 'BNB-ORN', 'FTM-ORN', 'ETH-ORN']
```

### Get fee assets

```ts
import { simpleFetch } from "simple-typed-fetch";
const feeAssets = await simpleFetch(unit.blockchainService.getTokensFee)();
```

### Get swap info

```ts
import { simpleFetch } from "simple-typed-fetch";

const swapInfo = await simpleFetch(unit.aggregator.getSwapInfo)(
  // Use 'exactSpend' when 'amount' is how much you want to spend. Use 'exactReceive' otherwise
  "exactSpend", // type
  "ORN", // asset in
  "USDT", // asset out
  25.23453457 // amount
  // Exchanges. OPTIONAL! Specify 'pools' if you want "pool only" swap execution. Specify 'cex' if you want "cex only" execution
);
```

Swap info response example:

```json
{
  "id": "2275c9b1-5c42-40c4-805f-bb1e685029f9",
  "assetIn": "ORN",
  "amountIn": 25.23453457,
  "assetOut": "USDT",
  "amountOut": 37.11892965,
  "price": 1.47095757,
  "marketAmountOut": 37.11892965,
  "marketAmountIn": null,
  "marketPrice": 1.47095757,
  "minAmountIn": 8.2,
  "minAmountOut": 12,
  "availableAmountIn": 25.2,
  "availableAmountOut": null,
  "path": ["ORN", "USDT"],
  "orderInfo": {
    "assetPair": "ORN-USDT",
    "side": "SELL",
    "amount": 25.2,
    "safePrice": 1.468
  },
  "executionInfo": "ORION_POOL: ORN -> USDT (length = 1): 25.23453457 ORN -> 37.11892965 USDT, market amount out = 37.11892965 USDT, price = 1.47095757 USDT/ORN (order SELL 25.2 @ 1.47 (safe price 1.468) on ORN-USDT), available amount in = 25.2 ORN, steps: {[1]: 25.23453457 ORN -> 37.11892965 USDT, price = 1.47095757 USDT/ORN, passed amount in = 25.23453457 ORN, amount out = cost of SELL on ORN-USDT order by min price = 1.47095757 USDT/ORN (sell by amount), avgWeighedPrice = 1.47095757 USDT/ORN, cost by avgWeighedPrice = 37.11892965 USDT, executed sell amount = 25.23453457 ORN}"
}
```

### Place order in Aggregator

```ts
import { simpleFetch } from "simple-typed-fetch";
import { crypt } from "@orionprotocol/sdk";
import { Exchange__factory } from "@orionprotocol/contracts";

const myAddress = await signer.getAddress(); // or wallet.address (without await)
const baseAssetAddress = "0xfbcad2c3a90fbd94c335fbdf8e22573456da7f68";
const quoteAssetAddress = "0xcb2951e90d8dcf16e1fa84ac0c83f48906d6a744";
const amount = "345.623434";
const price = "2.55";
const feeAssetAddress = "0xf223eca06261145b3287a0fefd8cfad371c7eb34";
const fee = "0.7235"; // Orion Fee + Network Fee in fee asset
const side = "BUY"; // or 'SELL'
const isPersonalSign = false; // https://docs.metamask.io/guide/signing-data.html#a-brief-history
const { chainId } = unit;
const {
  matcherAddress, // The address that will transfer funds to you during the exchange process
} = await simpleFetch(unit.blockchainService.getInfo)();

const signedOrder = await crypt.signOrder(
  baseAssetAddress,
  quoteAssetAddress,
  side,
  price,
  amount,
  fee,
  myAddress,
  matcherAddress,
  feeAssetAddress,
  isPersonalSign,
  wallet, // or signer when UI
  chainId
);

const exchangeContract = Exchange__factory.connect(
  exchangeContractAddress,
  unit.provider
);

const orderIsOk = await exchangeContract.validateOrder(signedOrder);

if (!orderIsOk) throw new Error("Order invalid");

const { orderId } = await simpleFetch(unit.aggregator.placeOrder)(
  signedOrder,
  false // True if you want to place order to "internal" orderbook. If you do not want your order to be executed on CEXes or DEXes, but could be filled with other "internal" order(s).
);
```

### Cancel order in Aggregator

```ts
import { simpleFetch } from "simple-typed-fetch";
import { crypt } from "@orionprotocol/sdk";

const myAddress = await signer.getAddress();
const orderId = '0x...';

const signedCancelOrderRequest: SignedCancelOrderRequest = await crypt.signCancelOrder(
  myAddress, // senderAddress
  orderId,
  false, // usePersonalSign
  signer, // signer
  chainId, // chainId
);

const { orderId, remainingAmount } = await simpleFetch(unit.aggregator.cancelOrder)(
  signedCancelOrderRequest
);

console.log(`Order ${orderId} canceled. Remaining amount: ${remainingAmount}`);

```

### Aggregator WebSocket

Available subscriptions:

```ts
ADDRESS_UPDATES_SUBSCRIBE = 'aus', // Orders history, balances info
SWAP_SUBSCRIBE = 'ss', // Swap info updates
AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE = 'aobus', // Bids and asks
ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE = 'apcus',
BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE = 'btasabus', // Need for Orion Bridge
```

### Swap Info

```ts

const swapRequestId = unit.aggregator.ws.subscribe(
  "ss", // SWAP_SUBSCRIBE
  {
    payload: {
      i: assetIn, // asset in
      o: assetOut, // asset out
      e: true, // true when type of swap is exactSpend, can be omitted (true by default)
      es: ['ORION_POOL'] // OPTIONAL! Specify ['ORION_POOL'] if you want "pool only" swap execution
      a: 5.62345343, // amount
    },
    // Handle data update in your way
    callback: (swapInfo) => {
      switch (swapInfo.kind) {
        case "exactSpend":
          console.log(swapInfo.availableAmountIn);
          break;
        case "exactReceive":
          console.log(swapInfo.availableAmountOut);
          break;
      }
    },
  }
);

aggregator.ws.unsubscribe(swapRequestId);

```

### Balances and order history stream

```ts
unit.aggregator.ws.subscribe(
  "aus", // ADDRESS_UPDATES_SUBSCRIBE — orders, balances
  {
    payload: "0x0000000000000000000000000000000000000000", // Some wallet address
    callback: (data) => {
      switch (data.kind) {
        case "initial":
          if (data.orders) console.log(data.orders); // All orders. "orders" is undefined if you don't have any orders yet
          console.log(data.balances); // Since this is initial message, the balances contain all assets
          break;
        case "update": {
          if (data.order) {
            switch (data.order.kind) {
              case "full":
                console.log("Pool order", data.order); // Orders from the pool go into history with the SETTLED status
                break;
              case "update":
                console.log("Order in the process of execution", data.order);
                break;
              default:
                break;
            }
          }
          if (data.balances) console.log("Balance update", data.balances); // Since this is an update message, the balances only contain the changed assets
        }
      }
    },
  }
);

unit.aggregator.ws.unsubscribe("0x0000000000000000000000000000000000000000");
```

### Orderbook stream

```ts
unit.aggregator.ws.subscribe("aobus", {
  payload: "ORN-USDT", // Some trading pair
  callback: (asks, bids, pairName) => {
    console.log(`${pairName} orderbook asks`, asks);
    console.log(`${pairName} orderbook bids`, bids);
  },
});

unit.aggregator.ws.unsubscribe("ORN-USDT");
```

### Aggregator WS Stream Unsubscribing

```ts
// Asset pairs config updates unsubscribe
unit.aggregator.ws.unsubscribe("apcu");

// Broker tradable atomic swap assets balance unsubscribe
unit.aggregator.ws.unsubscribe("btasabu");
```

## Price Feed Websocket Stream

```ts
const allTickersSubscription = unit.priceFeed.ws.subscribe("allTickers", {
  callback: (tickers) => {
    console.log(tickers);
  },
});
allTickersSubscription.unsubscribe();
unit.priceFeed.ws.unsubscribe("allTickers", allTickersSubscription.id); // Also you can unsubscribe like this

const tickerSubscription = unit.priceFeed.ws.subscribe("ticker", {
  callback: (ticker) => {
    console.log(tricker);
  },
  payload: "ORN-USDT",
});
tickerSubscription.subscription();
unit.priceFeed.ws.unsubscribe("ticker", tickerSubscription.id);

const lastPriceSubscription = unit.priceFeed.ws.subscribe("lastPrice", {
  callback: ({ pair, price }) => {
    console.log(`Price: ${price}`);
  },
  payload: "ORN-USDT",
});
lastPriceSubscription.unsubscribe();
unit.priceFeed.ws.unsubscribe("lastPrice", lastPriceSubscription.id);
```

## Data fetching

```ts
// Verbose way example

const getCandlesResult = await unit.priceFeed.getCandles(
  "ORN-USDT",
  1650287678,
  1650374078,
  "5m"
);
if (getCandlesResult.isErr()) {
  // You can handle fetching errors here
  // You can access error text, statuses
  const { error } = placeOrderFetchResult;
  switch (error.type) {
    case "fetchError": // Instance of Error
      console.error(error.message);
      break;
    case "unknownFetchError":
      console.error(`URL: ${error.url}, Error: ${error.message}`);
      break;
    case "unknownFetchThrow":
      console.error("Something wrong happened during fetching", error.error);
      break;
    // ... more error types see in src/fetchWithValidation.ts
  }
} else {
  // Success result
  const { candles, timeStart, timeEnd } = getCandlesResult.value;
  // Here we can handle response data
}
```

```ts
import { simpleFetch } from "simple-typed-fetch";

const { candles, timeStart, timeEnd } = await simpleFetch(
  unit.priceFeed.getCandles
)("ORN-USDT", 1650287678, 1650374078, "5m");

// Here we can handle response data
```

## Using contracts

Use package [@orionprotocol/contracts](https://github.com/orionprotocol/contracts)

## Utils

### Parsing trade transactions

```ts
import { utils } from "@orionprotocol/sdk";

// Examples:
// fillThroughOrionPool: https://bscscan.com/tx/0xe311fb927b938e1e484b7660b5c4bd0aa9c97c86f6e1f681d6867dabc8a702fe
// swapThroughOrionPool: https://bscscan.com/tx/0xb9c93851f605b8b5a906dbc9363eae0aa6635ce41ffb6bf540d954f9138bf58c
// fillOrders: https://bscscan.com/tx/0x860b8820ece1a5af11b2459b6bd1a025e7cdc86a1d7e1e3d73558db6e72974d4

const data = utils.parseExchangeTradeTransaction({
  data: "0x4c36fc72000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000004a817c80000000000000000000000000000000000000000000000000000000000019595c700000000000000000000000000000000000000000000000000000000000002a000000000000000000000000050abeb3e61167365d0a7dd7b3301a8ae27016d760000000000000000000000002d23c313feac4810d9d014f840741363fccba675000000000000000000000000e4ca1f75eca6214393fce1c1b316c237664eaa8e00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000e4ca1f75eca6214393fce1c1b316c237664eaa8e00000000000000000000000000000000000000000000000000000004a817c8000000000000000000000000000000000000000000000000000000000006df56a00000000000000000000000000000000000000000000000000000000003f7efc600000000000000000000000000000000000000000000000000000182dff605d000000000000000000000000000000000000000000000000000000182e2465cb60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000411b7b9908456b6d0b97e411b3585de8ed2c7c1db9a39d2f5f81fc8ed765f0575d29cd9ebd0533e3eeb819d70971bf7bd705c52871c7a00ba67c738040a69895911c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000e52ccf7b6ce4817449f2e6fa7efd7b567803e4b4000000000000000000000000e4ca1f75eca6214393fce1c1b316c237664eaa8e00000000000000000000000055d398326f99059ff775485246999027b3197955",
});

switch (data.type) {
  case "fillOrders": // through aggregator — CEX
    console.log(data.args.orders.buyOrder);
    break;
  case "fillThroughOrionPool": // through aggregator — DEX (pools)
    console.log(data.args.order);
    break;
  case "swapThroughOrionPool": // through DEX (pools) directly
    console.log(data.args.amount_spend);
    break;
}
```
