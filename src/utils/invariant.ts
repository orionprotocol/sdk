export function invariant<T = unknown>(
  condition: T,
  errorMessage?: ((condition: T) => string) | string,
): asserts condition {
  if (condition) {
    return;
  }

  if (typeof errorMessage === 'undefined') {
    throw new Error('Invariant failed');
  }

  if (typeof errorMessage === 'string') {
    throw new Error(errorMessage);
  }

  throw new Error(errorMessage(condition));
}
