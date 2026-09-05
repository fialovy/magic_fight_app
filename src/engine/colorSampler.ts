const cache = new Map<string, string>();
const edgeCache = new Map<string, string>();
const FALLBACK = '#b464ff';

// Samples the four corners of an image to get the background color.
// More reliable than dominant-color for panel backgrounds because character
// art backgrounds are almost always visible in the corners.
export async function sampleEdgeColor(imageUrl: string): Promise<string> {
  if (edgeCache.has(imageUrl)) return edgeCache.get(imageUrl)!;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 32;
        const PATCH = 4;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(FALLBACK); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        const patch = (sx: number, sy: number) => {
          for (let y = sy; y < sy + PATCH; y++) {
            for (let x = sx; x < sx + PATCH; x++) {
              const i = (y * SIZE + x) * 4;
              if (data[i + 3] < 128) continue;
              sumR += data[i]; sumG += data[i + 1]; sumB += data[i + 2];
              count++;
            }
          }
        };
        patch(0, 0);
        patch(SIZE - PATCH, 0);
        patch(0, SIZE - PATCH);
        patch(SIZE - PATCH, SIZE - PATCH);

        if (count === 0) { resolve(FALLBACK); return; }
        const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
        const color = `#${hex(sumR / count)}${hex(sumG / count)}${hex(sumB / count)}`;
        edgeCache.set(imageUrl, color);
        resolve(color);
      } catch {
        resolve(FALLBACK);
      }
    };
    img.onerror = () => resolve(FALLBACK);
    img.src = imageUrl;
  });
}

export async function sampleDominantColor(imageUrl: string): Promise<string> {
  if (cache.has(imageUrl)) return cache.get(imageUrl)!;

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(FALLBACK);
          return;
        }
        ctx.drawImage(img, 0, 0, 64, 64);
        const { data } = ctx.getImageData(0, 0, 64, 64);

        // Saturation-weighted average: ignore transparent, near-white, near-black, and gray pixels
        let sumR = 0,
          sumG = 0,
          sumB = 0,
          totalSat = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2],
            a = data[i + 3];
          if (a < 128) continue;
          const max = Math.max(r, g, b),
            min = Math.min(r, g, b);
          if (max > 240 && min > 200) continue; // near-white
          if (max < 20) continue; // near-black
          const sat = max - min;
          if (sat < 20) continue; // near-gray
          sumR += r * sat;
          sumG += g * sat;
          sumB += b * sat;
          totalSat += sat;
        }

        const toHex = (n: number) =>
          Math.round(n).toString(16).padStart(2, '0');
        const color =
          totalSat === 0
            ? FALLBACK
            : `#${toHex(sumR / totalSat)}${toHex(sumG / totalSat)}${toHex(sumB / totalSat)}`;
        cache.set(imageUrl, color);
        resolve(color);
      } catch {
        resolve(FALLBACK);
      }
    };
    img.onerror = () => resolve(FALLBACK);
    img.src = imageUrl;
  });
}
