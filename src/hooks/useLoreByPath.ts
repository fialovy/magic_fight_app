import { useEffect, useState } from 'react';
import { CHARACTER_REGISTRY } from '../data/characters';
import { loadLore } from '../engine/loader';

// Lore for every registry entry (including shapeshift forms), keyed by namePath.
// Entries appear as they load; loadLore caches, so this is cheap to reuse.
export function useLoreByPath(enabled = true): Record<string, string[]> {
  const [loreByPath, setLoreByPath] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!enabled) return;
    Object.values(CHARACTER_REGISTRY).forEach(({ namePath }) => {
      loadLore(namePath).then((lore) =>
        setLoreByPath((prev) => ({ ...prev, [namePath]: lore })),
      );
    });
  }, [enabled]);

  return loreByPath;
}
