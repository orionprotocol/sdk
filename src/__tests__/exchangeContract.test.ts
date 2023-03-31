import { ethers } from 'ethers';
import Orion from '../Orion/index.js';

const privateKey = process.env['PRIVATE_KEY'];
if (privateKey === undefined) throw new Error('Private key is required');

jest.setTimeout(30000);

describe('Transfers', () => {
  test('Deposit ORN', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    await bscUnit.exchange.deposit({
      asset: 'ORN',
      amount: 20,
      signer: wallet,
    });
  });

  test('Withdraw ORN', async () => {
    const orion = new Orion('testing');
    const bscUnit = orion.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      bscUnit.provider
    );

    await bscUnit.exchange.withdraw({
      asset: 'ORN',
      amount: 20,
      signer: wallet,
    });
  });
});
