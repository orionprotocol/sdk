import { ethers } from 'ethers';
import type { CancelOrderRequest } from '../types.js';

const signCancelOrderPersonal = async (
  cancelOrderRequest: CancelOrderRequest,
  signer: ethers.Signer,
) => {
  const types = ['string', 'string', 'address'];
  const message = ethers.solidityPackedKeccak256(
    types,
    ['cancelOrder', cancelOrderRequest.id, cancelOrderRequest.senderAddress],
  );
  const signature = await signer.signMessage(ethers.getBytes(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return ethers.Signature.from(signature).serialized;
};

export default signCancelOrderPersonal;
