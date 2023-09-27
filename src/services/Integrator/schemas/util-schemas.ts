import { ethers } from 'ethers';
import { z } from 'zod';

export const evmAddressSchema = z
  .string()
  .refine(ethers.utils.isAddress, (v) => ({
    message: `${v} is not a valid address`,
  }));

export const hexStringSchema = z
  .string()
  .refine(ethers.utils.isAddress, (v) => ({
    message: `${v} is not a valid hex string`,
  }));
