interface WithReason {
  reason: string
}

type WithCodeError = Error & {
  code: number | string
}

interface WithMessage {
  message: string
}

type WithDataError = Error & {
  data: Record<string, unknown>
}

interface WithError {
  error: Record<string | number | symbol, unknown>
}

export const makePartial = <Key extends string | number | symbol, Value>(value: Record<Key, Value>): Partial<Record<Key, Value>> => value;

export function isUnknownObject(x: unknown): x is {
  [key in PropertyKey]: unknown
} {
  return x !== null && typeof x === 'object';
}

export function isKeyOfObject<T extends object>(
  key: string | number | symbol,
  obj: T,
): key is keyof T {
  return key in obj;
}

export function hasProp<T extends Record<string, unknown>, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function isWithCode(candidate: unknown): candidate is WithCodeError {
  if (!isUnknownObject(candidate) || !hasProp(candidate, 'code')) return false;
  const type = typeof candidate.code;
  return type === 'number' || type === 'string';
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
