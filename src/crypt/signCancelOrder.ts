import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import type { ethers } from 'ethers';
import { joinSignature, splitSignature } from 'ethers/lib/utils';
import CANCEL_ORDER_TYPES from '../constants/cancelOrderTypes';
import type { CancelOrderRequest, SignedCancelOrderRequest, SupportedChainId } from '../types';
import getDomainData from './getDomainData';
import signCancelOrderPersonal from './signCancelOrderPersonal';

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

const signCancelOrder = async (
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

  // if (!fixedSignature) throw new Error("Can't sign order cancel");

  const signedCancelOrderReqeust: SignedCancelOrderRequest = {
    ...cancelOrderRequest,
    signature: fixedSignature,
  };
  return signedCancelOrderReqeust;
};

export default signCancelOrder;
