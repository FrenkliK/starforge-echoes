export class SeededRng {
  constructor(seed) {
    this.setSeed(seed ?? "0");
  }

  setSeed(seed) {
    this.seed = String(seed);
    let h = 2166136261;
    for (let i = 0; i < this.seed.length; i += 1) {
      h ^= this.seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    this.state = h >>> 0;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(list) {
    return list[this.int(0, list.length - 1)];
  }
}

export const seedOfDay = () => {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
