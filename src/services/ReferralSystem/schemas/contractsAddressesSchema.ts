import { z } from 'zod';
import { SupportedChainId } from '../../../types.js';
import { isAddress } from 'ethers/lib/utils.js';

const contractsAddressesSchema = z.record(
  z.nativeEnum(SupportedChainId),
  z.string().refine(isAddress)
);

export default contractsAddressesSchema;
