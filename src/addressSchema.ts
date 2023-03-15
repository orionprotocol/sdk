import { ethers } from 'ethers';
import { z } from 'zod';

const addressSchema = z.string().refine(ethers.utils.isAddress, (value) => ({
  message: `Should be an address, got ${value}`,
}));

export default addressSchema;
