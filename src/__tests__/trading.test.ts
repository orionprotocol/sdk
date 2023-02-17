import { ethers } from 'ethers';
import Orion from '../Orion';
import swapMarket from '../OrionUnit/Exchange/swapMarket';

const privateKey = process.env['PRIVATE_KEY']
if (privateKey === undefined) throw new Error('Private key is required');

jest.setTimeout(240000);

describe('Spot trading', () => {
  test('Sell. Simple', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    const result = await swapMarket({
      assetIn: 'ORN',
      assetOut: 'USDT',
      amount: 20,
      type: 'exactSpend',
      signer: wallet,
      feeAsset: 'USDT',
      orionUnit: bscUnit,
      slippagePercent: 1,
      // options: {
      //   logger: console.log
      // }
    })
    await result.wait();
  });

  test('Buy. Simple', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    const result = await bscUnit.exchange.swapMarket({
      assetIn: 'USDT',
      assetOut: 'ORN',
      amount: 20,
      type: 'exactReceive',
      signer: wallet,
      feeAsset: 'USDT',
      slippagePercent: 1,
      // options: {
      //   logger: console.log
      // }
    })
    await result.wait();
  });

  test('Buy. Complex', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    const result = await bscUnit.exchange.swapMarket({
      assetIn: 'USDT',
      assetOut: 'BNB',
      amount: 40,
      type: 'exactSpend',
      signer: wallet,
      feeAsset: 'USDT',
      slippagePercent: 1,
      // options: {
      //   logger: console.log
      // }
    })
    await result.wait();
  });

  test('Sell. Complex', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    const result = await bscUnit.exchange.swapMarket({
      assetIn: 'BNB',
      assetOut: 'ETH',
      amount: 0.01,
      type: 'exactReceive',
      signer: wallet,
      feeAsset: 'USDT',
      slippagePercent: 1,
      // options: {
      //   logger: console.log
      // }
    });
    await result.wait();
  });
});
