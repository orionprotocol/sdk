import { BigNumber } from 'bignumber.js';
import { FILL_ORDERS_GAS_LIMIT } from '../constants/index.js';
import calculateNetworkFeeInFeeAsset from './calculateNetworkFeeInFeeAsset.js';
import calculateServiceFeeInFeeAsset from './calculateServiceFeeInFeeAsset.js';

const calculateFeeInFeeAsset = (
  amount: BigNumber.Value,
  gasPriceGwei: BigNumber.Value,
  feePercent: BigNumber.Value,
  baseAssetAddress: string,
  baseCurrencyAddress: string,
  feeAssetAddress: string,
  prices: Partial<Record<string, string>>,
) => {
  const feeAssetPrice = prices[feeAssetAddress];
  if (feeAssetPrice === undefined) throw Error(`Fee asset price not found. Available prices: ${Object.keys(prices).join(', ')}`);
  const baseAssetPrice = prices[baseAssetAddress];
  if (baseAssetPrice === undefined) throw Error(`Base asset price not found. Available prices: ${Object.keys(prices).join(', ')}`);
  const baseCurrencyPrice = prices[baseCurrencyAddress]; // ETH, BNB, MATIC, etc.
  if (baseCurrencyPrice === undefined) throw Error(`Base currency price not found. Available prices: ${Object.keys(prices).join(', ')}`);

  const serviceFeeInFeeAsset = calculateServiceFeeInFeeAsset(
    amount,
    baseAssetAddress,
    feeAssetAddress,
    feePercent,
    prices,
  );
  const networkFeeInFeeAsset = calculateNetworkFeeInFeeAsset(
    gasPriceGwei,
    FILL_ORDERS_GAS_LIMIT,
    baseCurrencyAddress,
    feeAssetAddress,
    prices,
  );

  return {
    serviceFeeInFeeAsset,
    networkFeeInFeeAsset,
    totalFeeInFeeAsset: new BigNumber(serviceFeeInFeeAsset)
      .plus(networkFeeInFeeAsset)
      .toString(),
  };
};

export default calculateFeeInFeeAsset;
