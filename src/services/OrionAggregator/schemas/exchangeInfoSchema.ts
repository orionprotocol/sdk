import { z } from 'zod';
import pairConfigSchema from './pairConfigSchema';

const exchangeInfoSchema = z.array(pairConfigSchema);

export default exchangeInfoSchema;
