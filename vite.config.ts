import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'

// Scans public/images/characters/on_cast/ at startup and exposes blast counts
// as a virtual module so runtime code never needs to probe the network.
function blastCountsPlugin() {
  const virtualId = 'virtual:blast-counts'
  const resolvedId = '\0' + virtualId

  return {
    name: 'blast-counts',
    resolveId(id: string) {
      if (id === virtualId) return resolvedId
    },
    load(id: string) {
      if (id !== resolvedId) return
      const dir = resolve(__dirname, 'public/images/characters/on_cast')
      const files = readdirSync(dir)
      const counts: Record<string, number> = {}
      for (const file of files) {
        const m = file.match(/^(.+)_mf_blast_(\d+)_face_right\.png$/)
        if (m) {
          const prefix = m[1]
          const n = parseInt(m[2], 10) + 1
          counts[prefix] = Math.max(counts[prefix] ?? 0, n)
        }
      }
      return `export const BLAST_COUNTS = ${JSON.stringify(counts)};`
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), blastCountsPlugin()],
})
