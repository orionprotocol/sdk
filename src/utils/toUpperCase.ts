export default function toUpperCase<T extends string>(str: T): Uppercase<T> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return str.toUpperCase() as Uppercase<T>;
}
