/** Race `promise` against a timer; on timeout resolve `fallback` (no throw). */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: T) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const id = window.setTimeout(() => finish(fallback), ms);
    Promise.resolve(promise).then(
      (v) => {
        window.clearTimeout(id);
        finish(v);
      },
      () => {
        window.clearTimeout(id);
        finish(fallback);
      }
    );
  });
}
