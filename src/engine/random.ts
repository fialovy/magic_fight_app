export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function roll(chance: number): boolean {
  return Math.random() < chance;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function coinFlip(): boolean {
  return Math.random() < 0.5;
}

// Shuffle an array in place using Fisher-Yates.
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Zalgo combining diacritics — stacked above and below each character.
const ABOVE = ['̍','̎','̄','̅','̿','̑','̆','̐','͒','͗','͑','̇','̈','̊','͂','̓'];
const BELOW = ['̖','̗','̘','̙','̜','̝','̞','̟','̠','̤','̥','̦','̩','̪','̫','̬','̭','̮','̯','̰','̱','̲','̳','̹','̺','̻','̼','͇','͈','͉','͍','͎'];

export function zalgoify(text: string): string {
  return text.split('').map(ch => {
    if (ch === ' ') return ch;
    let out = ch;
    const up = randomInt(0, 3);
    const dn = randomInt(0, 2);
    for (let i = 0; i < up; i++) out += pick(ABOVE);
    for (let i = 0; i < dn; i++) out += pick(BELOW);
    return out;
  }).join('');
}
