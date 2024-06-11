import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v6-cjs/index.js';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import type Unit from '../index.js';
import {
  INTERNAL_PROTOCOL_PRECISION, NATIVE_CURRENCY_PRECISION, WITHDRAW_GAS_LIMIT,
} from '../../constants/index.js';
import { denormalizeNumber, normalizeNumber } from '../../utils/index.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';
import { simpleFetch } from 'simple-typed-fetch';

export type WithdrawParams = {
  asset: string
  amount: BigNumber.Value
  signer: ethers.Signer
  unit: Unit
}

export default async function withdraw({
  asset,
  amount,
  signer,
  unit,
}: WithdrawParams) {
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
    sources: ['exchange'],
  });

  const unsignedTx = await exchangeContract.withdraw.populateTransaction(
    assetAddress,
    normalizeNumber(amount, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR).toString(),
  );
  unsignedTx.gasLimit = BigInt(WITHDRAW_GAS_LIMIT);

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

  unsignedTx.chainId = BigInt(chainId);
  unsignedTx.gasPrice = BigInt(gasPriceWei);
  unsignedTx.from = walletAddress;

  await balanceGuard.check(true);

  const nonce = await provider.getTransactionCount(walletAddress, 'pending');
  unsignedTx.nonce = nonce;

  const signedTx = await signer.signTransaction(unsignedTx);
  const txResponse = await provider.broadcastTransaction(signedTx);
  console.log(`Withdraw tx sent: ${txResponse.hash}. Waiting for confirmation...`);
  try {
    const txReceipt = await txResponse.wait();
    if (txReceipt?.status !== undefined) {
      console.log('Withdraw tx confirmed');
    } else {
      console.log('Withdraw tx failed');
    }
  } catch (e) {
    if (!(e instanceof Error)) throw new Error('e is not an Error');
    console.error(`Deposit tx failed: ${e.message}`, {
      unsignedTx,
    });
  }
}
