
const precision = (n: number) => +n.toPrecision(15);
export const multiply = (a: number, b:number) => precision(a * b);
export const divide = (a: number, b: number) => precision(a / b);
export const round = (n: number, position = 0) => {
  const _p = 10 ** position;
  return Math.round(precision(n * _p)) / _p;
};