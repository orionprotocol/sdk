import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v5/index.js';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import getAvailableSources from '../../utils/getAvailableFundsSources.js';
import {
  INTERNAL_ORION_PRECISION,
  NATIVE_CURRENCY_PRECISION,
  LOCKATOMIC_GAS_LIMIT,
  REDEEMATOMIC_GAS_LIMIT,
  WITHDRAW_GAS_LIMIT
} from '../../constants/index.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';
import { denormalizeNumber, generateSecret, normalizeNumber, toUpperCase } from '../../utils/index.js';
import type { SupportedChainId } from '../../types.js';
import type Orion from '../index.js';
import type { z } from 'zod';
import type { placeAtomicSwapSchema } from '../../services/OrionAggregator/schemas/index.js';
import { simpleFetch } from 'simple-typed-fetch';

type Params = {
  assetName: string
  amount: BigNumber.Value
  sourceChain: SupportedChainId
  targetChain: SupportedChainId
  signer: ethers.Signer
  orion: Orion
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
  orion
}: Params) {
  const startProcessingTime = Date.now();
  if (amount === '') throw new Error('Amount can not be empty');
  if (assetName === '') throw new Error('AssetIn can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const sourceChainOrionUnit = orion.getUnit(sourceChain);
  const targetChainOrionUnit = orion.getUnit(targetChain);

  const {
    orionBlockchain: sourceOrionBlockchain,
    orionAggregator: sourceOrionAggregator,
    provider: sourceProvider,
    chainId,
  } = sourceChainOrionUnit;

  const {
    orionAggregator: targetOrionAggregator,
    orionBlockchain: targetOrionBlockchain,
    provider: targetProvider,
  } = targetChainOrionUnit;

  const sourceSupportedBridgeAssets = await simpleFetch(sourceOrionBlockchain.getAtomicSwapAssets)();
  const targetSupportedBridgeAssets = await simpleFetch(targetOrionBlockchain.getAtomicSwapAssets)();

  const commonSupportedBridgeAssets = sourceSupportedBridgeAssets.filter((asset) => targetSupportedBridgeAssets.includes(asset));
  if (!sourceSupportedBridgeAssets.includes(assetName) || !targetSupportedBridgeAssets.includes(assetName)) {
    throw new Error(`Asset '${assetName}' not available for swap between ${sourceChain} and ${targetChain} chains. Available assets: ${commonSupportedBridgeAssets.join(', ')}`);
  }

  const brokersBalances = await new Promise<Partial<Record<string, number>>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Can't get brokers balances. Timeout"));
    }, 10000);
    const id = targetOrionAggregator.ws.subscribe('btasabus', {
      callback: (data) => {
        targetOrionAggregator.ws.unsubscribe(id);
        targetOrionAggregator.ws.destroy();
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
  } = await simpleFetch(sourceOrionBlockchain.getInfo)();

  const sourceChainNativeCryptocurrency = getNativeCryptocurrencyName(sourceAssetToAddress);
  const sourceExchangeContract = Exchange__factory.connect(sourceExchangeContractAddress, sourceProvider);
  // const sourceChainGasPriceWei = await simpleFetch(sourceOrionBlockchain.getGasPriceWei)();

  const sourceChainAssetAddress = sourceAssetToAddress[assetName];
  if (sourceChainAssetAddress === undefined) throw new Error(`Asset '${assetName}' not found in source chain`);

  const {
    exchangeContractAddress: targetExchangeContractAddress,
    assetToAddress: targetAssetToAddress,
  } = await simpleFetch(targetOrionBlockchain.getInfo)();

  const targetChainAssetAddress = targetAssetToAddress[assetName];
  if (targetChainAssetAddress === undefined) throw new Error(`Asset '${assetName}' not found in target chain`);
  const targetChainNativeCryptocurrency = getNativeCryptocurrencyName(targetAssetToAddress);
  const targetExchangeContract = Exchange__factory.connect(targetExchangeContractAddress, targetProvider);

  const sourceChainBalances = await getBalances(
    {
      [assetName]: sourceChainAssetAddress,
      [sourceChainNativeCryptocurrency]: ethers.constants.AddressZero,
    },
    sourceOrionAggregator,
    walletAddress,
    sourceExchangeContract,
    sourceProvider,
  );

  const targetChainBalances = await getBalances(
    {
      [assetName]: targetChainAssetAddress,
      [targetChainNativeCryptocurrency]: ethers.constants.AddressZero,
    },
    targetOrionAggregator,
    walletAddress,
    targetExchangeContract,
    targetProvider,
  );

  const sourceChainBalanceGuard = new BalanceGuard(
    sourceChainBalances,
    {
      name: sourceChainNativeCryptocurrency,
      address: ethers.constants.AddressZero,
    },
    sourceProvider,
    signer,
    options?.logger,
  );

  const targetChainBalanceGuard = new BalanceGuard(
    targetChainBalances,
    {
      name: targetChainNativeCryptocurrency,
      address: ethers.constants.AddressZero,
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
    sources: getAvailableSources('amount', sourceChainAssetAddress, 'orion_pool'),
  });

  const amountBlockchainParam = normalizeNumber(
    amount,
    INTERNAL_ORION_PRECISION,
    BigNumber.ROUND_FLOOR,
  );
  const secret = generateSecret();
  const secretHash = ethers.utils.keccak256(secret);
  options?.logger?.(`Secret is ${secret}`);
  options?.logger?.(`Secret hash is ${secretHash}`);

  const secondsInDay = 60 * 60 * 24;
  const expirationDays = 4;
  const expirationEtherBN = ethers.BigNumber.from(
    Date.now() + (secondsInDay * expirationDays * 1000),
  );

  const unsignedLockAtomicTx = await sourceExchangeContract.populateTransaction.lockAtomic({
    amount: amountBlockchainParam,
    asset: sourceChainAssetAddress,
    expiration: expirationEtherBN,
    secretHash,
    sender: walletAddress,
    targetChainId: ethers.BigNumber.from(targetChain),
  });

  let sourceChainGasPrice: ethers.BigNumber;
  const sourceChainFeeData = await sourceChainOrionUnit.provider.getFeeData();
  if (ethers.BigNumber.isBigNumber(sourceChainFeeData.gasPrice)) { //
    unsignedLockAtomicTx.gasPrice = sourceChainFeeData.gasPrice;
    sourceChainGasPrice = sourceChainFeeData.gasPrice;
  } else if (
    ethers.BigNumber.isBigNumber(sourceChainFeeData.maxFeePerGas) &&
    ethers.BigNumber.isBigNumber(sourceChainFeeData.maxPriorityFeePerGas)
  ) { // EIP-1559
    unsignedLockAtomicTx.maxFeePerGas = sourceChainFeeData.maxFeePerGas;
    unsignedLockAtomicTx.maxPriorityFeePerGas = sourceChainFeeData.maxPriorityFeePerGas;
    sourceChainGasPrice = sourceChainFeeData.maxFeePerGas;
  } else {
    throw new Error('Can\'t get gas price');
  }

  unsignedLockAtomicTx.chainId = parseInt(chainId, 10);
  unsignedLockAtomicTx.from = walletAddress;

  let value = new BigNumber(0);
  const denormalizedAssetInExchangeBalance = sourceChainBalances[assetName]?.exchange;
  if (denormalizedAssetInExchangeBalance === undefined) throw new Error(`Asset '${assetName}' exchange balance is not found`);
  if (assetName === sourceChainNativeCryptocurrency && amountBN.gt(denormalizedAssetInExchangeBalance)) {
    value = amountBN.minus(denormalizedAssetInExchangeBalance);
  }
  unsignedLockAtomicTx.value = normalizeNumber(
    value.dp(INTERNAL_ORION_PRECISION, BigNumber.ROUND_CEIL),
    NATIVE_CURRENCY_PRECISION,
    BigNumber.ROUND_CEIL,
  );
  unsignedLockAtomicTx.gasLimit = ethers.BigNumber.from(LOCKATOMIC_GAS_LIMIT);

  const transactionCost = ethers.BigNumber.from(LOCKATOMIC_GAS_LIMIT).mul(sourceChainGasPrice);
  const denormalizedTransactionCost = denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

  sourceChainBalanceGuard.registerRequirement({
    reason: 'Network fee',
    asset: {
      name: sourceChainNativeCryptocurrency,
      address: ethers.constants.AddressZero,
    },
    amount: denormalizedTransactionCost.toString(),
    sources: ['wallet']
  });

  await sourceChainBalanceGuard.check(options?.autoApprove);

  const nonce = await sourceProvider.getTransactionCount(walletAddress, 'pending');
  unsignedLockAtomicTx.nonce = nonce;

  options?.logger?.('Signing lock tx transaction...');
  const signedTransaction = await signer.signTransaction(unsignedLockAtomicTx);
  const lockAtomicTxResponse = await sourceChainOrionUnit.provider.sendTransaction(signedTransaction);
  options?.logger?.(`Lock tx sent. Tx hash: ${lockAtomicTxResponse.hash}. Waiting for tx to be mined...`);
  await lockAtomicTxResponse.wait();
  options?.logger?.('Lock tx mined.');
  options?.logger?.('Placing atomic swap...');

  const atomicSwap = await new Promise<z.infer<typeof placeAtomicSwapSchema>>((resolve, reject) => {
    const placeAtomicSwap = () => simpleFetch(targetOrionAggregator.placeAtomicSwap)(
      secretHash,
      toUpperCase(sourceChainOrionUnit.networkCode)
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

  // const targetChainGasPriceWei = await simpleFetch(targetOrionBlockchain.getGasPriceWei)();
  const unsignedRedeemAtomicTx = await targetExchangeContract.populateTransaction.redeemAtomic(
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

  let targetChainGasPrice: ethers.BigNumber;
  const targetChainFeeData = await targetChainOrionUnit.provider.getFeeData();
  if (ethers.BigNumber.isBigNumber(targetChainFeeData.gasPrice)) { //
    unsignedRedeemAtomicTx.gasPrice = targetChainFeeData.gasPrice;
    targetChainGasPrice = targetChainFeeData.gasPrice;
  } else if (
    ethers.BigNumber.isBigNumber(targetChainFeeData.maxFeePerGas) &&
      ethers.BigNumber.isBigNumber(targetChainFeeData.maxPriorityFeePerGas)
  ) { // EIP-1559
    unsignedRedeemAtomicTx.maxFeePerGas = targetChainFeeData.maxFeePerGas;
    unsignedRedeemAtomicTx.maxPriorityFeePerGas = targetChainFeeData.maxPriorityFeePerGas;
    targetChainGasPrice = targetChainFeeData.maxFeePerGas;
  } else {
    throw new Error('Can\'t get gas price');
  }

  unsignedRedeemAtomicTx.chainId = parseInt(targetChain, 10);
  unsignedRedeemAtomicTx.from = walletAddress;
  unsignedRedeemAtomicTx.gasLimit = ethers.BigNumber.from(REDEEMATOMIC_GAS_LIMIT);

  const redeemAtomicTransactionCost = ethers.BigNumber.from(REDEEMATOMIC_GAS_LIMIT).mul(targetChainGasPrice);
  const targetDenormalizedTransactionCost = denormalizeNumber(redeemAtomicTransactionCost, NATIVE_CURRENCY_PRECISION);

  targetChainBalanceGuard.registerRequirement({
    reason: 'Network fee',
    asset: {
      name: targetChainNativeCryptocurrency,
      address: ethers.constants.AddressZero,
    },
    amount: targetDenormalizedTransactionCost.toString(),
    sources: ['wallet']
  });

  await targetChainBalanceGuard.check(options?.autoApprove);

  unsignedRedeemAtomicTx.nonce = await targetProvider.getTransactionCount(walletAddress, 'pending');

  options?.logger?.('Signing redeem tx transaction...');

  const targetSignedTransaction = await signer.signTransaction(unsignedRedeemAtomicTx);
  const targetLockAtomicTxResponse = await targetChainOrionUnit.provider.sendTransaction(targetSignedTransaction);
  options?.logger?.(`Redeem tx sent. Tx hash: ${targetLockAtomicTxResponse.hash}. Waiting for tx to be mined...`);

  await targetLockAtomicTxResponse.wait();
  options?.logger?.('Redeem tx mined.');
  options?.logger?.('Atomic swap completed.');

  if (options?.withdrawToWallet !== undefined && options.withdrawToWallet) {
    options.logger?.('Withdrawing to wallet...');
    const unsignedWithdrawTx = await targetExchangeContract.populateTransaction.withdraw(
      targetChainAssetAddress,
      amountBlockchainParam,
    );
    if (ethers.BigNumber.isBigNumber(targetChainFeeData.gasPrice)) { //
      unsignedWithdrawTx.gasPrice = targetChainFeeData.gasPrice;
      targetChainGasPrice = targetChainFeeData.gasPrice;
    } else if (
      ethers.BigNumber.isBigNumber(targetChainFeeData.maxFeePerGas) &&
      ethers.BigNumber.isBigNumber(targetChainFeeData.maxPriorityFeePerGas)
    ) { // EIP-1559
      unsignedWithdrawTx.maxFeePerGas = targetChainFeeData.maxFeePerGas;
      unsignedWithdrawTx.maxPriorityFeePerGas = targetChainFeeData.maxPriorityFeePerGas;
      targetChainGasPrice = targetChainFeeData.maxFeePerGas;
    } else {
      throw new Error('Can\'t get gas price');
    }
    unsignedWithdrawTx.chainId = parseInt(targetChain, 10);
    unsignedWithdrawTx.gasLimit = ethers.BigNumber.from(WITHDRAW_GAS_LIMIT);
    unsignedWithdrawTx.from = walletAddress;
    unsignedWithdrawTx.nonce = await targetProvider.getTransactionCount(walletAddress, 'pending');
    const signedTx = await signer.signTransaction(unsignedWithdrawTx);
    const withdrawTx = await targetProvider.sendTransaction(signedTx);
    options.logger?.(`Withdraw tx sent. Tx hash: ${withdrawTx.hash}. Waiting for tx to be mined...`);
    await withdrawTx.wait();
    options.logger?.('Withdraw tx mined.');
  }

  options?.logger?.(`Total processing time: ${Date.now() - startProcessingTime} ms`);
}
