import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import clone from 'just-clone';
import { contracts, utils } from '.';
import { APPROVE_ERC20_GAS_LIMIT, NATIVE_CURRENCY_PRECISION } from './constants';
import {
  AggregatedBalanceRequirement, Asset, BalanceIssue, BalanceRequirement, Source,
} from './types';

const arrayEquals = (a: unknown[], b: unknown[]) => a.length === b.length
  && a.every((value, index) => value === b[index]);

// By asset + sources + spender
const aggregateBalanceRequirements = (requirements: BalanceRequirement[]) => requirements
  .reduce<AggregatedBalanceRequirement[]>((prev, curr) => {
    const aggregatedBalanceRequirement = prev.find(
      (item) => item.asset.address === curr.asset.address
        && arrayEquals(item.sources, curr.sources)
        && item.spenderAddress === curr.spenderAddress,
    );

    if (aggregatedBalanceRequirement) {
      aggregatedBalanceRequirement.items = {
        ...aggregatedBalanceRequirement.items,
        [curr.reason]: curr.amount,
      };
      return prev;
    }
    return [
      ...prev,
      {
        asset: curr.asset,
        sources: curr.sources,
        spenderAddress: curr.spenderAddress,
        items: {
          [curr.reason]: curr.amount,
        },
      },

    ];
  }, []);

export default class BalanceGuard {
  private readonly balances: Partial<
    Record<
      string,
      Record<
        'exchange' | 'wallet' | 'allowance',
        BigNumber>
    >
    >;

  public readonly requirements: BalanceRequirement[] = [];

  private readonly nativeCryptocurrency: Asset;

  private readonly provider: ethers.providers.Provider;

  private readonly walletAddress: string;

  constructor(
    balances: Partial<Record<string, Record<'exchange' | 'wallet' | 'allowance', BigNumber>>>,
    nativeCryptocurrency: Asset,
    provider: ethers.providers.Provider,
    walletAddress: string,
  ) {
    this.balances = balances;
    this.nativeCryptocurrency = nativeCryptocurrency;
    this.provider = provider;
    this.walletAddress = walletAddress;
  }

  registerRequirement(expense: BalanceRequirement) {
    this.requirements.push(expense);
  }

  // Used for case feeAsset === assetOut
  setExtraBalance(assetName: string, amount: BigNumber.Value, source: Source) {
    const assetBalance = this.balances[assetName];
    if (!assetBalance) throw Error(`Can't set extra balance. Asset ${assetName} not found`);
    assetBalance[source] = assetBalance[source].plus(amount);
  }

  private async checkResetRequired(
    assetAddress: string,
    spenderAddress: string,
    walletAddress: string,
  ) {
    const tokenContract = contracts.ERC20__factory
      .connect(assetAddress, this.provider);
    const unsignedTx = await tokenContract.populateTransaction
      .approve(
        spenderAddress,
        ethers.constants.MaxUint256,
      );
    unsignedTx.from = walletAddress;
    let resetRequired = false;
    try {
      await this.provider.estimateGas(unsignedTx);
    } catch {
      resetRequired = true;
    }
    return resetRequired;
  }

  async check() {
    const remainingBalances = clone(this.balances);
    const aggregatedRequirements = aggregateBalanceRequirements(this.requirements);

    // Balance absorption order is important!
    // 1. Exchange-contract only
    // 2. Exchange + wallet (can produce approves requirements)
    // 3. Wallet balance (tokens) (can produce approves requirements)
    // 4. Wallet balance: native cryptocurrency

    const requiredApproves: AggregatedBalanceRequirement = {
      asset: this.nativeCryptocurrency,
      sources: ['wallet'],
      items: {},
    };

    const balanceIssues: BalanceIssue[] = [];

    const flattedAggregatedRequirements = Object
      .values(aggregatedRequirements)
      .flatMap((item) => item);

    const exchangeOnlyAggregatedRequirements = aggregatedRequirements
      .filter(({ sources }) => sources.length === 1 && sources[0] === 'exchange');

    exchangeOnlyAggregatedRequirements.forEach(({ asset, items }) => {
      const remainingBalance = remainingBalances[asset.name];
      if (!remainingBalance) throw new Error(`No ${asset.name} balance`);
      const itemsAmountSum = Object.values(items)
        .reduce<BigNumber>((p, c) => (c ? p.plus(c) : p), new BigNumber(0));

      remainingBalance.exchange = remainingBalance.exchange.minus(itemsAmountSum);
      if (remainingBalance.exchange.lt(0)) {
        const lackAmount = remainingBalance.exchange.abs();
        const exchangeBalance = this.balances?.[asset.name]?.exchange;

        balanceIssues.push({
          asset,
          sources: ['exchange'],
          message: `Not enough ${asset.name} on exchange balance. `
            + `Needed: ${itemsAmountSum.toString()}, available: ${exchangeBalance?.toString()}. `
            + `You need to deposit at least ${lackAmount.toString()} ${asset.name} into exchange contract`,
        });
      }
    });

    const exchangePlusWalletAggregatedRequirements = aggregatedRequirements
      .filter(({ sources }) => sources[0] === 'exchange' && sources[1] === 'wallet');

    // This requirements can be fulfilled by exchange + wallet
    await Promise.all(exchangePlusWalletAggregatedRequirements
      .map(async ({ asset, spenderAddress, items }) => {
        const remainingBalance = remainingBalances[asset.name];
        if (!remainingBalance) throw new Error(`No ${asset.name} balance`);
        const itemsAmountSum = Object.values(items)
          .reduce<BigNumber>((p, c) => (c ? p.plus(c) : p), new BigNumber(0));

        remainingBalance.exchange = remainingBalance.exchange.minus(itemsAmountSum);
        if (remainingBalance.exchange.lt(0)) {
          const lackAmount = remainingBalance.exchange.abs(); // e.g. -435.234234 to 434.234234
          // Try to take lack amount from wallet
          const approvedWalletBalance = BigNumber
            .min(
              remainingBalance.wallet,
              remainingBalance.allowance,
            // For native cryptocurrency allowance is always just current balance
            );
          if (lackAmount.lte(approvedWalletBalance)) { // We can take lack amount from wallet
            remainingBalance.wallet = remainingBalance.wallet.minus(lackAmount);
          } else {
          // We can't take lack amount from wallet. Is approve helpful?
            const approveAvailable = remainingBalance.wallet.gt(approvedWalletBalance)
              ? remainingBalance.wallet.minus(approvedWalletBalance)
              : new BigNumber(0);
            const approveIsHelpful = approveAvailable.gte(lackAmount);
            const targetApprove = approvedWalletBalance.plus(lackAmount);

            const exchangeBalance = this.balances?.[asset.name]?.exchange;
            const available = exchangeBalance?.plus(approvedWalletBalance);

            const issueMessage = `Not enough ${asset.name} on exchange + wallet balance. `
                + `Needed: ${itemsAmountSum.toString()}, available: ${available?.toString()} `
                + `(exchange: ${exchangeBalance?.toString()}, wallet: ${approvedWalletBalance.toString()}). ${approveIsHelpful
                  ? `You need to be allowed to spend another ${lackAmount.toString()} ${asset.name} more`
                  : 'Approve is not helpful'}`;
            if (approveIsHelpful) {
              if (!spenderAddress) throw new Error(`Spender address is required for ${asset.name}`);
              const resetRequired = await this.checkResetRequired(
                asset.address,
                spenderAddress,
                this.walletAddress,
              );
              const gasPriceWei = await this.provider.getGasPrice();
              const approveTransactionCost = ethers.BigNumber
                .from(APPROVE_ERC20_GAS_LIMIT)
                .mul(gasPriceWei);
              const denormalizedApproveTransactionCost = utils
                .denormalizeNumber(approveTransactionCost, NATIVE_CURRENCY_PRECISION);

              requiredApproves.items = {
                ...requiredApproves.items,
                ...resetRequired && {
                  [`Reset ${asset.name} from 'wallet' to ${spenderAddress}`]: denormalizedApproveTransactionCost.toString(),
                },
                [`Approve ${asset.name} from 'wallet' to ${spenderAddress}`]: denormalizedApproveTransactionCost.toString(),
              };
              balanceIssues.push({
                asset,
                sources: ['exchange', 'wallet'],
                approves: [
                  ...resetRequired ? [{
                    targetAmount: 0,
                    spenderAddress,
                  }] : [],
                  {
                    targetAmount: targetApprove,
                    spenderAddress,
                  },
                ],
                message: issueMessage,
              });
            } else {
              balanceIssues.push({
                asset,
                sources: ['exchange', 'wallet'],
                message: issueMessage,
              });
            }
          }
        }
      }));

    const walletTokensAggregatedRequirements = flattedAggregatedRequirements
      .filter(({ sources, asset }) => sources[0] === 'wallet' && asset.name !== this.nativeCryptocurrency.name);

    await Promise.all(walletTokensAggregatedRequirements
      .map(async ({ asset, spenderAddress, items }) => {
        const remainingBalance = remainingBalances[asset.name];
        if (!remainingBalance) throw new Error(`No ${asset.name} balance`);
        const itemsAmountSum = Object.values(items)
          .reduce<BigNumber>((p, c) => (c ? p.plus(c) : p), new BigNumber(0));
        const approvedWalletBalance = BigNumber
          .min(
            remainingBalance.wallet,
            remainingBalance.allowance,
          );
        if (itemsAmountSum.lte(approvedWalletBalance)) { // Approved wallet balance is enough
          remainingBalance.wallet = remainingBalance.wallet.minus(itemsAmountSum);
        } else {
        // We can't take lack amount from wallet. Is approve helpful?
          const lackAmount = itemsAmountSum.minus(approvedWalletBalance).abs();
          const approveAvailable = remainingBalance.wallet.gt(approvedWalletBalance)
            ? remainingBalance.wallet.minus(approvedWalletBalance)
            : new BigNumber(0);
          const approveIsHelpful = approveAvailable.gte(lackAmount);
          const targetApprove = approvedWalletBalance.plus(lackAmount);

          const issueMessage = `Not enough ${asset.name} on wallet balance. `
            + `Needed: ${itemsAmountSum.toString()}, available: ${approvedWalletBalance.toString()}. ${approveIsHelpful
              ? `You need to be allowed to spend another ${lackAmount.toString()} ${asset.name} more`
              : 'Approve is not helpful'}`;
          if (approveIsHelpful) {
            if (!spenderAddress) throw new Error(`Spender address is required for ${asset.name}`);
            const resetRequired = await this.checkResetRequired(
              asset.address,
              spenderAddress,
              this.walletAddress,
            );
            const gasPriceWei = await this.provider.getGasPrice();
            const approveTransactionCost = ethers.BigNumber
              .from(APPROVE_ERC20_GAS_LIMIT)
              .mul(gasPriceWei);
            const denormalizedApproveTransactionCost = utils
              .denormalizeNumber(approveTransactionCost, NATIVE_CURRENCY_PRECISION);

            requiredApproves.items = {
              ...requiredApproves.items,
              ...resetRequired && {
                [`Reset ${asset.name} from 'wallet' to ${spenderAddress}`]: denormalizedApproveTransactionCost.toString(),
              },
              [`Approve ${asset.name} from 'wallet' to ${spenderAddress}`]: denormalizedApproveTransactionCost.toString(),
            };
            balanceIssues.push({
              asset,
              sources: ['wallet'],
              approves: [
                ...resetRequired ? [{
                  targetAmount: 0,
                  spenderAddress,
                }] : [],
                {
                  targetAmount: targetApprove,
                  spenderAddress,
                },
              ],
              message: issueMessage,
            });
          } else {
            balanceIssues.push({
              asset,
              sources: ['wallet'],
              message: issueMessage,
            });
          }
        }
      }));

    const walletNativeAggregatedRequirements = flattedAggregatedRequirements
      .filter(({ sources, asset }) => sources[0] === 'wallet' && asset.name === this.nativeCryptocurrency.name);

    walletNativeAggregatedRequirements.forEach(({ asset, items }) => {
      const remainingBalance = remainingBalances[asset.name];
      if (!remainingBalance) throw new Error(`No ${asset.name} balance`);

      const itemsAmountSum = Object.values({ ...items, ...requiredApproves.items })
        .reduce<BigNumber>((p, c) => (c ? p.plus(c) : p), new BigNumber(0));

      remainingBalance.wallet = remainingBalance.wallet.minus(itemsAmountSum);
      if (remainingBalance.wallet.lt(0)) {
        const lackAmount = remainingBalance.wallet.abs();
        balanceIssues.push({
          asset,
          sources: ['wallet'],
          message: `Not enough ${asset.name} on wallet balance. `
            + `You need to deposit at least ${lackAmount.toString()} ${asset.name} into wallet contract`,
        });
      }
    });

    return balanceIssues;
  }
}
