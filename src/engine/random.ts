export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function roll(chance: number): boolean {
  return Math.random() < chance;
}
