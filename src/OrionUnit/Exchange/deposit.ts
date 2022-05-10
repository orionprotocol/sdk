/* eslint-disable max-len */
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import getBalances from '../../utils/getBalances';
import BalanceGuard from '../../BalanceGuard';
import OrionUnit from '..';
import { contracts, utils } from '../..';
import {
  DEPOSIT_ERC20_GAS_LIMIT, DEPOSIT_ETH_GAS_LIMIT, INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION,
} from '../../constants';
import { normalizeNumber } from '../../utils';
import getNativeCryptocurrency from '../../utils/getNativeCryptocurrency';
import simpleFetch from '../../simpleFetch';

export type DepositParams = {
  asset: string,
  amount: BigNumber.Value,
  signer: ethers.Signer,
  orionUnit: OrionUnit,
}

export default async function deposit({
  asset,
  amount,
  signer,
  orionUnit,
}: DepositParams) {
  if (asset === '') throw new Error('Asset can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amount.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amount.toString()}' should be greater than 0`);

  const walletAddress = await signer.getAddress();

  const {
    orionBlockchain, orionAggregator, provider, chainId,
  } = orionUnit;
  const {
    exchangeContractAddress,
    assetToAddress,
  } = await simpleFetch(orionBlockchain.getInfo)();

  const nativeCryptocurrency = getNativeCryptocurrency(assetToAddress);

  const exchangeContract = contracts.Exchange__factory.connect(exchangeContractAddress, provider);
  const gasPriceWei = await simpleFetch(orionBlockchain.getGasPriceWei)();

  const assetAddress = assetToAddress[asset];
  if (!assetAddress) throw new Error(`Asset '${asset}' not found`);

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
    amount: amount.toString(),
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
  const denormalizedTransactionCost = utils.denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

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
  console.log(`Deposit tx sent: ${txResponse.hash}. Waiting for confirmation...`);
  const txReceipt = await txResponse.wait();
  if (txReceipt.status) {
    console.log('Deposit tx confirmed');
  } else {
    console.log('Deposit tx failed');
  }
}
