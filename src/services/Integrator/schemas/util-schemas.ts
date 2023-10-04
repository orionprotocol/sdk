import { isHexString, isAddress } from 'ethers';
import { z } from 'zod';

export const evmAddressSchema = z
  .string()
  .refine(isAddress, (v) => ({
    message: `${v} is not a valid address`,
  }));

export const hexStringSchema = z
  .string()
  .refine(isHexString, (v) => ({
    message: `${v} is not a valid hex string`,
  }));
