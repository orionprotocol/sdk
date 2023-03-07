import Orion from '../Orion';

describe('Price Feed', () => {
  test('Ticker', async () => {
    const { unitsArray } = new Orion('testing');
    for (const unit of unitsArray) {
      const ticker = 'ORN-USDT';
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout'));
        }, 10000);
        console.log('Subscribing to ticker: ', ticker, ' on network: ', unit.networkCode);
        const { unsubscribe } = unit.priceFeed.ws.subscribe('ticker', {
          payload: ticker,
          callback: () => {
            clearTimeout(timeout);
            unsubscribe()
            resolve(true);
          },
        });
      });
    }
  });

  test('Handle error', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc')

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);
      const { unsubscribe } = bscUnit.priceFeed.ws.subscribe('ticker', {
        payload: 'SGERGEWRGWERG',
        callback: () => null,
        errorCallback: (error) => {
          expect(error.message).toContain('Can\'t recognize PriceFeed "ticker" subscription message "{"message":"Wrong pair"}"')
          clearTimeout(timeout);
          unsubscribe()
          resolve(true);
        }
      })
    });
  });
});
