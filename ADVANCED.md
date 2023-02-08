# Orion Verbose configuration

```ts
const orion = new Orion({
  analyticsAPI: "https://analytics-api.orionprotocol.io",
  referralAPI: "https://referral-api.orionprotocol.io",
  networks: {
    1: {
      chainId: SupportedChainId.MAINNET,
      nodeJsonRpc: "https://cloudflare-eth.com/",
      services: {
        orionBlockchain: {
          http: "http://localhost:3000",
        },
        orionAggregator: {
          http: "http://localhost:3001/backend",
          ws: "http://localhost:3001/v1",
        },
        priceFeed: {
          api: "http://localhost:3002/price-feed",
        },
      },
    },
  },
});

// Also you can set some config as default and override it for some params
const orion = new Orion("testing", {
  analyticsAPI: "https://asdasd.orionprotocol.io",
  networks: {
    [SupportedChainId.BSC_TESTNET]: {
      nodeJsonRpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    },
  },
});

// Orion unit init
const orionUnit = orion.getUnit("bsc");
// OR
const orionUnit = orion.getUnit(SupportedChainId.BSC);
// OR
const orionUnit = new OrionUnit({
  chainId: SupportedChainId.BSC,
  nodeJsonRpc: "https://bsc-dataseed.binance.org/",
  services: {
    orionBlockchain: {
      http: "https://orion-bsc-api.orionprotocol.io",
    },
    orionAggregator: {
      http: "https://orion-bsc-api.orionprotocol.io/backend",
      ws: "https://orion-bsc-api.orionprotocol.io/v1",
    },
    priceFeed: {
      api: "https://orion-bsc-api.orionprotocol.io/price-feed",
    },
  },
});
```
