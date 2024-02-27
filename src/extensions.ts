export {};

declare global {
  interface Date {
    addSeconds(seconds: number): Date;
  }

  interface Array<T> {
    first(): T;
  }
}

Date.prototype.addSeconds = function (seconds: number) {
  return new Date(this.getTime() + seconds * 1000);
}

Array.prototype.first = function () {
  if (this.length === 0)
    throw new Error("first(): Array is empty");

  return this[0];
}
