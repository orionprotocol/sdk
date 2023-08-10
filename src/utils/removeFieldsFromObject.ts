const removeFieldsFromObject = <
  T extends Record<string, unknown>,
  K extends keyof T
>(
  obj: T,
  fields: K[]
): Omit<T, K> => {
  const result = { ...obj };
  for (const field of fields) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete result[field];
  }
  return result;
};

export default removeFieldsFromObject;
