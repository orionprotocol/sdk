import OrionUnit from '..';
import deposit, { DepositParams } from './deposit';
import swapMarket, { SwapMarketParams } from './swapMarket';

type PureSwapMarketParams= Omit<SwapMarketParams, 'orionUnit'>
type PureDepositParams= Omit<DepositParams, 'orionUnit'>

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

  public deposit(params: PureDepositParams) {
    return deposit({
      ...params,
      orionUnit: this.orionUnit,
    });
  }
}
