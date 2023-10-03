import { z } from 'zod';
import { SupportedChainId } from '../../../types.js';
import { ethers } from 'ethers';

const contractsAddressesSchema = z.record(
  z.nativeEnum(SupportedChainId),
  z.string().refine(ethers.isAddress)
);

export default contractsAddressesSchema;
