import Orion from '../Orion';

describe('Orion Aggregator', () => {
  test('Handle error', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc')

    let subId: string;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bscUnit.orionAggregator.ws.unsubscribe(subId);
        bscUnit.orionAggregator.ws.destroy()
        reject(new Error('Timeout'));
      }, 10000);
      // bscUnit.orionAggregator.ws.onError = console.error;
      const payload = 'adsv-sdfb';
      subId = bscUnit.orionAggregator.ws.subscribe('aus', {
        payload,
        callback: () => null,
        errorCb: (message) => {
          expect(message).toContain(`Address '${payload}' is not hexadecimal`);
          clearTimeout(timeout);
          bscUnit.orionAggregator.ws.destroy()
          resolve(true);
        }
      })
    });
  });
});
