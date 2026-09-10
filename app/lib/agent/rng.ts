/* Determinism.

   The mock must give the same answer for the same input every time, or
   a demo cannot be repeated and a screenshot cannot be trusted. So there
   is no `Math.random` anywhere in this project — every varying number,
   including the pace of the stream, comes from a hash of the input.

   The same rule kept the current app's confetti field deterministic, for
   the same reason: server and client have to agree. */

export function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** xorshift32. Returns a function producing floats in [0, 1). */
export function rng(seed: string | number) {
  let x = (typeof seed === "string" ? hash(seed) : seed) || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

/** Pick `n` items from `xs`, deterministically for a given seed. */
export function sample<T>(xs: readonly T[], n: number, seed: string): T[] {
  const r = rng(seed);
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  return out;
}
