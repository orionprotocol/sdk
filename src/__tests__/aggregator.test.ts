import { WebSocket } from 'ws';
import Orion from '../Orion/index.js';
import { v4 as uuidV4 } from 'uuid';

jest.setTimeout(50000);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Aggregator', () => {
  test('Handle error aus', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc')

    let subId: string;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bscUnit.aggregator.ws.unsubscribe(subId);
        bscUnit.aggregator.ws.destroy()
        reject(new Error('Timeout'));
      }, 10000);
      // bscUnit.aggregator.ws.onError = console.error;
      const payload = 'adsv-sdfb';
      subId = bscUnit.aggregator.ws.subscribe('aus', {
        payload,
        callback: () => null,
        errorCb: (message) => {
          expect(message).toContain(`Address '${payload}' is not hexadecimal`);
          clearTimeout(timeout);
          bscUnit.aggregator.ws.destroy()
          resolve(true);
        }
      })
    });
  });

  test('Handle error aobus', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc')

    let subId: string;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bscUnit.aggregator.ws.unsubscribe(subId);
        bscUnit.aggregator.ws.destroy()
        reject(new Error('Timeout'));
      }, 5000);
      const payload = 'BTCUSDF';
      subId = bscUnit.aggregator.ws.subscribe('aobus', {
        payload,
        callback: () => null,
        errorCb: (message) => {
          console.log(message);
          clearTimeout(timeout);
          bscUnit.aggregator.ws.destroy()
          resolve(true);
        }
      })
    });
  });

  test('Breaking connection', async () => {
    const WS_PORT = 8080;
    const wsServer = new WebSocket.Server({ port: WS_PORT });

    wsServer.on('connection', (ws) => {
      ws.on('message', (message) => { // message type — Buffer | ArrayBuffer | Buffer[]
        // Parse message json
        const parsedMessage = JSON.parse(message.toString());
        console.log('CLIENT -> SERVER', parsedMessage);

        // Respond

        ws.send(JSON.stringify({
          S: 'BTCUSDF',
          ob: {
            a: [
              ['26287.4', '2.6', ['BINANCE'], [['BUY', 'BTCUSDF']]],
              ['26287.3', '0.172', ['BINANCE'], [['BUY', 'BTCUSDF']]],
              ['26287.2', '2.33', ['BINANCE'], [['BUY', 'BTCUSDF']]],
              ['26287.1', '0.746', ['BINANCE'], [['BUY', 'BTCUSDF']]],
              ['26287', '2.635', ['BINANCE'], [['BUY', 'BTCUSDF']]],
            ],
            b: [
              ['26276.7', '13.397', ['BINANCE'], [['SELL', 'BTCUSDF']]],
              ['26276.6', '0.003', ['BINANCE'], [['SELL', 'BTCUSDF']]],
              ['26276.5', '0.023', ['BINANCE'], [['SELL', 'BTCUSDF']]],
              ['26276.4', '0.001', ['BINANCE'], [['SELL', 'BTCUSDF']]],
              ['26276.3', '2.334', ['BINANCE'], [['SELL', 'BTCUSDF']]],
            ]
          },
          T: 'aobu',
          _: 1684941717661
        }));
      })

      // ws.on('close', () => {
      //   console.log('Connection closed');
      // })

      ws.on('error', (error) => {
        console.log('Error', error);
      })

      // Send initial message
      ws.send(JSON.stringify({
        T: 'i',
        i: uuidV4(),
        _: 1684941718016
      }));
    })

    const orion = new Orion('testing', {
      networks: {
        97: {
          services: {
            aggregator: {
              ws: `ws://localhost:${WS_PORT}`
            }
          }
        }
      }
    });

    const bscUnit = orion.getUnit('bsc');

    let subId: string | undefined;

    // Make subscription and wait for response
    await new Promise((resolve) => {
      subId = bscUnit.aggregator.ws.subscribe('aobus', {
        payload: 'BTCUSDF',
        callback: () => {
          console.log('Received data');
          resolve(true);
        }
      });
    })

    const terminateAllClients = () => Promise.all(Array.from(wsServer.clients).map((client) => {
      return new Promise((resolve) => {
        client.on('close', resolve);
        client.terminate();
      });
    }));

    // Disconnect client from server
    await terminateAllClients();
    console.log('Disconnected', bscUnit.aggregator.ws.subscriptions);

    expect(wsServer.clients.size).toEqual(0);
    await delay(1000);
    expect(bscUnit.aggregator.ws.subscriptions).toEqual({});

    // Await for reconnection
    await new Promise((resolve) => {
      bscUnit.aggregator.ws.subscribe('aobus', {
        payload: 'BTCUSDF',
        callback: () => {
          console.log('Reconnected', bscUnit.aggregator.ws.subscriptions);
          resolve(true);
        }
      });
    });

    await new Promise((resolve) => {
      if (subId !== undefined) bscUnit.aggregator.ws.unsubscribe(subId);
      bscUnit.aggregator.ws.destroy()
      wsServer.clients.forEach((client) => {
        client.terminate();
      });
      wsServer.close(() => {
        resolve(true);
      });
    })
  });
});
