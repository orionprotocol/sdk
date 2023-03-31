import { ethers } from 'ethers';
import Orion from '../Orion/index.js';

const privateKey = process.env['PRIVATE_KEY']
if (privateKey === undefined) throw new Error('Private key is required');

jest.setTimeout(30000);

describe('Pools', () => {
  test('Add liquidity ORN', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    await bscUnit.farmingManager.addLiquidity({
      amountAsset: 'ORN',
      poolName: 'ORN-USDT',
      amount: 20,
      signer: wallet,
    });
  });

  test('Remove liquidity ORN', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    await bscUnit.farmingManager.removeAllLiquidity({
      poolName: 'ORN-USDT',
      signer: wallet,
    });
  });
});
