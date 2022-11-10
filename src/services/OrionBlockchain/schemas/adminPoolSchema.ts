import { z } from 'zod';

export enum PairStatusEnum {
  DOESNT_EXIST = -1,
  REVIEW = 0,
  ACCEPTED = 1,
  REJECTED = 2,
}

export const pairStatusSchema = z.nativeEnum(PairStatusEnum);

const tokenSchema = z.object({
  symbol: z.string(),
  icon: z.string().optional(),
  address: z.string(),
  decimals: z.number().optional(),
  isUser: z.boolean().optional(),
});

export const poolOnVerificationSchema = z.object({
  tokenA: tokenSchema,
  tokenB: tokenSchema,
  _id: z.string().optional(),
  address: z.string(),
  symbol: z.string(),
  isUser: z.boolean(),
  minQty: z.number().optional(),
  tokensReversed: z.boolean(),
  status: pairStatusSchema,
  updatedAt: z.number(),
  createdAt: z.number(),
  qtyPrecision: z.number().optional(),
  pricePrecision: z.number().optional(),
});

export type adminPoolType = z.infer<typeof poolOnVerificationSchema>;

export const adminPoolSchema = poolOnVerificationSchema;
