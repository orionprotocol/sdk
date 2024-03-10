import {z} from "zod";

export const pmmOrderQuotationSchema = z.object({
    info: z.string().default(''),
    makerAsset: z.string().default(''),
    takerAsset: z.string().default(''),
    maker: z.string().default(''),
    allowedSender: z.string().default(''),
    makingAmount: z.string().default(''),
    takingAmount: z.string().default(''),
});

export const pmmOrderSchema = z.object({
    quotation: pmmOrderQuotationSchema.default({}),
    signature: z.string().default(''),
    success: z.boolean().default(false),
    error: z.string().default(''),
});