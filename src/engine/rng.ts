function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;

  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

export function pickWeighted<T>(
  rng: () => number,
  weightedItems: readonly { item: T; weight: number }[],
): T {
  const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng() * totalWeight;

  for (const weighted of weightedItems) {
    cursor -= weighted.weight;
    if (cursor <= 0) return weighted.item;
  }

  return weightedItems[weightedItems.length - 1]!.item;
}
