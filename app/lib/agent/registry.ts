/* Reads, by id.

   A plan carries `readId` rather than a copy of the read, so the two
   cannot drift. Something has to resolve that id back to a read; in a
   real build that is a fetch, and here it is a module map populated the
   moment a read finishes.

   Ids are `read-<hash of the url>`, so a page opened cold — a deep link,
   a refresh — can still recover the read by hashing the urls we hold
   fixtures for. Nothing on screen then has to apologise for missing its
   evidence. */

import type { BrandRead } from "./types";
import { FIXTURES, fixtureFor } from "../mock/reads";
import { hash } from "./rng";

const reads = new Map<string, BrandRead>();

export const readIdFor = (url: string) => `read-${hash(url).toString(36)}`;

export function rememberRead(r: BrandRead) {
  reads.set(r.id, r);
}

const ALL_LAYERS: BrandRead["done"] = [
  "identity", "category", "priceBand", "bestsellers",
  "voice", "socials", "markets", "seasonality", "eligibility",
];

/** Never undefined. An unrecognised id falls back to the demo store,
    which keeps a deep link working rather than dead-ending. */
export function getRead(id: string): BrandRead {
  const hit = reads.get(id);
  if (hit) return hit;

  const url = Object.keys(FIXTURES).find((u) => readIdFor(u) === id) ?? "ounass.com";
  const built = fixtureFor(url)(id);
  built.done = [...ALL_LAYERS];
  reads.set(id, built);
  return built;
}
