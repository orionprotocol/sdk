declare global {
  interface Array<T> {
    get(index: number): T;
    last(): T
    first(): T
  }
}

if (!Array.prototype.get) {
  Array.prototype.get = function <T>(this: T[], index: number): T {
    const value = this.at(index);
    if (value === undefined) {
      throw new Error(`Element at index ${index} is undefined. Array: ${this}`)
    }
    return value
  }
}

if (!Array.prototype.last) {
  Array.prototype.last = function <T>(this: T[]): T {
    return this.get(this.length - 1)
  }
}

if (!Array.prototype.first) {
  Array.prototype.first = function <T>(this: T[]): T {
    return this.get(0)
  }
}