/* eslint-disable no-underscore-dangle */
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { joinSignature, splitSignature } from 'ethers/lib/utils';
import { INTERNAL_ORION_PRECISION } from '../constants';
import ORDER_TYPES from '../constants/orderTypes';
import { Order, SignedOrder, SupportedChainId } from '../types';
import normalizeNumber from '../utils/normalizeNumber';
import getDomainData from './getDomainData';
import hashOrder from './hashOrder';
import signOrderPersonal from './signOrderPersonal';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

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
    amount: normalizeNumber(
      amount,
      INTERNAL_ORION_PRECISION,
      BigNumber.ROUND_FLOOR,
    ).toNumber(),
    price: normalizeNumber(
      price,
      INTERNAL_ORION_PRECISION,
      BigNumber.ROUND_FLOOR,
    ).toNumber(),
    matcherFee: normalizeNumber(
      matcherFee,
      INTERNAL_ORION_PRECISION,
      BigNumber.ROUND_CEIL, // ROUND_CEIL because we don't want get "not enough fee" error
    ).toNumber(),
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

export default signOrder;
