import { z } from 'zod';

const userEarnedSchema = z.record(
  z.string(),
);

export default userEarnedSchema;
