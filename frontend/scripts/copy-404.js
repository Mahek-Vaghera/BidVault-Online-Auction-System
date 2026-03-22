import { promises as fs } from 'node:fs'
import path from 'node:path'

const distDir = path.resolve('dist')
const sourceFile = path.join(distDir, 'index.html')
const targetFile = path.join(distDir, '404.html')

try {
  await fs.copyFile(sourceFile, targetFile)
  console.log('Created dist/404.html for SPA fallback.')
} catch (error) {
  console.error('Failed to create dist/404.html:', error)
  process.exit(1)
}