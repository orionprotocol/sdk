import { ethers } from 'ethers';
import type { SupportedChainId, LockOrder, SignedLockOrder } from '../types.js';
import getDomainData from './getDomainData.js';
import generateSecret from '../utils/generateSecret';
import { BigNumber } from 'bignumber.js';
import normalizeNumber from '../utils/normalizeNumber';
import { INTERNAL_PROTOCOL_PRECISION } from '../constants';
import { LOCK_ORDER_TYPES } from '../constants/lockOrderTypes';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

export type SignLockOrderProps = {
  senderAddress: string // user
  asset: string
  amount: BigNumber.Value
  signer: ethers.Signer
  chainId: SupportedChainId
  targetChainId: SupportedChainId
}

export const signLockOrder = async ({
  senderAddress,
  amount,
  chainId,
  targetChainId,
  asset,
  signer,
}: SignLockOrderProps) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;
  const secret = generateSecret();
  const secretHash = ethers.keccak256(secret);

  const order: LockOrder = {
    sender: senderAddress,
    expiration,
    asset,
    amount: Number(normalizeNumber(
      amount,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    )),
    targetChainId: Number(targetChainId),
    secretHash
  };

  const signature = await signer.signTypedData(
    getDomainData(chainId),
    LOCK_ORDER_TYPES,
    order,
  );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedLockOrder = {
    ...order,
    signature: fixedSignature,
    secret,
    secretHash
  };

  return signedOrder;
};
