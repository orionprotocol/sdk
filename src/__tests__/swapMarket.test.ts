import { Wallet } from 'ethers';
import initOrionUnit from '../initOrionUnit';
import OrionUnit from '../OrionUnit';

let wallet: Wallet;
let orionUnit: OrionUnit;

jest.setTimeout(15000);
beforeAll(() => {
  orionUnit = initOrionUnit('0x61', 'testing');
  if(!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY env variable is not defined');
  wallet = new Wallet(process.env.PRIVATE_KEY)
});

describe('Swap market', () => {

  test('Too low amount', async () => {
    expect(orionUnit.exchange.swapMarket({
      amount: 0.00001,
      signer: wallet,
      type: 'exactReceive',
      assetIn: 'ORN',
      assetOut: 'USDT',
      feeAsset: 'USDT',
      slippagePercent: 1
    })).rejects.toThrowError(/^Amount is too low/);
  });

   test('Swap STEVE -> JOBS', async () => {
    const swap = await orionUnit.exchange.swapMarket({
      amount: 100,
      signer: wallet,
      type: 'exactReceive',
      assetIn: 'STEVE',
      assetOut: 'JOBS',
      feeAsset: 'USDT',
      slippagePercent: 1
    });
     expect(swap).toBeDefined();
   });
  
  test('Swap empty assetIn', async () => {
     return expect(orionUnit.exchange.swapMarket({
      amount: 100,
      signer: wallet,
      type: 'exactReceive',
      assetIn: '',
      assetOut: 'JOBS',
      feeAsset: 'USDT',
      slippagePercent: 1
    })).rejects.toThrowError('AssetIn can not be empty');
  });
});

export {};
