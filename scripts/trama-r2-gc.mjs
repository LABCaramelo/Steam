import { cleanupDeletedFiles } from '../server/trama/files.mjs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Uses only this checkout's server configuration. No credentials are printed.
try { process.loadEnvFile(resolve(fileURLToPath(new URL('..',import.meta.url)),'.env')) }
catch (error) { if (error.code !== 'ENOENT') throw error }

const dryRun = !process.argv.includes('--apply')
try {
  const result = await cleanupDeletedFiles({ dryRun })
  console.log(JSON.stringify(result,null,2))
  if (result.failed || result.rejected) process.exitCode=1
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Não foi possível executar a manutenção da Trama.')
  process.exitCode=1
}
