import { ethers } from "ethers";
import type { CrossChainOrder } from "../types.js";

const hashCrossChainOrder = (order: CrossChainOrder) =>
  ethers.solidityPackedKeccak256(
    [
      "uint8",
      "address",
      "address",
      "address",
      "address",
      "address",
      "uint64",
      "uint64",
      "uint64",
      "uint64",
      "uint64",
      "uint8",
      "bytes32",
      "uint24",
    ],
    [
      "0x03",
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
      order.buySide === 1 ? "0x01" : "0x00",
      order.secretHash,
      order.targetChainId,
    ]
  );

export default hashCrossChainOrder;
