import type OrionUnit from '..';
import deposit, { type DepositParams } from './deposit';
import getSwapInfo, { type GetSwapInfoParams } from './getSwapInfo';
import type { SwapLimitParams } from './swapLimit';
import swapLimit from './swapLimit';
import swapMarket, { type SwapMarketParams } from './swapMarket';
import withdraw, { type WithdrawParams } from './withdraw';

type PureSwapMarketParams = Omit<SwapMarketParams, 'orionUnit'>
type PureSwapLimitParams = Omit<SwapLimitParams, 'orionUnit'>
type PureDepositParams = Omit<DepositParams, 'orionUnit'>
type PureWithdrawParams = Omit<WithdrawParams, 'orionUnit'>
type PureGetSwapMarketInfoParams = Omit<GetSwapInfoParams, 'orionBlockchain' | 'orionAggregator'>

export default class Exchange {
  private readonly orionUnit: OrionUnit;

  constructor(orionUnit: OrionUnit) {
    this.orionUnit = orionUnit;
  }

  public swapLimit(params: PureSwapLimitParams) {
    return swapLimit({
      ...params,
      orionUnit: this.orionUnit,
    });
  }

  public swapMarket(params: PureSwapMarketParams) {
    return swapMarket({
      ...params,
      orionUnit: this.orionUnit,
    });
  }

  public getSwapInfo(params: PureGetSwapMarketInfoParams) {
    return getSwapInfo({
      orionAggregator: this.orionUnit.orionAggregator,
      orionBlockchain: this.orionUnit.orionBlockchain,
      ...params,
    });
  }

  public deposit(params: PureDepositParams) {
    return deposit({
      ...params,
      orionUnit: this.orionUnit,
    });
  }

  public withdraw(params: PureWithdrawParams) {
    return withdraw({
      ...params,
      orionUnit: this.orionUnit,
    });
  }
}
