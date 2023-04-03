import Orion from '../Orion/index.js';
import { ReferralSystem } from '../services/ReferralSystem/index.js';
import { SupportedChainId } from '../types.js';
import express from 'express';
import WebSocket from 'ws';
import http from 'http';
import httpToWS from '../utils/httpToWS.js';
import {
  createHttpTerminator,
} from 'http-terminator';
import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';
jest.setTimeout(10000);

const createServer = (externalHost: string) => {
  const app = express();
  const server = http.createServer(app);

  const httpTerminator = createHttpTerminator({ server });
  const wss = new WebSocket.Server({ server });

  let externalWs: WebSocket | null = null;

  wss.on('connection', (ws, req) => {
    if (req.url === undefined) throw new Error('req.url is undefined');
    const targetUrl = httpToWS(`${externalHost}${req.url}`);
    externalWs = new WebSocket(targetUrl);

    externalWs.on('open', () => {
      ws.on('message', message => {
        externalWs?.send(message);
      });

      externalWs?.on('message', message => {
        ws.send(message);
      });
    });
  });

  app.get(
    '*',
    (req, res) => {
      (async () => {
        const routeFromURL = req.url;
        try {
          const targetUrl = `${externalHost}${routeFromURL}`;
          const response = await fetch(targetUrl);
          const text = await response.text();
          res.send(text);
        } catch (error) {
          res.status(500).send({
            error: 'Failed to retrieve data from external resource'
          });
        }
      })().catch(console.error)
    });

  server.listen(0);

  const address = server.address();

  if (typeof address === 'string') {
    throw new Error(`Server address is a string: ${address}`);
  }
  const closeWS = () => new Promise((resolve) => {
    wss.close(resolve);
  });

  return {
    port: address?.port,
    terminate: async () => {
      externalWs?.close();
      await closeWS();
      await httpTerminator.terminate();
    }
  }
}

describe('Orion', () => {
  test('Init Orion testing', () => {
    const orion = new Orion('testing');
    expect(orion.referralSystem).toBeInstanceOf(ReferralSystem);
    expect(orion.unitsArray.length).toBe(4); // eth, bsc, polygon, fantom

    const orionUnitBSC = orion.units[SupportedChainId.BSC_TESTNET];
    expect(orionUnitBSC?.chainId).toBe(SupportedChainId.BSC_TESTNET);
    // expect(orionUnitBSC?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.BSC_TESTNET)).toHaveLength(3);
    expect(orionUnitBSC?.networkCode).toBe('bsc');

    const orionUnitRopsten = orion.units[SupportedChainId.ROPSTEN]
    expect(orionUnitRopsten?.chainId).toBe(SupportedChainId.ROPSTEN);
    // expect(orionUnitRopsten?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.ROPSTEN)).toHaveLength(3);
    expect(orionUnitRopsten?.networkCode).toBe('eth');

    const orionUnitPolygon = orion.units[SupportedChainId.POLYGON_TESTNET];
    expect(orionUnitPolygon?.chainId).toBe(SupportedChainId.POLYGON_TESTNET);
    // expect(orionUnitPolygon?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.POLYGON_TESTNET)).toHaveLength(3);
    expect(orionUnitPolygon?.networkCode).toBe('polygon');

    const orionUnitFantom = orion.units[SupportedChainId.FANTOM_TESTNET];
    expect(orionUnitFantom?.chainId).toBe(SupportedChainId.FANTOM_TESTNET);
    // expect(orionUnitFantom?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.FANTOM_TESTNET)).toHaveLength(3);
    expect(orionUnitFantom?.networkCode).toBe('ftm');
  });

  test('Init Orion production', () => {
    const orion = new Orion();
    expect(orion.env).toBe('production');
    expect(orion.referralSystem).toBeInstanceOf(ReferralSystem);
    expect(orion.unitsArray.length).toBe(5); // eth, bsc, polygon, fantom, okc

    const orionUnitBSC = orion.units[SupportedChainId.BSC];
    expect(orionUnitBSC?.chainId).toBe(SupportedChainId.BSC);
    // expect(orionUnitBSC?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.BSC)).toHaveLength(4);
    expect(orionUnitBSC?.networkCode).toBe('bsc');

    const orionUnitETH = orion.units[SupportedChainId.MAINNET]
    expect(orionUnitETH?.chainId).toBe(SupportedChainId.MAINNET);
    // expect(orionUnitETH?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.MAINNET)).toHaveLength(4);
    expect(orionUnitETH?.networkCode).toBe('eth');

    const orionUnitPolygon = orion.units[SupportedChainId.POLYGON];
    expect(orionUnitPolygon?.chainId).toBe(SupportedChainId.POLYGON);
    // expect(orionUnitPolygon?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.POLYGON)).toHaveLength(4);
    expect(orionUnitPolygon?.networkCode).toBe('polygon');

    const orionUnitFantom = orion.units[SupportedChainId.FANTOM_OPERA];
    expect(orionUnitFantom?.chainId).toBe(SupportedChainId.FANTOM_OPERA);
    // expect(orionUnitFantom?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.FANTOM_OPERA)).toHaveLength(4);
    expect(orionUnitFantom?.networkCode).toBe('ftm');

    const orionUnitOKC = orion.units[SupportedChainId.OKC];
    expect(orionUnitOKC?.chainId).toBe(SupportedChainId.OKC);
    // expect(orionUnitOKC?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.OKC)).toHaveLength(4);
    expect(orionUnitOKC?.networkCode).toBe('okc');
  });

  test('Init Orion custom', async () => {
    const server0 = createServer('https://trade.orionprotocol.io');
    const server1 = createServer('https://trade.orionprotocol.io');
    const server2 = createServer('https://trade.orionprotocol.io');

    if (server0.port === undefined || server1.port === undefined || server2.port === undefined) {
      throw new Error('Server port is undefined');
    }

    const orionBlockchainAPI = `http://localhost:${server0.port}`;
    const orionAggregatorAPI = `http://localhost:${server1.port}`;
    const orionPriceFeedAPI = `http://localhost:${server2.port}`;

    const orion = new Orion({
      analyticsAPI: 'https://analytics-api.orionprotocol.io',
      referralAPI: 'https://referral-api.orionprotocol.io',
      networks: {
        1: {
          // api: 'https://api.orionprotocol.io',
          chainId: SupportedChainId.MAINNET,
          nodeJsonRpc: 'https://cloudflare-eth.com/',
          services: {
            orionBlockchain: {
              http: orionBlockchainAPI,
            },
            orionAggregator: {
              http: orionAggregatorAPI + '/backend',
              ws: `http://localhost:${server1.port}/v1`,
            },
            priceFeed: {
              api: orionPriceFeedAPI + '/price-feed',
            },
          },
        }
      }
    });

    const [orionUnit] = orion.unitsArray;
    if (!orionUnit) {
      throw new Error('Orion unit is not defined');
    }
    expect(orion.referralSystem).toBeInstanceOf(ReferralSystem);
    expect(orion.unitsArray.length).toBe(1); // eth
    expect(orion.referralSystem.api).toBe('https://referral-api.orionprotocol.io');
    expect(orionUnit.chainId).toBe(SupportedChainId.MAINNET);
    // expect(orionUnit.env).toBeUndefined();
    // expect(orion.units[0]?.orionAggregator.api).toBe('http://localhost:3001');
    expect(orionUnit.orionAggregator.ws.api).toBe(`ws://localhost:${server1.port}/v1`);
    expect(orionUnit.orionBlockchain.api).toBe(orionBlockchainAPI);
    expect(orionUnit.priceFeed.api).toBe(orionPriceFeedAPI + '/price-feed');
    expect(orionUnit.provider.connection.url).toBe('https://cloudflare-eth.com/');

    const info = await simpleFetch(orionUnit.orionBlockchain.getInfo)();
    expect(info).toBeDefined();

    const spotData = await simpleFetch(orionUnit.orionAggregator.getPairConfigs)('spot');
    expect(spotData).toBeDefined();

    const priceData = await simpleFetch(orionUnit.priceFeed.getCandles)(
      'BTC-USDT',
      Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 30) / 1000), // 1 month ago
      Math.floor(Date.now() / 1000), // now
      '1d'
    );
    expect(priceData).toBeDefined();

    const allTickersDone = await new Promise<boolean>((resolve, reject) => {
      const { unsubscribe } = orionUnit.priceFeed.ws.subscribe(
        'allTickers',
        {
          callback: () => {
            resolve(true);
            unsubscribe();
            clearTimeout(timeout);
          }
        }
      )
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout: ${orionUnit.priceFeed.wsUrl}`));
      }, 10000);
    });
    expect(allTickersDone).toBe(true);

    await server0.terminate();
    await server1.terminate();
    await server2.terminate();
  });

  test('Init Orion testing with overrides', () => {
    const orion = new Orion('testing', {
      analyticsAPI: 'https://asdasd.orionprotocol.io',
      referralAPI: 'https://zxczxc.orionprotocol.io',
      networks: {
        [SupportedChainId.BSC_TESTNET]: {
          nodeJsonRpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        }
      }
    });

    const bscOrionUnit = orion.units[SupportedChainId.BSC_TESTNET]
    expect(bscOrionUnit?.provider.connection.url).toBe('https://data-seed-prebsc-1-s1.binance.org:8545/');
    expect(orion.referralSystem.api).toBe('https://zxczxc.orionprotocol.io');
  });

  test('Orion Responses', async () => {
    const orion = new Orion('testing');

    const orionUnitBSC = orion.units[SupportedChainId.BSC_TESTNET]
    if (!orionUnitBSC) {
      throw new Error('Orion unit not found');
    }
    const info = await simpleFetch(orionUnitBSC.orionBlockchain.getInfo)();
    expect(info).toBeDefined();
    expect(info.chainId).toBe(97);
    expect(info.chainName).toBe('bsc-testnet');

    const pairConfigs = await simpleFetch(orionUnitBSC.orionAggregator.getPairConfigs)('spot');
    expect(pairConfigs).toBeDefined();
    expect(pairConfigs.length).toBeGreaterThan(0);

    const aobusDone = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      orionUnitBSC.orionAggregator.ws.subscribe('aobus', {
        payload: 'ORN-USDT',
        callback: () => {
          resolve(true);
          orionUnitBSC.orionAggregator.ws.destroy();
          clearTimeout(timeout);
        }
      })
    });
    expect(aobusDone).toBe(true);
    const candles = await simpleFetch(orionUnitBSC.priceFeed.getCandles)(
      'BTC-USDT',
      Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 30) / 1000), // 1 month ago
      Math.floor(Date.now() / 1000), // now
      '1d'
    );
    expect(candles).toBeDefined();

    const allTickersDone = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      const { unsubscribe } = orionUnitBSC.priceFeed.ws.subscribe(
        'allTickers',
        {
          callback: () => {
            resolve(true);
            unsubscribe();
            clearTimeout(timeout);
          }
        }
      )
    });
    expect(allTickersDone).toBe(true);

    const blockNumber = await orionUnitBSC.provider.getBlockNumber();
    expect(blockNumber).toBeDefined();
    const network = await orionUnitBSC.provider.getNetwork();
    expect(network.chainId).toBe(97);

    const zeroAddressWithout0x = ethers.constants.AddressZero.slice(2);
    expect(simpleFetch(orion.referralSystem.getMiniStats)(zeroAddressWithout0x))
      .rejects
      .toThrow('empty reward history');
  });

  test('Get Orion unit by networkCode', () => {
    const orionTesting = new Orion('testing');
    const orionUnitBSCTesting = orionTesting.getUnit('bsc');
    expect(orionUnitBSCTesting.chainId).toBe(SupportedChainId.BSC_TESTNET);

    const orionMainnet = new Orion('production');
    const orionUnitBSCMainnet = orionMainnet.getUnit('bsc');
    expect(orionUnitBSCMainnet.chainId).toBe(SupportedChainId.BSC);
  })
});
