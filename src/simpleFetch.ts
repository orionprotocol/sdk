import { type Schema, type z } from 'zod';
import fetchWithValidation from './fetchWithValidation';

// https://stackoverflow.com/a/64919133
class Wrapper<DataOut, DataIn, ErrorOut, ErrorIn> {
  // eslint-disable-next-line class-methods-use-this
  wrapped(
    url: string,
    schema: Schema<DataOut, z.ZodTypeDef, DataIn>,
    options?: RequestInit,
    errorSchema?: Schema<ErrorOut, z.ZodTypeDef, ErrorIn>,
  ) {
    return fetchWithValidation<DataOut, DataIn, ErrorOut, ErrorIn>(url, schema, options, errorSchema);
  }
}

type FetchWithValidationInternalType<O, I, EO, EI> = ReturnType<Wrapper<O, I, EO, EI>['wrapped']>

export default function simpleFetch<O, I, EO, EI, P extends unknown[]>(
  f: (...params: P) => FetchWithValidationInternalType<O, I, EO, EI>,
) {
  return async (...params: Parameters<typeof f>) => {
    const result = await f(...params);
    if (result.isErr()) {
      const { message, url } = result.error;
      throw new Error(`${message} (${url})`);
    }
    return result.value;
  };
}
