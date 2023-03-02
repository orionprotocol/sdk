import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import BigNumber from 'bignumber.js';
import type { ethers } from 'ethers';
import { joinSignature, splitSignature } from 'ethers/lib/utils';
import { INTERNAL_ORION_PRECISION } from '../constants';
import type { CFDOrder, SignedCFDOrder, SupportedChainId } from '../types';
import normalizeNumber from '../utils/normalizeNumber';
import getDomainData from './getDomainData';
import signCFDOrderPersonal from './signCFDOrderPersonal';
import hashCFDOrder from './hashCFDOrder';
import CFD_ORDER_TYPES from '../constants/cfdOrderTypes';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

export const signCFDOrder = async (
  instrumentAddress: string,
  side: 'BUY' | 'SELL',
  price: BigNumber.Value,
  amount: BigNumber.Value,
  matcherFee: BigNumber.Value,
  senderAddress: string,
  matcherAddress: string,
  usePersonalSign: boolean,
  signer: ethers.Signer,
  chainId: SupportedChainId,
  stopPrice: BigNumber.Value | undefined,
) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;

  // console.log('price', price);
  // console.log('price to string', price.toString());
  // console.log('normalizeNumber', normalizeNumber(
  //   price,
  //   INTERNAL_ORION_PRECISION,
  //   BigNumber.ROUND_FLOOR,
  // ).toNumber());
  // console.log('stopPrice', stopPrice);
  // console.log('stopPrice to string', stopPrice?.toString());
  // console.log('new BigNumber(stopPrice).toNumber()', new BigNumber(stopPrice ?? 0).toNumber());
  // console.log('normalizeNumber', normalizeNumber(
  //   stopPrice ?? 0,
  //   INTERNAL_ORION_PRECISION,
  //   BigNumber.ROUND_FLOOR,
  // ).toNumber());
  // console.log('ethers.BigNumber.from(stopPrice)', ethers.BigNumber.from(stopPrice?.toString()));
  // console.log('ethers.BigNumber.from(stopPrice).toNumber()', ethers.BigNumber.from(stopPrice?.toString()).toNumber());

  const order: CFDOrder = {
    senderAddress,
    matcherAddress,
    instrumentAddress,
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
    stopPrice: stopPrice !== undefined
      ? new BigNumber(stopPrice).toNumber()
      : undefined,
    isPersonalSign: usePersonalSign,
  };

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedDataSigner = signer as SignerWithTypedDataSign;
  const signature = usePersonalSign
    ? await signCFDOrderPersonal(order, signer)
    : await typedDataSigner._signTypedData(
      getDomainData(chainId),
      CFD_ORDER_TYPES,
      order,
    );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = joinSignature(splitSignature(signature));

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedCFDOrder = {
    ...order,
    id: hashCFDOrder(order),
    signature: fixedSignature,
  };

  return signedOrder;
};

export default signCFDOrder;
