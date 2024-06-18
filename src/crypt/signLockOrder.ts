import { ethers } from 'ethers';
import type { SupportedChainId, LockOrder, SignedLockOrder } from '../types.js';
import getDomainData from './getDomainData.js';
import generateSecret from '../utils/generateSecret';
import { BigNumber } from 'bignumber.js';
import normalizeNumber from '../utils/normalizeNumber';
import { INTERNAL_PROTOCOL_PRECISION, LOCK_ORDER_TYPES } from '../constants';

const DEFAULT_EXPIRATION = 4 * 24 * 60 * 60 * 1000; // 4 days

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
    secret,
    secretHash
  };

  const signature = await signer.signTypedData(
    getDomainData(chainId),
    LOCK_ORDER_TYPES,
    order,
  );

  const signedOrder: SignedLockOrder = {
    ...order,
    signature,
    secret,
    secretHash
  };

  return signedOrder;
};
