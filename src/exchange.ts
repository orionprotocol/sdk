/* eslint-disable no-underscore-dangle */
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import invariant from 'tiny-invariant';
import {
  CancelOrderRequest, Order, SignedCancelOrderRequest, SignedOrder,
} from './types';
import eip712DomainData from './config/eip712DomainData.json';
import eip712DomainSchema from './config/schemas/eip712DomainSchema';
import { hashOrder } from './utils';

import { INTERNAL_ORION_PRECISION } from './constants/precisions';
import ORDER_TYPES from './constants/orderTypes';
import { SupportedChainId } from './constants/chains';
import CANCEL_ORDER_TYPES from './constants/cancelOrderTypes';
import signOrderPersonal from './utils/signOrderPersonal';

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

const numberTo8 = (
  n: BigNumber.Value,
) => Number(new BigNumber(n)
  .multipliedBy(1e8).toFixed(0)); // todo: можно ли не оборачивать в Number?

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
  side: 'buy' | 'sell',
  price: BigNumber,
  amount: BigNumber,
  matcherFee: BigNumber,
  senderAddress: string,
  matcherAddress: string,
  orionFeeAssetAddr: string,
  expiration: number,
  usePersonalSign: boolean,
  signer: ethers.Signer,
  chainId: SupportedChainId,
  validateOrder: (signedOrder: SignedOrder) => Promise<boolean | undefined>,
) => {
  const nonce = Date.now();

  const order: Order = {
    senderAddress,
    matcherAddress,
    baseAsset: baseAssetAddr,
    quoteAsset: quoteAssetAddr,
    matcherFeeAsset: orionFeeAssetAddr,
    amount: numberTo8(amount),
    price: numberTo8(price),
    matcherFee: matcherFee
      .decimalPlaces(INTERNAL_ORION_PRECISION)
      .multipliedBy(new BigNumber(10).pow(INTERNAL_ORION_PRECISION))
      .toNumber(),
    nonce,
    expiration,
    buySide: side === 'buy' ? 1 : 0,
    isPersonalSign: usePersonalSign,
  };

  invariant(signer, 'No signer (order signing)');
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

  const orderIsOk = await validateOrder(signedOrder);
  if (!orderIsOk) throw new Error('Order validation failed');
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
  invariant(signer, 'No signer for order cancel sign');
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

  // if (!s.privateKey) {
  // if (usePersonalSign) {
  // } else {
  //   const data = {
  //     types: {
  //       EIP712Domain: DOMAIN_TYPE,
  //       DeleteOrder: CANCEL_ORDER_TYPES.DeleteOrder,
  //     },
  //     domain: domainData,
  //     primaryType: 'DeleteOrder',
  //     message: cancelOrderRequest,
  //   };

  //   const msgParams = { data };
  //   const bufferKey = Buffer.from((signer as ethers.Wallet).privateKey.substr(2), 'hex');
  //   cancelOrderRequest.signature = signTypedMessage(bufferKey, msgParams as any, 'V4');
  // }

  return signedCancelOrderReqeust;
};
