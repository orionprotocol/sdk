import { z } from 'zod';

const pmmSchema = z.object({
    orionPMMRouterContractAddress: z.string()
});

export default pmmSchema