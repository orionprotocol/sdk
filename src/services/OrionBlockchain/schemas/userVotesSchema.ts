import { z } from 'zod';

const userVotesSchema = z.record(
  z.string(),
);

export default userVotesSchema;
