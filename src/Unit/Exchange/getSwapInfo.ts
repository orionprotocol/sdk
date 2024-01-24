import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';
import { NATIVE_CURRENCY_PRECISION, SWAP_THROUGH_ORION_POOL_GAS_LIMIT } from '../../constants/index.js';
import type { Aggregator } from '../../services/Aggregator/index.js';
import type { BlockchainService } from '../../services/BlockchainService/index.js';

import { calculateFeeInFeeAsset, denormalizeNumber, getNativeCryptocurrencyName } from '../../utils/index.js';

export type GetSwapInfoParams = {
  type: 'exactSpend' | 'exactReceive'
  assetIn: string
  assetOut: string
  amount: BigNumber.Value
  feeAsset: string
  blockchainService: BlockchainService
  aggregator: Aggregator
  options?: {
    instantSettlement?: boolean
    poolOnly?: boolean
  },
  walletAddress?: string,
}

export default async function getSwapInfo({
  type,
  assetIn,
  assetOut,
  amount,
  feeAsset,
  blockchainService,
  aggregator,
  options,
  walletAddress,
}: GetSwapInfoParams) {
  if (amount === '') throw new Error('Amount can not be empty');
  if (assetIn === '') throw new Error('AssetIn can not be empty');
  if (assetOut === '') throw new Error('AssetOut can not be empty');
  if (feeAsset === '') throw new Error('Fee asset can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const {
    assetToAddress,
  } = await simpleFetch(blockchainService.getInfo)();
  const nativeCryptocurrencyName = getNativeCryptocurrencyName(assetToAddress);

  const feeAssets = await simpleFetch(blockchainService.getPlatformFees)({ walletAddress, assetIn, assetOut });
  const allPrices = await simpleFetch(blockchainService.getPricesWithQuoteAsset)();
  const gasPriceWei = await simpleFetch(blockchainService.getGasPriceWei)();

  const gasPriceGwei = ethers.formatUnits(gasPriceWei, 'gwei').toString();

  const assetInAddress = assetToAddress[assetIn];
  if (assetInAddress === undefined) throw new Error(`Asset '${assetIn}' not found`);
  const feeAssetAddress = assetToAddress[feeAsset];
  if (feeAssetAddress === undefined) {
    throw new Error(`Fee asset '${feeAsset}' not found. Available assets: ${Object.keys(feeAssets).join(', ')}`);
  }

  const swapInfo = await simpleFetch(aggregator.getSwapInfo)(
    type,
    assetIn,
    assetOut,
    amountBN.toString(),
    options?.instantSettlement,
    options?.poolOnly !== undefined && options.poolOnly
      ? 'pools'
      : undefined,
  );

  const { exchanges: swapExchanges } = swapInfo;
  const { factories } = await simpleFetch(blockchainService.getPoolsConfig)();
  const poolExchangesList = factories !== undefined ? Object.keys(factories) : [];
  const [firstSwapExchange] = swapExchanges;

  // if (swapInfo.type === 'exactReceive' && amountBN.lt(swapInfo.minAmountOut)) {
  //   throw new Error(`Amount is too low. Min amountOut is ${swapInfo.minAmountOut} ${assetOut}`);
  // }

  // if (swapInfo.type === 'exactSpend' && amountBN.lt(swapInfo.minAmountIn)) {
  //   throw new Error(`Amount is too low. Min amountIn is ${swapInfo.minAmountIn} ${assetIn}`);
  // }

  // if (swapInfo.orderInfo === null) throw new Error(swapInfo.executionInfo);

  let route: 'pool' | 'aggregator';
  if (options?.poolOnly !== undefined && options.poolOnly) {
    route = 'pool';
  } else if (
    poolExchangesList.length > 0 &&
    swapExchanges.length === 1 &&
    firstSwapExchange !== undefined &&
    poolExchangesList.some((poolExchange) => poolExchange === firstSwapExchange)
  ) {
    route = 'pool';
  } else {
    route = 'aggregator';
  }

  if (route === 'pool') {
    const transactionCost = BigInt(SWAP_THROUGH_ORION_POOL_GAS_LIMIT) * BigInt(gasPriceWei);
    const denormalizedTransactionCost = denormalizeNumber(transactionCost, BigInt(NATIVE_CURRENCY_PRECISION));

    return {
      route,
      swapInfo,
      fee: {
        assetName: nativeCryptocurrencyName,
        assetAddress: ethers.ZeroAddress,
        networkFeeInFeeAsset: denormalizedTransactionCost.toString(),
        protocolFeeInFeeAsset: undefined,
      },
    };
  }

  if (swapInfo.orderInfo !== null) {
    const [baseAssetName] = swapInfo.orderInfo.assetPair.split('-');
    if (baseAssetName === undefined) throw new Error('Base asset name is undefined');
    const baseAssetAddress = assetToAddress[baseAssetName];
    if (baseAssetAddress === undefined) throw new Error(`No asset address for ${baseAssetName}`);

    // Fee calculation
    const feePercent = feeAssets[feeAsset];
    if (feePercent === undefined) throw new Error(`Fee asset ${feeAsset} not available`);

    const {
      serviceFeeInFeeAsset,
      networkFeeInFeeAsset,
    } = calculateFeeInFeeAsset(
      swapInfo.orderInfo.amount,
      gasPriceGwei,
      feePercent,
      baseAssetAddress,
      ethers.ZeroAddress,
      feeAssetAddress,
      allPrices.prices
    );

    return {
      route,
      swapInfo,
      fee: {
        assetName: feeAsset,
        assetAddress: feeAssetAddress,
        networkFeeInFeeAsset,
        protocolFeeInFeeAsset: serviceFeeInFeeAsset,
      },
    };
  }

  return {
    route,
    swapInfo,
    fee: {
      assetName: feeAsset,
      assetAddress: feeAssetAddress,
      networkFeeInFeeAsset: undefined,
      protocolFeeInFeeAsset: undefined,
    },
  };
}
