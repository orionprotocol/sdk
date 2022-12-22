export default function toLowerCase<T extends string>(str: T): Lowercase<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return str.toLowerCase() as Lowercase<T>;
}
