import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const required = ['OPENAI_API_KEY', 'OPENROUTER_API_KEY']
const missing = required.filter((name) => !process.env[name])
const tmdbToken =
  process.env.TMDB_ACCESS_TOKEN ?? process.env.VITE_TMDB_ACCESS_TOKEN
if (!tmdbToken) missing.push('TMDB_ACCESS_TOKEN')
if (missing.length) {
  throw new Error(
    `Missing ${missing.join(', ')}. Run with bun --env-file=/path/to/.env.local run dev:local`,
  )
}

if (
  Bun.spawnSync(['docker', 'info'], { stdout: 'ignore', stderr: 'ignore' })
    .exitCode !== 0
) {
  throw new Error('Start Docker Desktop before running dev:local')
}

function statusVariables() {
  const result = Bun.spawnSync(['supabase', 'status', '-o', 'env'], {
    stdout: 'pipe',
    stderr: 'ignore',
  })
  if (result.exitCode !== 0) return undefined
  return Object.fromEntries(
    new TextDecoder()
      .decode(result.stdout)
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const equals = line.indexOf('=')
        return [line.slice(0, equals), line.slice(equals + 1).replace(/^"|"$/g, '')]
      }),
  )
}

let local = statusVariables()
if (!local) {
  const started = Bun.spawnSync(['supabase', 'start'], {
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (started.exitCode !== 0) throw new Error('Local Supabase failed to start')
  local = statusVariables()
}

const apiUrl = local?.API_URL
const anonKey = local?.ANON_KEY ?? local?.PUBLISHABLE_KEY
if (!apiUrl || !anonKey) {
  throw new Error('supabase status did not return API_URL and an API key')
}

const tempDir = mkdtempSync(join(tmpdir(), 'movie-picker-functions-'))
const secretsFile = join(tempDir, 'secrets.env')
writeFileSync(
  secretsFile,
  [
    ...required.map((name) => `${name}=${JSON.stringify(process.env[name])}`),
    `TMDB_ACCESS_TOKEN=${JSON.stringify(tmdbToken)}`,
    ...['OPENAI_MODEL', 'OPENAI_BASE_URL'].flatMap((name) =>
      process.env[name] ? [`${name}=${JSON.stringify(process.env[name])}`] : [],
    ),
  ].join('\n'),
  { mode: 0o600 },
)

let edge: ReturnType<typeof Bun.spawn> | undefined
let frontend: ReturnType<typeof Bun.spawn> | undefined
const stop = () => {
  edge?.kill()
  frontend?.kill()
  rmSync(tempDir, { recursive: true, force: true })
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)

try {
  edge = Bun.spawn(
    [
      'supabase',
      'functions',
      'serve',
      'recommend-movies',
      '--env-file',
      secretsFile,
    ],
    { stdout: 'inherit', stderr: 'inherit' },
  )
  frontend = Bun.spawn(['bun', 'run', 'dev', '--', '--host', '127.0.0.1'], {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: apiUrl,
      VITE_SUPABASE_ANON_KEY: anonKey,
      VITE_LOCAL_SUPABASE: 'true',
    },
    stdout: 'inherit',
    stderr: 'inherit',
  })

  console.log('Local app: http://127.0.0.1:5173')
  console.log('Use "Local test sign-in" to test the AI picker and history.')
  await Promise.race([edge.exited, frontend.exited])
} finally {
  stop()
}
