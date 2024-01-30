import { z } from 'zod';

const inviteCodeLinkSchema = z.object({
  link: z
    .object({
      status: z.string(),
      referer: z.string(),
    })
    .nullable(),
  invite: z
    .object({
      code: z.string(),
      data: z.null(),
      limits: z.object({
        tag: z.string(),
        max_invites: z.number(),
        max_ref_depth: z.number(),
      }),
    })
    .nullable(),
});

export default inviteCodeLinkSchema;
