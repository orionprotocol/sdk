import { ethers } from 'ethers';
import type { Order } from '../types.js';

const signOrderPersonal = async (order: Order, signer: ethers.Signer) => {
  const message = ethers.solidityPackedKeccak256(
    [
      'string', 'address', 'address', 'address', 'address',
      'address', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64', 'uint8',
    ],
    [
      'order',
      order.senderAddress,
      order.matcherAddress,
      order.baseAsset,
      order.quoteAsset,
      order.matcherFeeAsset,
      order.amount,
      order.price,
      order.matcherFee,
      order.nonce,
      order.expiration,
      order.buySide,
    ],
  );
  const signature = await signer.signMessage(ethers.getBytes(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return ethers.Signature.from(signature).serialized;
};

export default signOrderPersonal;
