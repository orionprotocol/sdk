import { BigNumber } from 'bignumber.js';

/**
 * Converts normalized blockchain ("machine-readable") number to denormalized ("human-readable") number.
 * @param input Any blockchain-normalized numeric value
 * @param decimals Blockchain asset precision
 * @returns BigNumber
 */
export default function denormalizeNumber(input: bigint, decimals: bigint) {
  const decimalsBN = new BigNumber(decimals.toString());
  if (!decimalsBN.isInteger()) throw new Error(`Decimals '${decimalsBN.toString()}' is not an integer`);
  return new BigNumber(input.toString()).div(new BigNumber(10).pow(decimalsBN));
}
