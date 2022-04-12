/* eslint-disable no-underscore-dangle */
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import {
  CancelOrderRequest, Order, SignedCancelOrderRequest, SignedOrder, SupportedChainId,
} from './types';
import eip712DomainData from './config/eip712DomainData.json';
import eip712DomainSchema from './config/schemas/eip712DomainSchema';
import { hashOrder } from './utils';

import { INTERNAL_ORION_PRECISION } from './constants/precisions';
import ORDER_TYPES from './constants/orderTypes';
import CANCEL_ORDER_TYPES from './constants/cancelOrderTypes';
import signOrderPersonal from './utils/signOrderPersonal';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

const applyInternalOrionPrecision = (
  n: BigNumber.Value,
) => new BigNumber(n)
  .multipliedBy(new BigNumber(10).pow(INTERNAL_ORION_PRECISION))
  .decimalPlaces(0, BigNumber.ROUND_FLOOR)
  .toNumber();

const EIP712Domain = eip712DomainSchema.parse(eip712DomainData);
const { arrayify, joinSignature, splitSignature } = ethers.utils;

/**
 * See {@link https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator}
 */
const getDomainData = (chainId: SupportedChainId) => ({
  ...EIP712Domain,
  chainId,
});

export const signOrder = async (
  baseAssetAddr: string,
  quoteAssetAddr: string,
  side: 'BUY' | 'SELL',
  price: BigNumber.Value,
  amount: BigNumber.Value,
  matcherFee: BigNumber.Value,
  senderAddress: string,
  matcherAddress: string,
  orionFeeAssetAddr: string,
  usePersonalSign: boolean,
  signer: ethers.Signer,
  chainId: SupportedChainId,
) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;

  const order: Order = {
    senderAddress,
    matcherAddress,
    baseAsset: baseAssetAddr,
    quoteAsset: quoteAssetAddr,
    matcherFeeAsset: orionFeeAssetAddr,
    amount: applyInternalOrionPrecision(amount),
    price: applyInternalOrionPrecision(price),
    matcherFee: new BigNumber(matcherFee)
      // ROUND_CEIL because we don't want get "not enough fee" error
      .decimalPlaces(INTERNAL_ORION_PRECISION, BigNumber.ROUND_CEIL)
      .multipliedBy(new BigNumber(10).pow(INTERNAL_ORION_PRECISION))
      .toNumber(),
    nonce,
    expiration,
    buySide: side === 'BUY' ? 1 : 0,
    isPersonalSign: usePersonalSign,
  };

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedDataSigner = signer as SignerWithTypedDataSign;

  const signature = usePersonalSign
    ? await signOrderPersonal(order, signer)
    : await typedDataSigner._signTypedData(
      getDomainData(chainId),
      ORDER_TYPES,
      order,
    );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = joinSignature(splitSignature(signature));

  if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedOrder = {
    ...order,
    id: hashOrder(order),
    signature: fixedSignature,
  };
  return signedOrder;
};

export const signCancelOrderPersonal = async (
  cancelOrderRequest: CancelOrderRequest,
  signer: ethers.Signer,
) => {
  const types = ['string', 'string', 'address'];
  const message = ethers.utils.solidityKeccak256(
    types,
    ['cancelOrder', cancelOrderRequest.id, cancelOrderRequest.senderAddress],
  );
  const signature = await signer.signMessage(arrayify(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return joinSignature(splitSignature(signature));
};

export const signCancelOrder = async (
  senderAddress: string,
  id: string,
  usePersonalSign: boolean,
  signer: ethers.Signer,
  chainId: SupportedChainId,
) => {
  const cancelOrderRequest: CancelOrderRequest = {
    id,
    senderAddress,
    isPersonalSign: usePersonalSign,
  };
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedDataSigner = signer as SignerWithTypedDataSign;

  const signature = usePersonalSign
    ? await signCancelOrderPersonal(cancelOrderRequest, signer)
  // https://docs.ethers.io/v5/api/signer/#Signer-signTypedData
    : await typedDataSigner._signTypedData(
      getDomainData(chainId),
      CANCEL_ORDER_TYPES,
      cancelOrderRequest,
    );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = joinSignature(splitSignature(signature));

  if (!fixedSignature) throw new Error("Can't sign order cancel");

  const signedCancelOrderReqeust: SignedCancelOrderRequest = {
    ...cancelOrderRequest,
    signature: fixedSignature,
  };
  return signedCancelOrderReqeust;
};
