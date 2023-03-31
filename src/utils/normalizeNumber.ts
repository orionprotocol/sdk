import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';

/**
 * Converts denormalized ("human-readable") number to normalized ("machine-readable") number.
 * @param input Any numeric value
 * @param decimals Blockchain asset precision
 * @param roundingMode Rounding mode
 * @returns ethers.BigNumber
 */
export default function normalizeNumber(
  input: BigNumber.Value,
  decimals: BigNumber.Value,
  roundingMode: BigNumber.RoundingMode,
) {
  const decimalsBN = new BigNumber(decimals);
  if (!decimalsBN.isInteger()) throw new Error(`Decimals '${decimalsBN.toString()}' is not an integer`);
  const inputBN = new BigNumber(input);
  return ethers.BigNumber.from(
    inputBN
      .multipliedBy(new BigNumber(10).pow(decimals))
      .integerValue(roundingMode)
      .toString(),
  );
}
