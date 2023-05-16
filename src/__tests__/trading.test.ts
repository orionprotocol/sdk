import { ethers } from 'ethers';
import Orion from '../Orion/index.js';
import swapMarket from '../Unit/Exchange/swapMarket.js';

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
      unit: bscUnit,
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

    const resultExactSpend = await bscUnit.exchange.swapMarket({
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
    await resultExactSpend.wait();

    const resultExactReceive = await bscUnit.exchange.swapMarket({
      assetIn: 'BNB',
      assetOut: 'BTC',
      amount: resultExactSpend.amountOut.toPrecision(3),
      type: 'exactSpend',
      signer: wallet,
      feeAsset: 'USDT',
      slippagePercent: 1,
      options: {
        logger: console.log
      }
    });
    await resultExactReceive.wait();

    // Return back to USDT
    const returnBackUsdt = await bscUnit.exchange.swapMarket({
      amount: 40,
      assetIn: 'BTC',
      assetOut: 'USDT',
      type: 'exactReceive',
      signer: wallet,
      feeAsset: 'USDT',
      slippagePercent: 1,
    });
    await returnBackUsdt.wait();
  });
});
