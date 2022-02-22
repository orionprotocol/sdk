type WithReason = {
  reason: string;
}

type WithCodeError = Error & {
  code: number;
}

type WithMessage = {
  message: string;
}

type WithDataError = Error & {
  data: Record<string, unknown>;
}

type WithError ={
  error: Record<string | number | symbol, unknown>;
}

export function isUnknownObject(x: unknown): x is {
  [key in PropertyKey]: unknown
} {
  return x !== null && typeof x === 'object';
}

export function hasProp<T extends Record<string, unknown>, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function isWithCode(candidate: unknown): candidate is WithCodeError {
  if (!isUnknownObject(candidate)) return false;
  const hasCodeProperty = hasProp(candidate, 'code') && typeof candidate.code === 'number';
  return hasCodeProperty;
}

export function isWithReason(candidate: unknown): candidate is WithReason {
  if (!isUnknownObject(candidate)) return false;
  const hasReasonProperty = hasProp(candidate, 'reason') && typeof candidate.reason === 'string';
  return hasReasonProperty;
}

export function isWithMessage(candidate: unknown): candidate is WithMessage {
  if (!isUnknownObject(candidate)) return false;
  const hasMessageProperty = hasProp(candidate, 'message') && typeof candidate.message === 'string';
  return hasMessageProperty;
}

export function isWithError(candidate: unknown): candidate is WithError {
  if (!isUnknownObject(candidate)) return false;
  const hasErrorProperty = hasProp(candidate, 'error') && isUnknownObject(candidate.error);
  return hasErrorProperty;
}

export function isWithData(candidate: unknown): candidate is WithDataError {
  if (!isUnknownObject(candidate)) return false;
  const hasDataProperty = hasProp(candidate, 'data') && typeof candidate.data === 'object';
  return hasDataProperty;
}
