import type Unit from '../index.js';
import deposit, { type DepositParams } from './deposit.js';
import getSwapInfo, { type GetSwapInfoParams } from './getSwapInfo.js';
import { generateSwapCalldataWithUnit, type GenerateSwapCalldataWithUnitParams } from './generateSwapCalldata.js';
import withdraw, { type WithdrawParams } from './withdraw.js';
import type { SwapLimitParams } from './swapLimit.js';
import swapLimit from './swapLimit.js';
import swapMarket from './swapMarket.js';
import type { SwapMarketParams } from './swapMarket.js';

type PureDepositParams = Omit<DepositParams, 'unit'>
type PureWithdrawParams = Omit<WithdrawParams, 'unit'>
type PureGetSwapMarketInfoParams = Omit<GetSwapInfoParams, 'blockchainService' | 'aggregator'>
type PureGenerateSwapCalldataParams = Omit<GenerateSwapCalldataWithUnitParams, 'unit'>
type PureSwapLimitParams = Omit<SwapLimitParams, 'unit'>
type PureSwapMarketParams = Omit<SwapMarketParams, 'unit'>

export default class Exchange {
  private readonly unit: Unit;

  constructor(unit: Unit) {
    this.unit = unit;
  }

  public getSwapInfo(params: PureGetSwapMarketInfoParams) {
    return getSwapInfo({
      aggregator: this.unit.aggregator,
      blockchainService: this.unit.blockchainService,
      ...params,
    });
  }

  public deposit(params: PureDepositParams) {
    return deposit({
      ...params,
      unit: this.unit,
    });
  }

  public withdraw(params: PureWithdrawParams) {
    return withdraw({
      ...params,
      unit: this.unit,
    });
  }

  public generateSwapCalldata(params: PureGenerateSwapCalldataParams) {
    return generateSwapCalldataWithUnit({
      ...params,
      unit: this.unit,
    })
  }

  public swapLimit(params: PureSwapLimitParams) {
    return swapLimit({
      ...params,
      unit: this.unit,
    });
  }

  public swapMarket(params: PureSwapMarketParams) {
    return swapMarket({
      ...params,
      unit: this.unit,
    });
  }
}
