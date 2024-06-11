import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v6-cjs/index.js';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import type Unit from '../index.js';
import {
  DEPOSIT_ERC20_GAS_LIMIT, DEPOSIT_ETH_GAS_LIMIT, INTERNAL_PROTOCOL_PRECISION, NATIVE_CURRENCY_PRECISION,
} from '../../constants/index.js';
import { denormalizeNumber, normalizeNumber } from '../../utils/index.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';
import { simpleFetch } from 'simple-typed-fetch';

export type DepositParams = {
  asset: string
  amount: BigNumber.Value
  signer: ethers.Signer
  unit: Unit
}

export default async function deposit({
  asset,
  amount,
  signer,
  unit,
}: DepositParams) {
  if (asset === '') throw new Error('Asset can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const walletAddress = await signer.getAddress();

  const {
    blockchainService, aggregator, provider, chainId,
  } = unit;
  const {
    exchangeContractAddress,
    assetToAddress,
  } = await simpleFetch(blockchainService.getInfo)();

  const nativeCryptocurrency = getNativeCryptocurrencyName(assetToAddress);

  const exchangeContract = Exchange__factory.connect(exchangeContractAddress, provider);
  const gasPriceWei = await simpleFetch(blockchainService.getGasPriceWei)();

  const assetAddress = assetToAddress[asset];
  if (assetAddress === undefined) throw new Error(`Asset '${asset}' not found`);

  const balances = await getBalances(
    {
      [asset]: assetAddress,
      [nativeCryptocurrency]: ethers.ZeroAddress,
    },
    aggregator,
    walletAddress,
    exchangeContract,
    provider,
  );

  const balanceGuard = new BalanceGuard(
    balances,
    {
      name: nativeCryptocurrency,
      address: ethers.ZeroAddress,
    },
    provider,
    signer,
  );

  balanceGuard.registerRequirement({
    reason: 'Amount',
    asset: {
      name: asset,
      address: assetAddress,
    },
    amount: amountBN.toString(),
    spenderAddress: exchangeContractAddress,
    sources: ['wallet'],
  });

  let unsignedTx: ethers.TransactionLike;
  if (asset === nativeCryptocurrency) {
    unsignedTx = await exchangeContract.deposit.populateTransaction();
    unsignedTx.value = normalizeNumber(amount, NATIVE_CURRENCY_PRECISION, BigNumber.ROUND_CEIL);
    unsignedTx.gasLimit = BigInt(DEPOSIT_ETH_GAS_LIMIT);
  } else {
    unsignedTx = await exchangeContract.depositAsset.populateTransaction(
      assetAddress,
      normalizeNumber(amount, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_CEIL),
    );
    unsignedTx.gasLimit = BigInt(DEPOSIT_ERC20_GAS_LIMIT);
  }

  const transactionCost = BigInt(unsignedTx.gasLimit) * BigInt(gasPriceWei);
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

  unsignedTx.chainId = parseInt(chainId, 10);
  unsignedTx.gasPrice = BigInt(gasPriceWei);
  unsignedTx.from = walletAddress;

  await balanceGuard.check(true);

  const nonce = await provider.getTransactionCount(walletAddress, 'pending');
  unsignedTx.nonce = nonce;

  const signedTx = await signer.signTransaction(unsignedTx);
  try {
    const txResponse = await provider.broadcastTransaction(signedTx);
    console.log(`Deposit tx sent: ${txResponse.hash}. Waiting for confirmation...`);
    const txReceipt = await txResponse.wait();
    if (txReceipt?.status !== undefined) {
      console.log('Deposit tx confirmed');
    } else {
      console.log('Deposit tx failed');
    }
  } catch (e) {
    if (!(e instanceof Error)) throw new Error('e is not an Error');
    console.error(`Deposit tx failed: ${e.message}`, {
      unsignedTx,
    });
  }
}
