import { Wallet } from 'ethers';
import initOrionUnit from '../initOrionUnit';
import OrionUnit from '../OrionUnit';
import crypto from "crypto";

let wallet: Wallet;
let orionUnit: OrionUnit;

jest.setTimeout(15000);
beforeAll(() => {
  orionUnit = initOrionUnit('0x61', 'testing');
  if(!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY env variable is not defined');
  wallet = new Wallet(process.env.PRIVATE_KEY)
});

describe('Deposit', () => {

  test('Deposit 0.00000001 ORN', () => {
    return expect(orionUnit.exchange.deposit({
      amount: 0.00000001,
      asset: 'ORN',
      signer: wallet,
    })).resolves.toBeUndefined();
  });

   test('Deposit -3 ORN', () => {
     const amount = -3;
    return expect(orionUnit.exchange.deposit({
      amount,
      asset: 'ORN',
      signer: wallet,
    })).rejects.toThrowError(`Amount '${amount.toString()}' should be greater than 0`);
   });
  
  test('Deposit unknown asset', () => {
    const random = crypto.randomBytes(10).toString('hex').toUpperCase();
    console.log(random);
    return expect(orionUnit.exchange.deposit({
      amount: 0.00000001,
      asset: random,
      signer: wallet,
    })).rejects.toThrowError(`Asset '${random}' not found`);
  });
});

export {};
