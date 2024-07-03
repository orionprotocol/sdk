import { z } from 'zod';
import infoSchema from './info-schema.js';

const getPointsAtResultSchema = z.object({
  pointsObject: z.record(z.string(), z.number()),
  currentPage: z.number(),
  totalElements: z.number(),
});

const getPointsAtSchema = z.object({
  result: getPointsAtResultSchema,
  info: infoSchema,
}).nullable();

export default getPointsAtSchema;
