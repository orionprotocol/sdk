import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v6/index.js';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import getAvailableSources from '../../utils/getAvailableFundsSources.js';
import {
  INTERNAL_PROTOCOL_PRECISION,
  NATIVE_CURRENCY_PRECISION,
  LOCKATOMIC_GAS_LIMIT,
  REDEEMATOMIC_GAS_LIMIT,
  WITHDRAW_GAS_LIMIT
} from '../../constants/index.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';
import { denormalizeNumber, generateSecret, normalizeNumber, toUpperCase } from '../../utils/index.js';
import type { SupportedChainId } from '../../types.js';
import type { z } from 'zod';
import type { placeAtomicSwapSchema } from '../../services/Aggregator/schemas/index.js';
import { simpleFetch } from 'simple-typed-fetch';
import type { Unit } from '../../index.js';

type Params = {
  assetName: string
  amount: BigNumber.Value
  sourceChain: SupportedChainId
  targetChain: SupportedChainId
  signer: ethers.Signer
  unitsArray: Unit[]
  options?: {
    withdrawToWallet?: boolean // By default, the transfer amount remains in the exchange contract
    autoApprove?: boolean
    logger?: (message: string) => void
  }
}

export default async function swap({
  amount,
  assetName,
  sourceChain,
  targetChain,
  signer,
  options,
  unitsArray,
}: Params) {
  const startProcessingTime = Date.now();
  if (amount === '') throw new Error('Amount can not be empty');
  if (assetName === '') throw new Error('AssetIn can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const sourceChainUnit = unitsArray.find(({ chainId }) => chainId === sourceChain);
  const targetChainUnit = unitsArray.find(({ chainId }) => chainId === targetChain);

  if (sourceChainUnit === undefined) throw new Error(`Source chain '${sourceChain}' not found`);
  if (targetChainUnit === undefined) throw new Error(`Target chain '${targetChain}' not found`);

  const {
    blockchainService: sourceBlockchainService,
    aggregator: sourceAggregator,
    provider: sourceProvider,
    chainId,
  } = sourceChainUnit;

  const {
    aggregator: targetAggregator,
    blockchainService: targetBlockchainService,
    provider: targetProvider,
  } = targetChainUnit;

  const sourceSupportedBridgeAssets = await simpleFetch(sourceBlockchainService.getAtomicSwapAssets)();
  const targetSupportedBridgeAssets = await simpleFetch(targetBlockchainService.getAtomicSwapAssets)();

  const commonSupportedBridgeAssets = sourceSupportedBridgeAssets.filter((asset) => targetSupportedBridgeAssets.includes(asset));
  if (!sourceSupportedBridgeAssets.includes(assetName) || !targetSupportedBridgeAssets.includes(assetName)) {
    throw new Error(`Asset '${assetName}' not available for swap between ${sourceChain} and ${targetChain} chains. Available assets: ${commonSupportedBridgeAssets.join(', ')}`);
  }

  const brokersBalances = await new Promise<Partial<Record<string, number>>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Can't get brokers balances. Timeout"));
    }, 10000);
    const id = targetAggregator.ws.subscribe('btasabus', {
      callback: (data) => {
        targetAggregator.ws.unsubscribe(id);
        targetAggregator.ws.destroy();
        clearTimeout(timeout);
        resolve(data);
      }
    })
  })

  const walletAddress = await signer.getAddress();
  options?.logger?.(`Wallet address is ${walletAddress}`);

  const assetBrokersBalance = brokersBalances[assetName];
  if (assetBrokersBalance === undefined) throw new Error(`Asset '${assetName}' not found in brokers balances`);
  if (assetBrokersBalance === 0) throw new Error(`Asset '${assetName}' is not available for swap`);

  const {
    exchangeContractAddress: sourceExchangeContractAddress,
    assetToAddress: sourceAssetToAddress,
  } = await simpleFetch(sourceBlockchainService.getInfo)();

  const sourceChainNativeCryptocurrency = getNativeCryptocurrencyName(sourceAssetToAddress);
  const sourceExchangeContract = Exchange__factory.connect(sourceExchangeContractAddress, sourceProvider);
  // const sourceChainGasPriceWei = await simpleFetch(sourceBlockchainService.getGasPriceWei)();

  const sourceChainAssetAddress = sourceAssetToAddress[assetName];
  if (sourceChainAssetAddress === undefined) throw new Error(`Asset '${assetName}' not found in source chain`);

  const {
    exchangeContractAddress: targetExchangeContractAddress,
    assetToAddress: targetAssetToAddress,
  } = await simpleFetch(targetBlockchainService.getInfo)();

  const targetChainAssetAddress = targetAssetToAddress[assetName];
  if (targetChainAssetAddress === undefined) throw new Error(`Asset '${assetName}' not found in target chain`);
  const targetChainNativeCryptocurrency = getNativeCryptocurrencyName(targetAssetToAddress);
  const targetExchangeContract = Exchange__factory.connect(targetExchangeContractAddress, targetProvider);

  const sourceChainBalances = await getBalances(
    {
      [assetName]: sourceChainAssetAddress,
      [sourceChainNativeCryptocurrency]: ethers.ZeroAddress,
    },
    sourceAggregator,
    walletAddress,
    sourceExchangeContract,
    sourceProvider,
  );

  const targetChainBalances = await getBalances(
    {
      [assetName]: targetChainAssetAddress,
      [targetChainNativeCryptocurrency]: ethers.ZeroAddress,
    },
    targetAggregator,
    walletAddress,
    targetExchangeContract,
    targetProvider,
  );

  const sourceChainBalanceGuard = new BalanceGuard(
    sourceChainBalances,
    {
      name: sourceChainNativeCryptocurrency,
      address: ethers.ZeroAddress,
    },
    sourceProvider,
    signer,
    options?.logger,
  );

  const targetChainBalanceGuard = new BalanceGuard(
    targetChainBalances,
    {
      name: targetChainNativeCryptocurrency,
      address: ethers.ZeroAddress,
    },
    targetProvider,
    signer,
    options?.logger,
  );

  sourceChainBalanceGuard.registerRequirement({
    reason: 'Amount',
    asset: {
      name: assetName,
      address: sourceChainAssetAddress,
    },
    amount: amountBN.toString(),
    spenderAddress: sourceExchangeContractAddress,
    sources: getAvailableSources('amount', sourceChainAssetAddress, 'pool'),
  });

  const amountBlockchainParam = normalizeNumber(
    amount,
    INTERNAL_PROTOCOL_PRECISION,
    BigNumber.ROUND_FLOOR,
  );
  const secret = generateSecret();
  const secretHash = ethers.keccak256(secret);
  options?.logger?.(`Secret is ${secret}`);
  options?.logger?.(`Secret hash is ${secretHash}`);

  const secondsInDay = 60 * 60 * 24;
  const expirationDays = 4;
  const expirationEtherBN = BigInt(
    Date.now() + (secondsInDay * expirationDays * 1000),
  );

  const unsignedLockAtomicTx = await sourceExchangeContract.lockAtomic.populateTransaction({
    amount: amountBlockchainParam,
    asset: sourceChainAssetAddress,
    expiration: expirationEtherBN,
    secretHash,
    sender: walletAddress,
    targetChainId: BigInt(targetChain),
  });

  let sourceChainGasPrice: bigint;
  const sourceChainFeeData = await sourceChainUnit.provider.getFeeData();
  if (sourceChainFeeData.gasPrice !== null) { //
    unsignedLockAtomicTx.gasPrice = sourceChainFeeData.gasPrice;
    sourceChainGasPrice = sourceChainFeeData.gasPrice;
  } else if (
    sourceChainFeeData.maxFeePerGas !== null &&
    sourceChainFeeData.maxPriorityFeePerGas !== null
  ) { // EIP-1559
    unsignedLockAtomicTx.maxFeePerGas = sourceChainFeeData.maxFeePerGas;
    unsignedLockAtomicTx.maxPriorityFeePerGas = sourceChainFeeData.maxPriorityFeePerGas;
    sourceChainGasPrice = sourceChainFeeData.maxFeePerGas;
  } else {
    throw new Error('Can\'t get gas price');
  }

  unsignedLockAtomicTx.chainId = BigInt(chainId);
  unsignedLockAtomicTx.from = walletAddress;

  let value = new BigNumber(0);
  const denormalizedAssetInExchangeBalance = sourceChainBalances[assetName]?.exchange;
  if (denormalizedAssetInExchangeBalance === undefined) throw new Error(`Asset '${assetName}' exchange balance is not found`);
  if (assetName === sourceChainNativeCryptocurrency && amountBN.gt(denormalizedAssetInExchangeBalance)) {
    value = amountBN.minus(denormalizedAssetInExchangeBalance);
  }
  unsignedLockAtomicTx.value = normalizeNumber(
    value.dp(INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_CEIL),
    NATIVE_CURRENCY_PRECISION,
    BigNumber.ROUND_CEIL,
  );
  unsignedLockAtomicTx.gasLimit = BigInt(LOCKATOMIC_GAS_LIMIT);

  const transactionCost = BigInt(LOCKATOMIC_GAS_LIMIT) * sourceChainGasPrice;
  const denormalizedTransactionCost = denormalizeNumber(transactionCost, BigInt(NATIVE_CURRENCY_PRECISION));

  sourceChainBalanceGuard.registerRequirement({
    reason: 'Network fee',
    asset: {
      name: sourceChainNativeCryptocurrency,
      address: ethers.ZeroAddress,
    },
    amount: denormalizedTransactionCost.toString(),
    sources: ['wallet']
  });

  await sourceChainBalanceGuard.check(options?.autoApprove);

  const nonce = await sourceProvider.getTransactionCount(walletAddress, 'pending');
  unsignedLockAtomicTx.nonce = nonce;

  options?.logger?.('Signing lock tx transaction...');
  const signedTransaction = await signer.signTransaction(unsignedLockAtomicTx);
  const lockAtomicTxResponse = await sourceChainUnit.provider.broadcastTransaction(signedTransaction);
  options?.logger?.(`Lock tx sent. Tx hash: ${lockAtomicTxResponse.hash}. Waiting for tx to be mined...`);
  await lockAtomicTxResponse.wait();
  options?.logger?.('Lock tx mined.');
  options?.logger?.('Placing atomic swap...');

  const atomicSwap = await new Promise<z.infer<typeof placeAtomicSwapSchema>>((resolve, reject) => {
    const placeAtomicSwap = () => simpleFetch(targetAggregator.placeAtomicSwap)(
      secretHash,
      toUpperCase(sourceChainUnit.networkCode)
    ).then((data) => {
      clearInterval(interval);
      clearTimeout(timeout);
      resolve(data);
    }).catch(console.error);
    const interval = setInterval(() => {
      placeAtomicSwap().catch(console.error);
    }, 2000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Atomic swap placing timeout'));
    }, 1000 * 60 * 5);
  });

  options?.logger?.('Atomic swap placed.');

  // const targetChainGasPriceWei = await simpleFetch(targetBlockchainService.getGasPriceWei)();
  const unsignedRedeemAtomicTx = await targetExchangeContract.redeemAtomic.populateTransaction(
    {
      amount: amountBlockchainParam,
      asset: targetChainAssetAddress,
      claimReceiver: atomicSwap.redeemOrder.claimReceiver,
      expiration: atomicSwap.redeemOrder.expiration,
      receiver: atomicSwap.redeemOrder.receiver,
      secretHash: atomicSwap.redeemOrder.secretHash,
      sender: atomicSwap.redeemOrder.sender,
      signature: atomicSwap.redeemOrder.signature,
    },
    secret
  )

  let targetChainGasPrice: bigint;
  const targetChainFeeData = await targetChainUnit.provider.getFeeData();
  if (targetChainFeeData.gasPrice !== null) { //
    unsignedRedeemAtomicTx.gasPrice = targetChainFeeData.gasPrice;
    targetChainGasPrice = targetChainFeeData.gasPrice;
  } else if (
    targetChainFeeData.maxFeePerGas !== null &&
      targetChainFeeData.maxPriorityFeePerGas !== null
  ) { // EIP-1559
    unsignedRedeemAtomicTx.maxFeePerGas = targetChainFeeData.maxFeePerGas;
    unsignedRedeemAtomicTx.maxPriorityFeePerGas = targetChainFeeData.maxPriorityFeePerGas;
    targetChainGasPrice = targetChainFeeData.maxFeePerGas;
  } else {
    throw new Error('Can\'t get gas price');
  }

  unsignedRedeemAtomicTx.chainId = BigInt(parseInt(targetChain, 10));
  unsignedRedeemAtomicTx.from = walletAddress;
  unsignedRedeemAtomicTx.gasLimit = BigInt(REDEEMATOMIC_GAS_LIMIT);

  const redeemAtomicTransactionCost = BigInt(REDEEMATOMIC_GAS_LIMIT) * targetChainGasPrice;
  const targetDenormalizedTransactionCost = denormalizeNumber(redeemAtomicTransactionCost, BigInt(NATIVE_CURRENCY_PRECISION));

  targetChainBalanceGuard.registerRequirement({
    reason: 'Network fee',
    asset: {
      name: targetChainNativeCryptocurrency,
      address: ethers.ZeroAddress,
    },
    amount: targetDenormalizedTransactionCost.toString(),
    sources: ['wallet']
  });

  await targetChainBalanceGuard.check(options?.autoApprove);

  unsignedRedeemAtomicTx.nonce = await targetProvider.getTransactionCount(walletAddress, 'pending');

  options?.logger?.('Signing redeem tx transaction...');

  const targetSignedTransaction = await signer.signTransaction(unsignedRedeemAtomicTx);
  const targetLockAtomicTxResponse = await targetChainUnit.provider.broadcastTransaction(targetSignedTransaction);
  options?.logger?.(`Redeem tx sent. Tx hash: ${targetLockAtomicTxResponse.hash}. Waiting for tx to be mined...`);

  await targetLockAtomicTxResponse.wait();
  options?.logger?.('Redeem tx mined.');
  options?.logger?.('Atomic swap completed.');

  if (options?.withdrawToWallet !== undefined && options.withdrawToWallet) {
    options.logger?.('Withdrawing to wallet...');
    const unsignedWithdrawTx = await targetExchangeContract.withdraw.populateTransaction(
      targetChainAssetAddress,
      amountBlockchainParam,
    );
    if (targetChainFeeData.gasPrice !== null) { //
      unsignedWithdrawTx.gasPrice = targetChainFeeData.gasPrice;
      targetChainGasPrice = targetChainFeeData.gasPrice;
    } else if (
      targetChainFeeData.maxFeePerGas !== null &&
      targetChainFeeData.maxPriorityFeePerGas !== null
    ) { // EIP-1559
      unsignedWithdrawTx.maxFeePerGas = targetChainFeeData.maxFeePerGas;
      unsignedWithdrawTx.maxPriorityFeePerGas = targetChainFeeData.maxPriorityFeePerGas;
      targetChainGasPrice = targetChainFeeData.maxFeePerGas;
    } else {
      throw new Error('Can\'t get gas price');
    }
    unsignedWithdrawTx.chainId = BigInt(parseInt(targetChain, 10));
    unsignedWithdrawTx.gasLimit = BigInt(WITHDRAW_GAS_LIMIT);
    unsignedWithdrawTx.from = walletAddress;
    unsignedWithdrawTx.nonce = await targetProvider.getTransactionCount(walletAddress, 'pending');
    const signedTx = await signer.signTransaction(unsignedWithdrawTx);
    const withdrawTx = await targetProvider.broadcastTransaction(signedTx);
    options.logger?.(`Withdraw tx sent. Tx hash: ${withdrawTx.hash}. Waiting for tx to be mined...`);
    await withdrawTx.wait();
    options.logger?.('Withdraw tx mined.');
  }

  options?.logger?.(`Total processing time: ${Date.now() - startProcessingTime} ms`);
}
