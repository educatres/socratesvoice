import { cp, mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })
for (const path of ['index.html', 'Socrates_Voice_AI_Spec.md', '.nojekyll']) await cp(path, `dist/${path}`)
await cp('css', 'dist/css', { recursive: true })
await cp('js', 'dist/js', { recursive: true })
await cp('avatar', 'dist/avatar', { recursive: true })
console.log('Built static site in dist/')
