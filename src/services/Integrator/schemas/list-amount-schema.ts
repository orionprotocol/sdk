import { z } from 'zod';

const listAmountSchema = z.record(z.number(), z.number())

export default listAmountSchema;
