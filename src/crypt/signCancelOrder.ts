import type { ethers } from 'ethers';
import CANCEL_ORDER_TYPES from '../constants/cancelOrderTypes.js';
import type { CancelOrderRequest, SignedCancelOrderRequest, SupportedChainId } from '../types.js';
import getDomainData from './getDomainData.js';

const signCancelOrder = async (
  senderAddress: string,
  id: string,
  signer: ethers.Signer,
  chainId: SupportedChainId,
) => {
  const cancelOrderRequest: CancelOrderRequest = {
    id,
    senderAddress,
  };

  const signature = await signer.signTypedData(
    getDomainData(chainId),
    CANCEL_ORDER_TYPES,
    cancelOrderRequest,
  );

  const signedCancelOrderReqeust: SignedCancelOrderRequest = {
    ...cancelOrderRequest,
    signature,
  };
  return signedCancelOrderReqeust;
};

export default signCancelOrder;
