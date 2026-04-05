import { spawnSync } from 'node:child_process'
const pm = process.env.npm_execpath
const envArgs = ['--env-file=.env']

for (const cmd of [
  ['exec', 'prisma', 'migrate', 'deploy'],
  ['exec', 'next', 'build'],
]) {
  const result = spawnSync(process.execPath, [...envArgs, pm, ...cmd], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
