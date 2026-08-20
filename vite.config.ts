import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'

// Scans public/images/characters/on_cast/ at startup and exposes the number
// of combat images each character has so we don't have to probe for it over
// and over and get wonky outta sync
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
          // first (capturing group) - the character name
          const prefix = m[1]
          // other (capturing group) - the image number, 0 indexed
          const n = parseInt(m[2], 10) + 1
          // find the max because we threw all the characters into one dir lol
          counts[prefix] = Math.max(counts[prefix] ?? 0, n)
        }
      }
      return `export const BLAST_COUNTS = ${JSON.stringify(counts)};`
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), blastCountsPlugin()],
})
