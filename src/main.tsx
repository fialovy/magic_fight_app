import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadSlim } from '@tsparticles/slim'
import { tsParticles } from '@tsparticles/engine'

loadSlim(tsParticles).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
