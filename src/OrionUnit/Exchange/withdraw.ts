import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v5';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import type OrionUnit from '../index.js';
import {
  INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION, WITHDRAW_GAS_LIMIT,
} from '../../constants/index.js';
import { denormalizeNumber, normalizeNumber } from '../../utils/index.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';
import { simpleFetch } from 'simple-typed-fetch';

export type WithdrawParams = {
  asset: string
  amount: BigNumber.Value
  signer: ethers.Signer
  orionUnit: OrionUnit
}

export default async function withdraw({
  asset,
  amount,
  signer,
  orionUnit,
}: WithdrawParams) {
  if (asset === '') throw new Error('Asset can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const walletAddress = await signer.getAddress();

  const {
    orionBlockchain, orionAggregator, provider, chainId,
  } = orionUnit;
  const {
    exchangeContractAddress,
    assetToAddress,
  } = await simpleFetch(orionBlockchain.getInfo)();

  const nativeCryptocurrency = getNativeCryptocurrencyName(assetToAddress);
  const exchangeContract = Exchange__factory.connect(exchangeContractAddress, provider);
  const gasPriceWei = await simpleFetch(orionBlockchain.getGasPriceWei)();

  const assetAddress = assetToAddress[asset];
  if (assetAddress === undefined) throw new Error(`Asset '${asset}' not found`);

  const balances = await getBalances(
    {
      [asset]: assetAddress,
      [nativeCryptocurrency]: ethers.constants.AddressZero,
    },
    orionAggregator,
    walletAddress,
    exchangeContract,
    provider,
  );

  const balanceGuard = new BalanceGuard(
    balances,
    {
      name: nativeCryptocurrency,
      address: ethers.constants.AddressZero,
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

  const unsignedTx = await exchangeContract.populateTransaction.withdraw(
    assetAddress,
    normalizeNumber(amount, INTERNAL_ORION_PRECISION, BigNumber.ROUND_FLOOR),
  );
  unsignedTx.gasLimit = ethers.BigNumber.from(WITHDRAW_GAS_LIMIT);

  const transactionCost = ethers.BigNumber.from(unsignedTx.gasLimit).mul(gasPriceWei);
  const denormalizedTransactionCost = denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

  balanceGuard.registerRequirement({
    reason: 'Network fee',
    asset: {
      name: nativeCryptocurrency,
      address: ethers.constants.AddressZero,
    },
    amount: denormalizedTransactionCost.toString(),
    sources: ['wallet'],
  });

  unsignedTx.chainId = parseInt(chainId, 10);
  unsignedTx.gasPrice = ethers.BigNumber.from(gasPriceWei);
  unsignedTx.from = walletAddress;

  await balanceGuard.check(true);

  const nonce = await provider.getTransactionCount(walletAddress, 'pending');
  unsignedTx.nonce = nonce;

  const signedTx = await signer.signTransaction(unsignedTx);
  const txResponse = await provider.sendTransaction(signedTx);
  console.log(`Withdraw tx sent: ${txResponse.hash}. Waiting for confirmation...`);
  try {
    const txReceipt = await txResponse.wait();
    if (txReceipt.status !== undefined) {
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
