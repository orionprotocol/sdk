import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import clone from 'just-clone';
import { ERC20__factory } from '@orionprotocol/contracts';
import { utils } from '.';
import { APPROVE_ERC20_GAS_LIMIT, NATIVE_CURRENCY_PRECISION } from './constants';
import type {
  AggregatedBalanceRequirement, ApproveFix, Asset, BalanceIssue, BalanceRequirement, Source,
} from './types';
import { denormalizeNumber } from './utils';
import arrayEquals from './utils/arrayEquals';

export default class BalanceGuard {
  private readonly balances: Partial<
  Record<
  string,
  Record<
  'exchange' | 'wallet',
  BigNumber>
  >
  >;

  public readonly requirements: BalanceRequirement[] = [];

  private readonly nativeCryptocurrency: Asset;

  private readonly provider: ethers.providers.Provider;

  private readonly signer: ethers.Signer;

  private readonly logger?: (message: string) => void;

  constructor(
    balances: Partial<Record<string, Record<'exchange' | 'wallet', BigNumber>>>,
    nativeCryptocurrency: Asset,
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    logger?: (message: string) => void,
  ) {
    this.balances = balances;
    this.nativeCryptocurrency = nativeCryptocurrency;
    this.provider = provider;
    this.signer = signer;
    this.logger = logger;
  }

  registerRequirement(expense: BalanceRequirement) {
    this.requirements.push(expense);
  }

  // Used for case feeAsset === assetOut
  setExtraBalance(assetName: string, amount: BigNumber.Value, source: Source) {
    const assetBalance = this.balances[assetName];
    if (assetBalance == null) throw Error(`Can't set extra balance. Asset ${assetName} not found`);
    assetBalance[source] = assetBalance[source].plus(amount);
  }

  private async checkResetRequired(
    assetAddress: string,
    spenderAddress: string,
  ) {
    const walletAddress = await this.signer.getAddress();
    const tokenContract = ERC20__factory
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

  // By asset + sources + spender
  static aggregateBalanceRequirements(requirements: BalanceRequirement[]) {
    return requirements
      .reduce<AggregatedBalanceRequirement[]>((prev, curr) => {
        const aggregatedBalanceRequirement = prev.find(
          (item) => item.asset.address === curr.asset.address &&
            arrayEquals(item.sources, curr.sources) &&
            item.spenderAddress === curr.spenderAddress,
        );

        if (aggregatedBalanceRequirement != null) {
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
  }

  private readonly fixAllAutofixableBalanceIssues = async (
    balanceIssues: BalanceIssue[],
  ) => {
    const fixBalanceIssue = async (issue: BalanceIssue) => {
      const tokenContract = ERC20__factory.connect(issue.asset.address, this.provider);
      const approve = async ({ spenderAddress, targetAmount }: ApproveFix) => {
        const bnTargetAmount = new BigNumber(targetAmount);
        const unsignedApproveTx = await tokenContract
          .populateTransaction
          .approve(
            spenderAddress,
            bnTargetAmount.isZero()
              ? '0' // Reset
              : ethers.constants.MaxUint256, // Infinite approve
          );

        const walletAddress = await this.signer.getAddress();
        const nonce = await this.provider.getTransactionCount(walletAddress, 'pending');
        const gasPrice = await this.provider.getGasPrice();
        const network = await this.provider.getNetwork();

        unsignedApproveTx.chainId = network.chainId;
        unsignedApproveTx.gasPrice = gasPrice;
        unsignedApproveTx.nonce = nonce;
        unsignedApproveTx.from = walletAddress;
        const gasLimit = await this.provider.estimateGas(unsignedApproveTx);
        unsignedApproveTx.gasLimit = gasLimit;

        this.logger?.('Approve transaction signing...');
        const signedTx = await this.signer.signTransaction(unsignedApproveTx);
        const txResponse = await this.provider.sendTransaction(signedTx);
        this.logger?.(`${issue.asset.name} approve transaction sent ${txResponse.hash}. Waiting for confirmation...`);
        await txResponse.wait();
        this.logger?.(`${issue.asset.name} approve transaction confirmed.`);
      };
      await issue.fixes?.reduce(async (promise, item) => {
        await promise;
        if (item.type === 'byApprove') { await approve(item); return; }
        await promise;
      }, Promise.resolve());
    };

    const autofixableBalanceIssues = balanceIssues.filter((balanceIssue) => balanceIssue.fixes);

    await autofixableBalanceIssues.reduce(async (promise, item) => {
      await promise;
      await fixBalanceIssue(item);
    }, Promise.resolve());

    return balanceIssues.filter((item) => !autofixableBalanceIssues.includes(item));
  };

  async check(fixAutofixable?: boolean) {
    this.logger?.(`Balance requirements: ${this.requirements
      .map((requirement) => `${requirement.amount} ${requirement.asset.name} ` +
        `for '${requirement.reason}' ` +
        `from [${requirement.sources.join(' + ')}]`)
      .join(', ')}`);

    const remainingBalances = clone(this.balances);
    const aggregatedRequirements = BalanceGuard.aggregateBalanceRequirements(this.requirements);

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
      if (remainingBalance == null) throw new Error(`No ${asset.name} balance`);
      const itemsAmountSum = Object.values(items)
        .reduce<BigNumber>((p, c) => (c !== undefined ? p.plus(c) : p), new BigNumber(0));

      remainingBalance.exchange = remainingBalance.exchange.minus(itemsAmountSum);
      if (remainingBalance.exchange.lt(0)) {
        const lackAmount = remainingBalance.exchange.abs();
        const exchangeBalance = this.balances[asset.name]?.exchange;

        balanceIssues.push({
          asset,
          sources: ['exchange'],
          message: `Not enough ${asset.name} on exchange balance. ` +
            `Needed: ${itemsAmountSum.toString()}, available: ${(exchangeBalance ?? '[UNDEFINED]').toString()}. ` +
            `You need to deposit at least ${lackAmount.toString()} ${asset.name} into exchange contract`,
        });
      }
    });

    const exchangePlusWalletAggregatedRequirements = aggregatedRequirements
      .filter(({ sources }) => sources[0] === 'exchange' && sources[1] === 'wallet');

    const walletAddress = await this.signer.getAddress();
    // This requirements can be fulfilled by exchange + wallet
    await Promise.all(exchangePlusWalletAggregatedRequirements
      .map(async ({ asset, spenderAddress, items }) => {
        const remainingBalance = remainingBalances[asset.name];
        if (remainingBalance == null) throw new Error(`No ${asset.name} balance`);
        const itemsAmountSum = Object.values(items)
          .reduce<BigNumber>((p, c) => (c !== undefined ? p.plus(c) : p), new BigNumber(0));

        remainingBalance.exchange = remainingBalance.exchange.minus(itemsAmountSum);
        if (remainingBalance.exchange.lt(0)) {
          const lackAmount = remainingBalance.exchange.abs(); // e.g. -435.234234 to 434.234234

          let denormalizedAllowance: BigNumber;
          if (asset.address === ethers.constants.AddressZero) {
            denormalizedAllowance = remainingBalance.wallet;
          } else {
            if (spenderAddress === undefined) throw new Error(`Spender address is required for ${asset.name}`);
            const tokenContract = ERC20__factory.connect(asset.address, this.provider);
            const tokenDecimals = await tokenContract.decimals();
            const tokenAllowance = await tokenContract.allowance(walletAddress, spenderAddress);
            denormalizedAllowance = denormalizeNumber(tokenAllowance, tokenDecimals);
          }

          // Try to take lack amount from wallet
          const approvedWalletBalance = BigNumber
            .min(
              remainingBalance.wallet,
              denormalizedAllowance,
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

            const exchangeBalance = this.balances[asset.name]?.exchange;
            const available = exchangeBalance?.plus(approvedWalletBalance);

            const issueMessage = `Not enough ${asset.name} on exchange + wallet balance. ` +
                `Needed: ${itemsAmountSum.toString()}, available: ${(available ?? '[UNDEFINED]').toString()} ` +
              `(exchange: ${(exchangeBalance ?? '[UNKNOWN]').toString()}, available (approved): ${approvedWalletBalance.toString()}).` +
              ` ${approveIsHelpful
                ? `You need approve at least ${lackAmount.toString()} ${asset.name}`
                : 'Approve is not helpful'}`;
            if (approveIsHelpful) {
              if (spenderAddress === undefined) throw new Error(`Spender address is required for ${asset.name}`);
              const resetRequired = await this.checkResetRequired(
                asset.address,
                spenderAddress,
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
                fixes: [
                  ...resetRequired
                    ? [{
                      type: 'byApprove' as const,
                      targetAmount: 0,
                      spenderAddress,
                    }]
                    : [],
                  {
                    type: 'byApprove',
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
        if (remainingBalance == null) throw new Error(`No ${asset.name} balance`);
        const itemsAmountSum = Object.values(items)
          .reduce<BigNumber>((p, c) => (c !== undefined ? p.plus(c) : p), new BigNumber(0));

        let denormalizedAllowance: BigNumber;
        if (asset.address === ethers.constants.AddressZero) {
          denormalizedAllowance = remainingBalance.wallet;
        } else {
          if (spenderAddress === undefined) throw new Error(`Spender address is required for ${asset.name}`);
          const tokenContract = ERC20__factory.connect(asset.address, this.provider);
          const tokenDecimals = await tokenContract.decimals();
          const tokenAllowance = await tokenContract.allowance(walletAddress, spenderAddress);
          denormalizedAllowance = denormalizeNumber(tokenAllowance, tokenDecimals);
        }

        const approvedWalletBalance = BigNumber
          .min(
            remainingBalance.wallet,
            denormalizedAllowance,
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

          const issueMessage = `Not enough ${asset.name} on wallet balance. ` +
            `Needed: ${itemsAmountSum.toString()}, available (approved): ${approvedWalletBalance.toString()}. ${approveIsHelpful
              ? `You need approve at least ${lackAmount.toString()} ${asset.name}`
              : 'Approve is not helpful'}`;
          if (approveIsHelpful) {
            if (spenderAddress === undefined) throw new Error(`Spender address is required for ${asset.name}`);
            const resetRequired = await this.checkResetRequired(
              asset.address,
              spenderAddress,
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
              fixes: [
                ...resetRequired
                  ? [{
                    type: 'byApprove' as const,
                    targetAmount: 0,
                    spenderAddress,
                  }]
                  : [],
                {
                  type: 'byApprove',
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
      if (remainingBalance == null) throw new Error(`No ${asset.name} balance`);

      const itemsAmountSum = Object.values({ ...items, ...requiredApproves.items })
        .reduce<BigNumber>((p, c) => (c !== undefined ? p.plus(c) : p), new BigNumber(0));

      remainingBalance.wallet = remainingBalance.wallet.minus(itemsAmountSum);
      if (remainingBalance.wallet.lt(0)) {
        const lackAmount = remainingBalance.wallet.abs();
        balanceIssues.push({
          asset,
          sources: ['wallet'],
          message: `Not enough ${asset.name} on wallet balance. ` +
            `You need to deposit at least ${lackAmount.toString()} ${asset.name} into wallet contract`,
        });
      }
    });

    if (fixAutofixable !== undefined && fixAutofixable) {
      const unfixed = await this.fixAllAutofixableBalanceIssues(balanceIssues);
      if (unfixed.length > 0) throw new Error(`Balance issues: ${unfixed.map((issue, i) => `${i + 1}. ${issue.message}`).join('\n')}`);
    } else if (balanceIssues.length > 0) {
      throw new Error(
        `Balance issues (address ${walletAddress}): ` +
          `${balanceIssues.map((issue, i) => `${i + 1}. ${issue.message}`).join('\n')}`
      );
    }
  }
}
