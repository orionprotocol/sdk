import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

/**
 * Converts normalized blockchain ("machine-readable") number to denormalized ("human-readable") number.
 * @param input Any blockchain-normalized numeric value
 * @param decimals Blockchain asset precision
 * @returns BigNumber
 */
export default function denormalizeNumber(input: ethers.BigNumber, decimals: BigNumber.Value) {
  const decimalsBN = new BigNumber(decimals);
  if (!decimalsBN.isInteger()) throw new Error(`Decimals '${decimals}' is not an integer`);
  return new BigNumber(input.toString()).div(new BigNumber(10).pow(decimalsBN));
}
