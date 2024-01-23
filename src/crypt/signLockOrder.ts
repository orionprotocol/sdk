import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { ethers } from 'ethers';
import ORDER_TYPES from '../constants/orderTypes.js';
import type { LockOrder, SignedLockOrder, SupportedChainId } from '../types.js';
import getDomainData from './getDomainData.js';
import generateSecret from '../utils/generateSecret';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

export type LockOrderProps = {
  userAddress: string // адрес юзера который хочет сделать лок
  senderAddress: string // broker
  asset: string
  amount: ethers.BigNumberish
  signer: ethers.Signer
  chainId: SupportedChainId
  targetChainId: SupportedChainId
}

export const signLockOrder = async ({
  userAddress,
  senderAddress,
  amount,
  chainId,
  targetChainId,
  asset,
  signer
}: LockOrderProps) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;
  const secret = generateSecret();
  const secretHash = ethers.keccak256(secret);

  const order: LockOrder = {
    user: userAddress,
    sender: senderAddress,
    expiration,
    asset,
    amount,
    targetChainId,
    secretHash,
  };

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedDataSigner = signer as SignerWithTypedDataSign;

  const signature = await typedDataSigner.signTypedData(
    getDomainData(chainId),
    ORDER_TYPES,
    order,
  );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedLockOrder = {
    ...order,
    signature: fixedSignature,
    secret
  };

  return signedOrder;
};
