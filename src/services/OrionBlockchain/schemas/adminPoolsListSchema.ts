import { z } from 'zod';

import { poolOnVerificationSchema } from './adminPoolSchema';

export default z.array(poolOnVerificationSchema);
