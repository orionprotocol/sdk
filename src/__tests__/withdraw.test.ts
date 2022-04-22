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

describe('Withdraw', () => {

  test('Withdraw 0.00001 ORN', () => {
    return expect(orionUnit.exchange.withdraw({
      amount: 0.00001,
      asset: 'ORN',
      signer: wallet,
    })).resolves.toBeUndefined();
  });

});

export {};
