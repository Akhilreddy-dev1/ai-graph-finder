import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Project is published to GitHub Pages at https://<user>.github.io/ai-graph-finder/
// Set base to repository name so assets load at /ai-graph-finder/
export default defineConfig({
  base: '/ai-graph-finder/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
