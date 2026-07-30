export const Tlog = (() => {
  let last = 0;
  return (...a: any[]) =>
    Date.now() - last > 10000 && ((last = Date.now()), console.log(...a));
})();

export const Slog = (() => {
  let last = 0;
  return (...a: any[]) =>
    Date.now() - last > 8000 && ((last = Date.now()), console.log(...a));
})();

export const Rlog = (() => {
  let last = 0;
  return (...a: any[]) =>
    Date.now() - last > 4000 && ((last = Date.now()), console.log(...a));
})();

export const Plog = (() => {
  let last = 0;
  return (...a: any[]) =>
    Date.now() - last > 2000 && ((last = Date.now()), console.log(...a));
})();
