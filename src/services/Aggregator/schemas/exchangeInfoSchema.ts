import { z } from 'zod';
import pairConfigSchema from './pairConfigSchema.js';

const exchangeInfoSchema = z.array(pairConfigSchema);

export default exchangeInfoSchema;
