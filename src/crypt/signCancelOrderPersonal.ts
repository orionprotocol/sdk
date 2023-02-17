import { ethers } from 'ethers';
import { arrayify, joinSignature, splitSignature } from 'ethers/lib/utils';
import type { CancelOrderRequest } from '../types';

const signCancelOrderPersonal = async (
  cancelOrderRequest: CancelOrderRequest,
  signer: ethers.Signer,
) => {
  const types = ['string', 'string', 'address'];
  const message = ethers.utils.solidityKeccak256(
    types,
    ['cancelOrder', cancelOrderRequest.id, cancelOrderRequest.senderAddress],
  );
  const signature = await signer.signMessage(arrayify(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return joinSignature(splitSignature(signature));
};

export default signCancelOrderPersonal;
