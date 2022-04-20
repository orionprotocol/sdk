/* eslint-disable camelcase */
import { Provider } from '@ethersproject/providers';
import { BytesLike, ethers, Signer } from 'ethers';
import {
  Exchange as ExchangeContract,
  Exchange__factory as ExchangeContract__factory,
} from '../artifacts/contracts';
import { LibAtomic } from '../artifacts/contracts/Exchange';
import {
  DEPOSIT_ERC20_GAS_LIMIT, DEPOSIT_ETH_GAS_LIMIT, LOCKATOMIC_GAS_LIMIT,
  REDEEMATOMIC_GAS_LIMIT, SWAP_THROUGH_ORION_POOL_GAS_LIMIT, WITHDRAW_GAS_LIMIT,
} from '../constants';
import { SupportedChainId } from '../types';

export default class Exchange {
  chainId: SupportedChainId;

  private exchangeContract: ExchangeContract;

  constructor(chainId: SupportedChainId, signerOrProvider: Signer | Provider, address: string) {
    this.chainId = chainId;
    this.exchangeContract = ExchangeContract__factory.connect(address, signerOrProvider);
  }

  swapThroughOrionPool(
    amount_spend: ethers.BigNumberish,
    amount_receive: ethers.BigNumberish,
    path: string[],
    is_exact_spend: boolean,
    value?: ethers.BigNumberish,
  ) {
    return this.exchangeContract.populateTransaction.swapThroughOrionPool(
      amount_spend,
      amount_receive,
      path,
      is_exact_spend,
      {
        gasLimit: SWAP_THROUGH_ORION_POOL_GAS_LIMIT,
        value,
      },
    );
  }

  depositNativeCurrency(value: ethers.BigNumberish) {
    return this.exchangeContract.populateTransaction.deposit({
      gasLimit: DEPOSIT_ETH_GAS_LIMIT,
      value,
    });
  }

  depositERC20(assetAddress: string, amount: ethers.BigNumberish) {
    return this.exchangeContract.populateTransaction.depositAsset(
      assetAddress,
      amount,
      {
        gasLimit: DEPOSIT_ERC20_GAS_LIMIT,
      },
    );
  }

  withdraw(assetAddress: string, amount: ethers.BigNumberish) {
    return this.exchangeContract.populateTransaction.withdraw(
      assetAddress,
      amount,
      {
        gasLimit: WITHDRAW_GAS_LIMIT,
      },
    );
  }

  lockAtomic(lockOrder: LibAtomic.LockOrderStruct) {
    return this.exchangeContract.populateTransaction.lockAtomic(
      lockOrder,
      {
        gasLimit: LOCKATOMIC_GAS_LIMIT,
      },
    );
  }

  redeemAtomic(redeemOrder: LibAtomic.RedeemOrderStruct, secret: BytesLike) {
    return this.exchangeContract.populateTransaction.redeemAtomic(
      redeemOrder,
      secret,
      {
        gasLimit: REDEEMATOMIC_GAS_LIMIT,
      },
    );
  }

  redeem2Atomics(
    order1: LibAtomic.RedeemOrderStruct,
    secret1: BytesLike,
    order2: LibAtomic.RedeemOrderStruct,
    secret2: BytesLike,
  ) {
    return this.exchangeContract.populateTransaction.redeem2Atomics(
      order1,
      secret1,
      order2,
      secret2,
    );
  }

  refundAtomic(secretHash: BytesLike) {
    return this.exchangeContract.populateTransaction.refundAtomic(
      secretHash,
    );
  }
}
