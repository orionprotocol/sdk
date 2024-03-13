# Orion Verbose configuration

```ts
const orion = new Orion({
  referralAPI: "https://referral-api.orionprotocol.io",
  networks: {
    1: {
      chainId: SupportedChainId.MAINNET,
      nodeJsonRpc: "https://cloudflare-eth.com/",
      services: {
        blockchainService: {
          http: "http://localhost:3000",
        },
        aggregator: {
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
  networks: {
    [SupportedChainId.BSC_TESTNET]: {
      nodeJsonRpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    },
  },
});

// Orion unit init
const unit = orion.getUnit("bsc");
// OR
const unit = orion.getUnit(SupportedChainId.BSC);
// OR
const unit = new Unit({
  chainId: SupportedChainId.BSC,
  nodeJsonRpc: "https://bsc-dataseed.binance.org/",
  services: {
    blockchainService: {
      http: "https://orion-bsc-api.orionprotocol.io",
    },
    aggregator: {
      http: "https://orion-bsc-api.orionprotocol.io/backend",
      ws: "https://orion-bsc-api.orionprotocol.io/v1",
    },
    priceFeed: {
      api: "https://orion-bsc-api.orionprotocol.io/price-feed",
    },
  },
});
```
