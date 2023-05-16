import { z } from 'zod';

import { poolOnVerificationSchema } from './adminPoolSchema.js';

export default z.array(poolOnVerificationSchema);
