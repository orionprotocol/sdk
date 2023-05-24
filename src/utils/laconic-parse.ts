import type { ZodTypeDef, Schema } from 'zod';

const laconicParse = <DataOut, DataIn>(data: DataIn, schema: Schema<DataOut, ZodTypeDef, DataIn>) => {
  const payload = schema.safeParse(data);
  if (!payload.success) {
    const issuesMessages = payload.error.issues.map(issue => `[${issue.path.join('.')}]  ${issue.message}`).join(', ');
    throw new Error(`Can't recognize payload: ${issuesMessages}`);
  }
  return payload.data;
}

export default laconicParse;
