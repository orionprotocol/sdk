import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { ethers } from 'ethers';
import CANCEL_ORDER_TYPES from '../constants/cancelOrderTypes.js';
import type { CancelOrderRequest, SignedCancelOrderRequest, SupportedChainId } from '../types.js';
import getDomainData from './getDomainData.js';
import signCancelOrderPersonal from './signCancelOrderPersonal.js';

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
    : await typedDataSigner.signTypedData(
      getDomainData(chainId),
      CANCEL_ORDER_TYPES,
      cancelOrderRequest,
    );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order cancel");

  const signedCancelOrderReqeust: SignedCancelOrderRequest = {
    ...cancelOrderRequest,
    signature: fixedSignature,
  };
  return signedCancelOrderReqeust;
};

export default signCancelOrder;
