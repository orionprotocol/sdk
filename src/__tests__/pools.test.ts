import { ethers } from 'ethers';
import Orion from '../Orion/index.js';
import { SERVICE_TOKEN } from '../index.js';

const privateKey = process.env['PRIVATE_KEY']
if (privateKey === undefined) throw new Error('Private key is required');

jest.setTimeout(30000);

describe('Pools', () => {
  test(`Add liquidity ${SERVICE_TOKEN}`, async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    await bscUnit.farmingManager.addLiquidity({
      amountAsset: SERVICE_TOKEN,
      poolName: `${SERVICE_TOKEN}-USDT`,
      amount: 20,
      signer: wallet,
    });
  });

  test(`Remove liquidity ${SERVICE_TOKEN}`, async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    await bscUnit.farmingManager.removeAllLiquidity({
      poolName: `${SERVICE_TOKEN}-USDT`,
      signer: wallet,
    });
  });
});
