import { Schema } from 'zod';
import fetch, { RequestInit } from 'node-fetch';
import { isWithError, isWithReason, HttpError } from './utils';

export class ExtendedError extends Error {
  public url: string;

  public status: number | null;

  constructor(url: string, status: number | null, message: string) {
    super();
    this.url = url;
    this.status = status;
    this.message = message;
  }
}

export const fetchJsonWithValidation = async <T, U>(
  url: string,
  schema: Schema<T>,
  options?: RequestInit,
  errorSchema?: Schema<U>,
) => {
  const response = await fetch(url, {
    ...options || {},
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      ...(options ? options.headers : {}),
    },
  });
  const text = await response.text();

  // The ok read-only property of the Response interface contains a Boolean
  // stating whether the response was successful (status in the range 200 - 299) or not.

  if (!response.ok) {
    throw new HttpError(response.status, text, 'HTTP', response.statusText);
  }
  const json = JSON.parse(text);

  try {
    return schema.parse(json);
  } catch (e) {
    if (errorSchema) {
      const errorObj = errorSchema.parse(json);
      if (isWithError(errorObj) && isWithReason(errorObj.error)) {
        throw new ExtendedError(url, response.status, errorObj.error.reason);
      }
    }
    if (e instanceof Error) throw new ExtendedError(url, response.status, e.message);
    throw e;
  }
};
