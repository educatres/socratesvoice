import { readFile } from 'node:fs/promises'
import { SourceTextModule } from 'node:vm'

const files = ['js/app.js', 'js/gemini-client.js', 'js/settings.js', 'js/speech-recognition.js', 'js/speech-synthesis.js', 'js/state-machine.js', 'js/avatar.js']
for (const file of files) {
  new SourceTextModule(await readFile(file, 'utf8'), { identifier: file })
  console.log(`syntax ok: ${file}`)
}
