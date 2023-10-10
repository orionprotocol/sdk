import type Unit from '../index.js';
import deposit, { type DepositParams } from './deposit.js';
import getSwapInfo, { type GetSwapInfoParams } from './getSwapInfo.js';
import generateSwapCalldata, { type GenerateSwapCalldataParams } from './generateSwapCalldata.js';
import withdraw, { type WithdrawParams } from './withdraw.js';

type PureDepositParams = Omit<DepositParams, 'unit'>
type PureWithdrawParams = Omit<WithdrawParams, 'unit'>
type PureGetSwapMarketInfoParams = Omit<GetSwapInfoParams, 'blockchainService' | 'aggregator'>
type PureGenerateSwapCalldataParams = Omit<GenerateSwapCalldataParams, 'unit'>

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
    return generateSwapCalldata({
      ...params,
      unit: this.unit
    })
  }
}
