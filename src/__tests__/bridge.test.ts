import { Wallet } from 'ethers';
import Orion from '../Orion/index.js';
import { SupportedChainId } from '../types.js';

const privateKey = process.env['PRIVATE_KEY']
if (privateKey === undefined) throw new Error('Private key is required');

jest.setTimeout(30000);

describe('Bridge', () => {
  test('Execution', async () => {
    const orion = new Orion('testing');
    const wallet = new Wallet(privateKey);

    await orion.bridge.swap(
      'ORN',
      0.12345678,
      SupportedChainId.FANTOM_TESTNET,
      SupportedChainId.BSC_TESTNET,
      wallet,
      {
        autoApprove: true,
        logger: console.log,
        withdrawToWallet: true,
      },
    );
  });
});
