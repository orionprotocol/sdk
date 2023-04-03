import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import type OrionUnit from '../index.js';
import {
  DEPOSIT_ERC20_GAS_LIMIT, DEPOSIT_ETH_GAS_LIMIT, INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION,
} from '../../constants/index.js';
import { denormalizeNumber, normalizeNumber } from '../../utils/index.js';
import getNativeCryptocurrency from '../../utils/getNativeCryptocurrency.js';
import { simpleFetch } from 'simple-typed-fetch';

export type DepositParams = {
  asset: string
  amount: BigNumber.Value
  signer: ethers.Signer
  orionUnit: OrionUnit
}

export default async function deposit({
  asset,
  amount,
  signer,
  orionUnit,
}: DepositParams) {
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

  const nativeCryptocurrency = getNativeCryptocurrency(assetToAddress);

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
    spenderAddress: exchangeContractAddress,
    sources: ['wallet'],
  });

  let unsignedTx: ethers.PopulatedTransaction;
  if (asset === nativeCryptocurrency) {
    unsignedTx = await exchangeContract.populateTransaction.deposit();
    unsignedTx.value = normalizeNumber(amount, NATIVE_CURRENCY_PRECISION, BigNumber.ROUND_CEIL);
    unsignedTx.gasLimit = ethers.BigNumber.from(DEPOSIT_ETH_GAS_LIMIT);
  } else {
    unsignedTx = await exchangeContract.populateTransaction.depositAsset(
      assetAddress,
      normalizeNumber(amount, INTERNAL_ORION_PRECISION, BigNumber.ROUND_CEIL),
    );
    unsignedTx.gasLimit = ethers.BigNumber.from(DEPOSIT_ERC20_GAS_LIMIT);
  }

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
  try {
    const txResponse = await provider.sendTransaction(signedTx);
    console.log(`Deposit tx sent: ${txResponse.hash}. Waiting for confirmation...`);
    const txReceipt = await txResponse.wait();
    if (txReceipt.status !== undefined) {
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
