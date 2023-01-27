import { ethers } from 'ethers';
import { CFDOrder } from '../types';

const { arrayify, joinSignature, splitSignature } = ethers.utils;

const signCFDOrderPersonal = async (order: CFDOrder, signer: ethers.Signer) => {
  const message = ethers.utils.solidityKeccak256(
    [
      'string', 'address', 'address', 'address', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64', 'uint8',
    ],
    [
      'order',
      order.senderAddress,
      order.matcherAddress,
      order.instrumentAddress,
      order.amount,
      order.price,
      order.matcherFee,
      order.nonce,
      order.expiration,
      order.buySide,
    ],
  );
  const signature = await signer.signMessage(arrayify(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return joinSignature(splitSignature(signature));
};

export default signCFDOrderPersonal;
