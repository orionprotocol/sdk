export class SafeArray<T> extends Array<T> {
  
  public static override from<T>(array: T[]): SafeArray<T> {
    return new SafeArray(array);
  }

  constructor(array: T[]) {
    super(array.length);
    array.forEach((element, index) => {
      this[index] = element;
    })
  }

  public toArray(): T[] {
    return [...this];
  }

  public override map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): SafeArray<U> {
    return new SafeArray(super.map(callbackfn, thisArg));
  }

  public override filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): SafeArray<T> {
    return new SafeArray(super.filter(callbackfn, thisArg));
  }

  public get<T>(this: SafeArray<T>, index: number): T {
    const value = this.at(index);
    if (value === undefined) {
      throw new Error(`Element at index ${index} is undefined. Array: ${this}`)
    }
    return value
  }

  public last<T>(this: SafeArray<T>): T {
    return this.get(this.length - 1)
  }

  public first<T>(this: SafeArray<T>): T {
    return this.get(0)
  }
}

export function safeGet<V>(obj: Partial<Record<string, V>>, key: string, errorMessage?: string) {
  const value = obj[key];
  if (value === undefined) throw new Error(`Key '${key.toString()}' not found in object. Available keys: ${Object.keys(obj).join(', ')}.${errorMessage ? ` ${errorMessage}` : ''}`);
  return value;
}