import { type Schema, type z } from 'zod';
import fetch from 'isomorphic-unfetch';

import {
  err, fromPromise, fromThrowable, ok,
} from 'neverthrow';

export default async function fetchWithValidation<DataOut, DataIn, ErrorOut, ErrorIn>(
  url: string,
  schema: Schema<DataOut, z.ZodTypeDef, DataIn>,
  options?: RequestInit,
  errorSchema?: Schema<ErrorOut, z.ZodTypeDef, ErrorIn>,
) {
  // Cases:
  // fetchError (no network, connection refused, connection break)
  // unknownFetchThrow
  // unknownGetTextError
  // unknownGetTextUnknownError
  // serverError
  // jsonParseError
  // jsonParseUnknownError
  // clientErrorWithResponsePayload
  // clientErrorPayloadParseError
  // clientError
  // payloadParseError
  // payload

  const fetchResult = await fromPromise(fetch(url, {
    ...options ?? {},
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      ...(options ? options.headers : {}),
    },
  }), (e) => {
    if (e instanceof Error) {
      return err({
        type: 'fetchError' as const,
        url,
        message: e.message,
        error: e,
      });
    }
    return err({
      type: 'unknownFetchThrow' as const,
      url,
      message: 'Unknown fetch error',
      error: e,
    });
  });

  if (fetchResult.isErr()) return fetchResult.error;

  const response = fetchResult.value;

  const textResult = await fromPromise(response.text(), (e) => {
    if (e instanceof Error) {
      return err({
        type: 'unknownGetTextError' as const,
        url,
        message: `Can't get response content: ${e.message}`,
        error: e,
      });
    }
    return err({
      type: 'unknownGetTextUnknownError' as const,
      url,
      message: "Can't get response content: unknown error",
      error: e,
    });
  });

  if (textResult.isErr()) return textResult.error;

  const text = textResult.value;

  if (response.status >= 500) { // Server error
    return err({
      type: 'serverError' as const,
      url,
      message: `Server error: ${response.status} ${response.statusText}`,
      status: response.status,
      text,
    });
  }

  const safeParseJson = fromThrowable(JSON.parse, (e) => {
    if (e instanceof Error) {
      return err({
        type: 'jsonParseError' as const,
        url,
        message: e.message,
        error: e,
      });
    }
    return err({
      type: 'jsonParseUnknownError' as const,
      url,
      message: 'Unknown JSON parse error',
      error: e,
    });
  });

  const jsonResult = safeParseJson(text);

  if (jsonResult.isErr()) {
    const textPayload = schema.safeParse(text);
    if (textPayload.success) return ok(textPayload.data);
    return jsonResult.error;
  }

  const json: unknown = jsonResult.value;

  if (response.status >= 400) { // Client error
    if (errorSchema) {
      const serverError = errorSchema.safeParse(json);
      if (serverError.success) {
        return err({
          type: 'clientErrorWithResponsePayload' as const,
          url,
          message: `Client error: ${response.status} ${response.statusText}. Server error: ${JSON.stringify(serverError.data)}`,
          status: response.status,
          payload: serverError.data,
        });
      }
      return err({
        type: 'clientErrorPayloadParseError' as const,
        url,
        message: 'Can\'t recognize error message. Response: ' + text,
        status: response.status,
        text,
        error: serverError.error,
      });
    }
    return err({
      type: 'clientError' as const,
      url,
      message: `Error: ${response.status} ${response.statusText}. Response: ${text}`,
      status: response.status,
      text,
    });
  }

  const payload = schema.safeParse(json);
  if (!payload.success) {
    const issuesMessages = payload.error.issues.map((issue) => `[${issue.path.join('.')}]  ${issue.message}`).join(', ');
    return err({
      type: 'payloadParseError' as const,
      url,
      message: `Can't recognize response payload: ${issuesMessages}`,
      error: payload.error,
    });
  }
  return ok(payload.data);
}
