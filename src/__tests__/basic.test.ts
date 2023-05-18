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
import { SERVICE_TOKEN } from '../index.js';
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

    const unitBSC = orion.units[SupportedChainId.BSC_TESTNET];
    expect(unitBSC?.chainId).toBe(SupportedChainId.BSC_TESTNET);
    // expect(unitBSC?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.BSC_TESTNET)).toHaveLength(3);
    expect(unitBSC?.networkCode).toBe('bsc');

    const unitRopsten = orion.units[SupportedChainId.ROPSTEN]
    expect(unitRopsten?.chainId).toBe(SupportedChainId.ROPSTEN);
    // expect(unitRopsten?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.ROPSTEN)).toHaveLength(3);
    expect(unitRopsten?.networkCode).toBe('eth');

    const unitPolygon = orion.units[SupportedChainId.POLYGON_TESTNET];
    expect(unitPolygon?.chainId).toBe(SupportedChainId.POLYGON_TESTNET);
    // expect(unitPolygon?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.POLYGON_TESTNET)).toHaveLength(3);
    expect(unitPolygon?.networkCode).toBe('polygon');

    const unitFantom = orion.units[SupportedChainId.FANTOM_TESTNET];
    expect(unitFantom?.chainId).toBe(SupportedChainId.FANTOM_TESTNET);
    // expect(unitFantom?.env).toBe('testing');
    expect(orion.getSiblingsOf(SupportedChainId.FANTOM_TESTNET)).toHaveLength(3);
    expect(unitFantom?.networkCode).toBe('ftm');
  });

  test('Init Orion production', () => {
    const orion = new Orion();
    expect(orion.env).toBe('production');
    expect(orion.referralSystem).toBeInstanceOf(ReferralSystem);
    expect(orion.unitsArray.length).toBe(5); // eth, bsc, polygon, fantom, okc

    const unitBSC = orion.units[SupportedChainId.BSC];
    expect(unitBSC?.chainId).toBe(SupportedChainId.BSC);
    // expect(unitBSC?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.BSC)).toHaveLength(4);
    expect(unitBSC?.networkCode).toBe('bsc');

    const unitETH = orion.units[SupportedChainId.MAINNET]
    expect(unitETH?.chainId).toBe(SupportedChainId.MAINNET);
    // expect(unitETH?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.MAINNET)).toHaveLength(4);
    expect(unitETH?.networkCode).toBe('eth');

    const unitPolygon = orion.units[SupportedChainId.POLYGON];
    expect(unitPolygon?.chainId).toBe(SupportedChainId.POLYGON);
    // expect(unitPolygon?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.POLYGON)).toHaveLength(4);
    expect(unitPolygon?.networkCode).toBe('polygon');

    const unitFantom = orion.units[SupportedChainId.FANTOM_OPERA];
    expect(unitFantom?.chainId).toBe(SupportedChainId.FANTOM_OPERA);
    // expect(unitFantom?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.FANTOM_OPERA)).toHaveLength(4);
    expect(unitFantom?.networkCode).toBe('ftm');

    const unitOKC = orion.units[SupportedChainId.OKC];
    expect(unitOKC?.chainId).toBe(SupportedChainId.OKC);
    // expect(unitOKC?.env).toBe('production');
    expect(orion.getSiblingsOf(SupportedChainId.OKC)).toHaveLength(4);
    expect(unitOKC?.networkCode).toBe('okc');
  });

  test('Init Orion custom', async () => {
    const server0 = createServer('https://trade.orionprotocol.io');
    const server1 = createServer('https://trade.orionprotocol.io');
    const server2 = createServer('https://trade.orionprotocol.io');

    if (server0.port === undefined || server1.port === undefined || server2.port === undefined) {
      throw new Error('Server port is undefined');
    }

    const blockchainServiceAPI = `http://localhost:${server0.port}`;
    const aggregatorAPI = `http://localhost:${server1.port}`;
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
            blockchainService: {
              http: blockchainServiceAPI,
            },
            aggregator: {
              http: aggregatorAPI + '/backend',
              ws: `http://localhost:${server1.port}/v1`,
            },
            priceFeed: {
              api: orionPriceFeedAPI + '/price-feed',
            },
          },
        }
      }
    });

    const [unit] = orion.unitsArray;
    if (!unit) {
      throw new Error('Orion unit is not defined');
    }
    expect(orion.referralSystem).toBeInstanceOf(ReferralSystem);
    expect(orion.unitsArray.length).toBe(1); // eth
    expect(orion.referralSystem.api).toBe('https://referral-api.orionprotocol.io');
    expect(unit.chainId).toBe(SupportedChainId.MAINNET);
    // expect(unit.env).toBeUndefined();
    // expect(orion.units[0]?.aggregator.api).toBe('http://localhost:3001');
    expect(unit.aggregator.ws.api).toBe(`ws://localhost:${server1.port}/v1`);
    expect(unit.blockchainService.api).toBe(blockchainServiceAPI);
    expect(unit.priceFeed.api).toBe(orionPriceFeedAPI + '/price-feed');
    expect(unit.provider.connection.url).toBe('https://cloudflare-eth.com/');

    const info = await simpleFetch(unit.blockchainService.getInfo)();
    expect(info).toBeDefined();

    const spotData = await simpleFetch(unit.aggregator.getPairConfigs)('spot');
    expect(spotData).toBeDefined();

    const priceData = await simpleFetch(unit.priceFeed.getCandles)(
      'BTC-USDT',
      Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 30) / 1000), // 1 month ago
      Math.floor(Date.now() / 1000), // now
      '1d'
    );
    expect(priceData).toBeDefined();

    const allTickersDone = await new Promise<boolean>((resolve, reject) => {
      const { unsubscribe } = unit.priceFeed.ws.subscribe(
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
        reject(new Error(`Timeout: ${unit.priceFeed.wsUrl}`));
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

    const bscUnit = orion.units[SupportedChainId.BSC_TESTNET]
    expect(bscUnit?.provider.connection.url).toBe('https://data-seed-prebsc-1-s1.binance.org:8545/');
    expect(orion.referralSystem.api).toBe('https://zxczxc.orionprotocol.io');
  });

  test('Orion Responses', async () => {
    const orion = new Orion('testing');

    const unitBSC = orion.units[SupportedChainId.BSC_TESTNET]
    if (!unitBSC) {
      throw new Error('Orion unit not found');
    }
    const info = await simpleFetch(unitBSC.blockchainService.getInfo)();
    expect(info).toBeDefined();
    expect(info.chainId).toBe(97);
    expect(info.chainName).toBe('bsc-testnet');

    const pairConfigs = await simpleFetch(unitBSC.aggregator.getPairConfigs)('spot');
    expect(pairConfigs).toBeDefined();
    expect(pairConfigs.length).toBeGreaterThan(0);

    const aobusDone = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      unitBSC.aggregator.ws.subscribe('aobus', {
        payload: `${SERVICE_TOKEN}-USDT`,
        callback: () => {
          resolve(true);
          unitBSC.aggregator.ws.destroy();
          clearTimeout(timeout);
        }
      })
    });
    expect(aobusDone).toBe(true);
    const candles = await simpleFetch(unitBSC.priceFeed.getCandles)(
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

      const { unsubscribe } = unitBSC.priceFeed.ws.subscribe(
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

    const blockNumber = await unitBSC.provider.getBlockNumber();
    expect(blockNumber).toBeDefined();
    const network = await unitBSC.provider.getNetwork();
    expect(network.chainId).toBe(97);

    const zeroAddressWithout0x = ethers.constants.AddressZero.slice(2);
    expect(simpleFetch(orion.referralSystem.getMiniStats)(zeroAddressWithout0x))
      .rejects
      .toThrow('empty reward history');
  });

  test('Get Orion unit by networkCode', () => {
    const orionTesting = new Orion('testing');
    const unitBSCTesting = orionTesting.getUnit('bsc');
    expect(unitBSCTesting.chainId).toBe(SupportedChainId.BSC_TESTNET);

    const orionMainnet = new Orion('production');
    const unitBSCMainnet = orionMainnet.getUnit('bsc');
    expect(unitBSCMainnet.chainId).toBe(SupportedChainId.BSC);
  })
});
