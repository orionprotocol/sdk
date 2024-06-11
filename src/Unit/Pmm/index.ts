import type Unit from '../index';
import { z } from 'zod';
import {pmmOrderSchema} from "./schemas/order";
import {simpleFetch} from "simple-typed-fetch";
import {ethers, Wallet} from "ethers";
import {BigNumber} from "bignumber.js";
import { ERC20__factory } from '@orionprotocol/contracts/lib/ethers-v6-cjs/index.js';
import {orionRFQContractABI} from "./abi/OrionRFQ";

export default class Pmm {
    private readonly unit: Unit;
    private readonly provider: ethers.Provider;
    private contractAddress: string;

    constructor(unit: Unit) {
        this.unit = unit;
        this.provider = unit.provider;
        this.contractAddress = '';
        //  this.contractAddress = '0x89357522c0ed6e557d39dc75290859246077bdfc';
    }

    private isInitialized() : boolean {
        return this.contractAddress !== '';
    }

    public async init() {
        if(this.isInitialized())
            return;
        const { orionPMMRouterContractAddress } = await simpleFetch(this.unit.blockchainService.getPmmInfo)();
        this.contractAddress = orionPMMRouterContractAddress;
    }

    public async getContractAddress() {
        await this.init();
        return this.contractAddress;
    }

    public async setAllowance(token: string, amount: string, signer: Wallet) {
        await this.init();

        const bnTargetAmount = new BigNumber(amount);
        const walletAddress = await signer.getAddress();

        const tokenContract = ERC20__factory
            .connect(token, this.unit.provider);

        const unsignedApproveTx = await tokenContract
            .approve.populateTransaction(
                this.contractAddress,
                bnTargetAmount.toString()
            );
        const nonce = await this.provider.getTransactionCount(walletAddress, 'pending');
        const { gasPrice, maxFeePerGas } = await this.provider.getFeeData();
        const network = await this.provider.getNetwork();

        if (gasPrice !== null)
            unsignedApproveTx.gasPrice = gasPrice;

        if(maxFeePerGas !== null)
            unsignedApproveTx.maxFeePerGas = maxFeePerGas;

        unsignedApproveTx.chainId = network.chainId;
        unsignedApproveTx.nonce = nonce;
        unsignedApproveTx.from = walletAddress;
        const gasLimit = await this.provider.estimateGas(unsignedApproveTx);
        unsignedApproveTx.gasLimit = gasLimit;

        const signedTx = await signer.signTransaction(unsignedApproveTx);
        const txResponse = await this.provider.broadcastTransaction(signedTx);
        await txResponse.wait();
    }

    public async fillRFQOrder(order : z.infer<typeof pmmOrderSchema>, signer: Wallet) {
        await this.init();

        if(!order.success)
            throw Error("Invalid order provided");

        const contract = new ethers.Contract(this.contractAddress, orionRFQContractABI, signer);

        // @ts-ignore
        return contract.fillOrderRFQ(order.order, order.signature, BigInt(0));
    }
}