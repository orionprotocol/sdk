import { Exchange__factory, IUniswapV2Pair__factory, IUniswapV2Router__factory } from '@orionprotocol/contracts/lib/ethers-v6/index.js';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';
import type Unit from '../index.js';
import BalanceGuard from '../../BalanceGuard.js';
import { ADD_LIQUIDITY_GAS_LIMIT, INTERNAL_PROTOCOL_PRECISION, NATIVE_CURRENCY_PRECISION } from '../../constants/index.js';
import { denormalizeNumber, normalizeNumber } from '../../utils/index.js';
import getBalances from '../../utils/getBalances.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';

const ADD_LIQUIDITY_SLIPPAGE = 0.05;

export type AddLiquidityParams = {
  poolName: string
  amountAsset: string
  amount: BigNumber.Value
  signer: ethers.Signer
}

export type RemoveAllLiquidityParams = {
  poolName: string
  signer: ethers.Signer
}

export default class FarmingManager {
  private readonly unit: Unit;

  constructor(unit: Unit) {
    this.unit = unit;
  }

  public async addLiquidity({
    poolName,
    amountAsset,
    amount,
    signer,
  }: AddLiquidityParams) {
    const amountBN = new BigNumber(amount);
    if (amountBN.isNaN()) throw new Error('Invalid amount');
    if (amountBN.lte(0)) throw new Error('Amount must be greater than 0');
    if (!poolName.includes('-')) throw new Error('Pool name must be in the format of "assetA-AssetB"');
    const [assetA, assetB] = poolName.split('-');
    if (assetA === undefined) throw new Error('Asset A undefined');
    if (assetB === undefined) throw new Error('Asset B undefined');
    if (amountAsset !== assetA && amountAsset !== assetB) throw new Error('Amount asset must be either assetA or assetB');

    const {
      exchangeContractAddress,
      assetToAddress,
      assetToDecimals,
    } = await simpleFetch(this.unit.blockchainService.getInfo)();

    const walletAddress = await signer.getAddress();

    const exchangeContract = Exchange__factory
      .connect(exchangeContractAddress, this.unit.provider);

    const assetAAddress = assetToAddress[assetA];
    if (assetAAddress === undefined) throw new Error(`Asset '${assetA}' not found`);
    const assetBAddress = assetToAddress[assetB];
    if (assetBAddress === undefined) throw new Error(`Asset '${assetB}' not found`);

    const assetADecimals = assetToDecimals[assetA];
    if (assetADecimals === undefined) throw new Error(`Decimals for asset '${assetA}' not found`);
    const assetBDecimals = assetToDecimals[assetB];
    if (assetBDecimals === undefined) throw new Error(`Decimals for asset '${assetB}' not found`);

    const nativeCryptocurrency = getNativeCryptocurrencyName(assetToAddress);
    const balances = await getBalances(
      {
        [assetA]: assetAAddress,
        [assetB]: assetBAddress,
        [nativeCryptocurrency]: ethers.ZeroAddress,
      },
      this.unit.aggregator,
      walletAddress,
      exchangeContract,
      this.unit.provider,
    );
    const balanceGuard = new BalanceGuard(
      balances,
      {
        address: ethers.ZeroAddress,
        name: nativeCryptocurrency,
      },
      this.unit.provider,
      signer,
    );

    const poolsConfig = await simpleFetch(this.unit.blockchainService.getPoolsConfig)();
    const pool = poolsConfig.pools[poolName];
    if (!pool) throw new Error(`Pool ${poolName} not found`);

    const pairContract = IUniswapV2Pair__factory
      .connect(pool.lpTokenAddress, this.unit.provider);
    const routerContract = IUniswapV2Router__factory
      .connect(poolsConfig.routerAddress, this.unit.provider);

    let pairTokensIsInversed = false;
    const token0 = await pairContract.token0();
    const wrappedNativeAddress = await routerContract.WETH();

    // const token1 = await pairContract.token1();
    if (token0.toLowerCase() !== wrappedNativeAddress.toLowerCase()) pairTokensIsInversed = true;

    const { _reserve0, _reserve1 } = await pairContract.getReserves();

    const assetAReserve = pairTokensIsInversed ? _reserve1 : _reserve0;
    const assetBReserve = pairTokensIsInversed ? _reserve0 : _reserve1;

    const denormalizedAssetAReserve = denormalizeNumber(assetAReserve, BigInt(assetADecimals));
    const denormalizedAssetBReserve = denormalizeNumber(assetBReserve, BigInt(assetBDecimals));

    const price = denormalizedAssetBReserve.div(denormalizedAssetAReserve);

    const assetAIsNativeCurrency = assetAAddress === ethers.ZeroAddress;
    const assetBIsNativeCurrency = assetBAddress === ethers.ZeroAddress;

    const assetAAmount = assetA === amountAsset ? amountBN : amountBN.div(price);
    const assetBAmount = assetA === amountAsset ? amountBN.multipliedBy(price) : amountBN;

    const assetAAmountWithSlippage = assetAAmount.multipliedBy(1 - ADD_LIQUIDITY_SLIPPAGE);
    const assetBAmountWithSlippage = assetBAmount.multipliedBy(1 - ADD_LIQUIDITY_SLIPPAGE);

    balanceGuard.registerRequirement({
      reason: `${assetA} liquidity`,
      amount: assetAAmount.toString(),
      asset: {
        name: assetA,
        address: assetAAddress,
      },
      spenderAddress: exchangeContractAddress,
      sources: ['exchange', 'wallet'],
    });

    balanceGuard.registerRequirement({
      reason: `${assetB} liquidity`,
      amount: assetBAmount.toString(),
      asset: {
        name: assetB,
        address: assetBAddress,
      },
      spenderAddress: exchangeContractAddress,
      sources: ['exchange', 'wallet'],
    });

    const unsignedTx = await exchangeContract.withdrawToPool.populateTransaction(
      assetBIsNativeCurrency ? assetBAddress : assetAAddress,
      assetBIsNativeCurrency ? assetAAddress : assetBAddress,
      assetBIsNativeCurrency
        ? normalizeNumber(assetBAmount, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString()
        : normalizeNumber(assetAAmount, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString(),
      assetBIsNativeCurrency
        ? normalizeNumber(assetAAmount, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString()
        : normalizeNumber(assetBAmount, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString(),
      assetBIsNativeCurrency
        ? normalizeNumber(assetBAmountWithSlippage, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString()
        : normalizeNumber(assetAAmountWithSlippage, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString(),
      assetBIsNativeCurrency
        ? normalizeNumber(assetAAmountWithSlippage, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString()
        : normalizeNumber(assetBAmountWithSlippage, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString(),
    );

    const { gasPrice, maxFeePerGas } = await this.unit.provider.getFeeData();

    const transactionCost = BigInt(ADD_LIQUIDITY_GAS_LIMIT) * (gasPrice ?? 0n);
    const denormalizedTransactionCost = denormalizeNumber(transactionCost, BigInt(NATIVE_CURRENCY_PRECISION));

    balanceGuard.registerRequirement({
      reason: 'Network fee',
      asset: {
        name: nativeCryptocurrency,
        address: ethers.ZeroAddress,
      },
      amount: denormalizedTransactionCost.toString(),
      sources: ['wallet'],
    });

    const nonce = await this.unit.provider.getTransactionCount(walletAddress, 'pending');

    const network = await this.unit.provider.getNetwork();

    if (assetAIsNativeCurrency || assetBIsNativeCurrency) {
      const contractBalance = balances[nativeCryptocurrency]?.exchange;
      if (!contractBalance) throw new Error(`No balance for '${nativeCryptocurrency}'`);
      const nativeAssetAmount = assetBIsNativeCurrency ? assetBAmount : assetAAmount;

      if (nativeAssetAmount.gt(contractBalance)) {
        unsignedTx.value = normalizeNumber(
          nativeAssetAmount.minus(contractBalance),
          NATIVE_CURRENCY_PRECISION,
          BigNumber.ROUND_CEIL,
        );
      }
    }

    if (gasPrice !== null && maxFeePerGas !== null) {
      unsignedTx.gasPrice = gasPrice;
      unsignedTx.maxFeePerGas = maxFeePerGas;
    }
    unsignedTx.chainId = network.chainId;
    unsignedTx.nonce = nonce;
    unsignedTx.from = walletAddress;
    const gasLimit = await this.unit.provider.estimateGas(unsignedTx);
    unsignedTx.gasLimit = gasLimit;

    await balanceGuard.check(true);

    const signedTx = await signer.signTransaction(unsignedTx);
    const txResponse = await this.unit.provider.broadcastTransaction(signedTx);
    console.log(`Add liquidity tx sent: ${txResponse.hash}. Waiting for confirmation...`);
    const txReceipt = await txResponse.wait();
    if (txReceipt?.status === 1) {
      console.log(`Add liquidity tx confirmed: ${txReceipt.hash}`);
    } else {
      console.log(`Add liquidity tx failed: ${txReceipt?.hash}`);
    }
  }

  public async removeAllLiquidity({
    poolName,
    signer,
  }: RemoveAllLiquidityParams) {
    if (!poolName.includes('-')) throw new Error('Pool name must be in the format of "assetA-AssetB"');
    const [assetA, assetB] = poolName.split('-');
    if (assetA === undefined) throw new Error('Asset A is not defined');
    if (assetB === undefined) throw new Error('Asset B is not defined');

    const {
      assetToAddress,
      assetToDecimals,
      exchangeContractAddress,
    } = await simpleFetch(this.unit.blockchainService.getInfo)();

    const assetAAddress = assetToAddress[assetA];
    if (assetAAddress === undefined) throw new Error(`Asset '${assetA}' not found`);
    const assetBAddress = assetToAddress[assetB];
    if (assetBAddress === undefined) throw new Error(`Asset '${assetB}' not found`);

    const assetADecimals = assetToDecimals[assetA];
    if (assetADecimals === undefined) throw new Error(`Decimals for asset '${assetA}' not found`);
    const assetBDecimals = assetToDecimals[assetB];
    if (assetBDecimals === undefined) throw new Error(`Decimals for asset '${assetB}' not found`);

    const poolsConfig = await simpleFetch(this.unit.blockchainService.getPoolsConfig)();
    const pool = poolsConfig.pools[poolName];
    if (!pool) throw new Error(`Pool ${poolName} not found`);

    const walletAddress = await signer.getAddress();

    const exchangeContract = Exchange__factory
      .connect(exchangeContractAddress, this.unit.provider);
    const nativeCryptocurrency = getNativeCryptocurrencyName(assetToAddress);
    const balances = await getBalances(
      {
        [assetA]: assetAAddress,
        [assetB]: assetBAddress,
        [`${poolName} LP Token`]: pool.lpTokenAddress,
        [nativeCryptocurrency]: ethers.ZeroAddress,
      },
      this.unit.aggregator,
      walletAddress,
      exchangeContract,
      this.unit.provider,
    );

    const balanceGuard = new BalanceGuard(
      balances,
      {
        address: ethers.ZeroAddress,
        name: nativeCryptocurrency,
      },
      this.unit.provider,
      signer,
    );

    const pairContract = IUniswapV2Pair__factory
      .connect(pool.lpTokenAddress, this.unit.provider);

    const { _reserve0, _reserve1 } = await pairContract.getReserves();

    const routerContract = IUniswapV2Router__factory
      .connect(poolsConfig.routerAddress, this.unit.provider);

    let pairTokensIsInversed = false;

    const lpTokenUserBalance = await pairContract.balanceOf(walletAddress);
    const lpTokenDecimals = await pairContract.decimals();

    const token0 = await pairContract.token0();
    const totalSupply = await pairContract.totalSupply();
    const wrappedNativeAddress = await routerContract.WETH();
    if (token0.toLowerCase() !== wrappedNativeAddress.toLowerCase()) pairTokensIsInversed = true;

    const denormalizedLpTokenUserBalance = denormalizeNumber(lpTokenUserBalance, lpTokenDecimals);
    const denormalizedLpTokenSupply = denormalizeNumber(totalSupply, lpTokenDecimals);

    const userShare = denormalizedLpTokenUserBalance.div(denormalizedLpTokenSupply);

    const assetAReserve = pairTokensIsInversed ? _reserve1 : _reserve0;
    const assetBReserve = pairTokensIsInversed ? _reserve0 : _reserve1;

    const denormalizedAssetAReserve = denormalizeNumber(assetAReserve, BigInt(assetADecimals));
    const denormalizedAssetBReserve = denormalizeNumber(assetBReserve, BigInt(assetBDecimals));

    const denormalizedUserPooledAssetA = denormalizedAssetAReserve.multipliedBy(userShare);
    const denormalizedUserPooledAssetB = denormalizedAssetBReserve.multipliedBy(userShare);

    const denormalizedUserPooledAssetAWithSlippage = denormalizedUserPooledAssetA.multipliedBy(1 - ADD_LIQUIDITY_SLIPPAGE);
    const denormalizedUserPooledAssetBWithSlippage = denormalizedUserPooledAssetB.multipliedBy(1 - ADD_LIQUIDITY_SLIPPAGE);

    const assetAIsNativeCurrency = assetAAddress === ethers.ZeroAddress;
    const assetBIsNativeCurrency = assetBAddress === ethers.ZeroAddress;

    balanceGuard.registerRequirement({
      reason: `${poolName} liquidity`,
      asset: {
        name: `${poolName} LP Token`,
        address: pool.lpTokenAddress,
      },
      spenderAddress: poolsConfig.routerAddress,
      amount: denormalizedLpTokenUserBalance.toString(),
      sources: ['wallet'],
    });

    let unsignedTx: ethers.TransactionLike;
    if (assetAIsNativeCurrency || assetBIsNativeCurrency) {
      unsignedTx = await routerContract.removeLiquidityETH.populateTransaction(
        assetBIsNativeCurrency ? assetAAddress : assetBAddress, // token
        lpTokenUserBalance,
        assetBIsNativeCurrency
          ? normalizeNumber(
            denormalizedUserPooledAssetAWithSlippage,
            assetADecimals,
            BigNumber.ROUND_FLOOR,
          ).toString()
          : normalizeNumber(
            denormalizedUserPooledAssetBWithSlippage,
            assetBDecimals,
            BigNumber.ROUND_FLOOR,
          ).toString(), // token min
        assetBIsNativeCurrency
          ? normalizeNumber(
            denormalizedUserPooledAssetBWithSlippage,
            assetBDecimals,
            BigNumber.ROUND_FLOOR,
          ).toString()
          : normalizeNumber(
            denormalizedUserPooledAssetAWithSlippage,
            assetADecimals,
            BigNumber.ROUND_FLOOR,
          ).toString(), // eth min
        walletAddress,
        Math.floor(Date.now() / 1000) + 60 * 20,
      );
    } else {
      unsignedTx = await routerContract.removeLiquidity.populateTransaction(
        assetAAddress,
        assetBAddress,
        lpTokenUserBalance,
        normalizeNumber(
          denormalizedUserPooledAssetAWithSlippage,
          assetADecimals,
          BigNumber.ROUND_FLOOR,
        ).toString(),
        normalizeNumber(
          denormalizedUserPooledAssetBWithSlippage,
          assetBDecimals,
          BigNumber.ROUND_FLOOR,
        ).toString(),
        walletAddress,
        Math.floor(Date.now() / 1000) + 60 * 20,
      );
    }

    const { gasPrice } = await this.unit.provider.getFeeData()

    const transactionCost = BigInt(ADD_LIQUIDITY_GAS_LIMIT) * (gasPrice ?? 0n);
    const denormalizedTransactionCost = denormalizeNumber(transactionCost, BigInt(NATIVE_CURRENCY_PRECISION));

    balanceGuard.registerRequirement({
      reason: 'Network fee',
      asset: {
        name: nativeCryptocurrency,
        address: ethers.ZeroAddress,
      },
      amount: denormalizedTransactionCost.toString(),
      sources: ['wallet'],
    });

    await balanceGuard.check(true);
    const nonce = await this.unit.provider.getTransactionCount(walletAddress, 'pending');
    const network = await this.unit.provider.getNetwork();

    unsignedTx.chainId = network.chainId;
    unsignedTx.gasPrice = gasPrice;
    unsignedTx.nonce = nonce;
    unsignedTx.from = walletAddress;
    const gasLimit = await this.unit.provider.estimateGas(unsignedTx);
    unsignedTx.gasLimit = gasLimit;

    const signedTx = await signer.signTransaction(unsignedTx);
    const txResponse = await this.unit.provider.broadcastTransaction(signedTx);
    console.log(`Remove all liquidity tx sent: ${txResponse.hash}. Waiting for confirmation...`);
    const txReceipt = await txResponse.wait();
    if (txReceipt?.status === 1) {
      console.log(`Remove all liquidity tx confirmed: ${txReceipt.hash}`);
    } else {
      console.log(`Remove all liquidity tx failed: ${txReceipt?.hash}`);
    }
  }
}
