import OrionUnit from '..';
import deposit, { DepositParams } from './deposit';
import getSwapInfo, { GetSwapInfoParams } from './getSwapInfo';
import swapMarket, { SwapMarketParams } from './swapMarket';
import withdraw, { WithdrawParams } from './withdraw';

type PureSwapMarketParams= Omit<SwapMarketParams, 'orionUnit'>
type PureDepositParams = Omit<DepositParams, 'orionUnit'>
type PureWithdrawParams = Omit<WithdrawParams, 'orionUnit'>
type PureGetSwapMarketInfoParams= Omit<GetSwapInfoParams, 'orionBlockchain' | 'orionAggregator'>

export default class Exchange {
  private readonly orionUnit: OrionUnit;

  constructor(orionUnit: OrionUnit) {
    this.orionUnit = orionUnit;
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
