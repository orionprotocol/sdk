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
```
