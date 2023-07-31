import { z } from 'zod';

const poolsV3InfoSchema = z.object({
  OrionV3Factory: z.string(),
  OrionV3Pool: z.string(),
  OrionV3NFTManager: z.string(),
});

export default poolsV3InfoSchema;
