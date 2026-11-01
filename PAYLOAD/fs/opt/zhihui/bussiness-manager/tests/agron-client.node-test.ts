import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HarnessClient } from '../apps/api/src/harness-client.ts'

test('opportunity Agron selection replaces old routing and sends the private bearer key server-side', async () => {
  const names = ['ZHIHUI_AI_PROVIDER','ZHIHUI_AI_BASE_URL','ZHIHUI_AI_API_KEY_FILE','DSH_PROVIDER','DSH_MODEL']
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]))
  const dir = await mkdtemp(join(tmpdir(), 'opportunity-agron-'))
  await writeFile(join(dir, 'key'), 'private-agron-key\n')
  let body: any; let authorization: string | undefined
  const server = createServer(async (req, res) => {
    authorization = req.headers.authorization
    const chunks=[]; for await (const c of req) chunks.push(c)
    body=JSON.parse(Buffer.concat(chunks).toString())
    res.end(JSON.stringify({ choices: [{ message: { content: '仅基于授权商机资料的结论。' } }] }))
  })
  server.listen(0,'127.0.0.1'); await once(server,'listening')
  process.env.ZHIHUI_AI_PROVIDER='agron-local'
  process.env.ZHIHUI_AI_BASE_URL=`http://127.0.0.1:${(server.address() as any).port}/v1`
  process.env.ZHIHUI_AI_API_KEY_FILE=join(dir,'key')
  process.env.DSH_PROVIDER='occamy-local'; process.env.DSH_MODEL='old-model'
  try {
    assert.equal(await new HarnessClient().analyze('只分析商机A'), '仅基于授权商机资料的结论。')
    assert.equal(authorization,'Bearer private-agron-key')
    assert.equal(body.model,'huiwen-2-agron:latest')
    assert.equal(body.messages.at(-1).content,'只分析商机A')
    assert.ok(body.max_tokens<=2048)
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve()))
    for (const name of names) { if(original[name]===undefined)delete process.env[name]; else process.env[name]=original[name] }
    await rm(dir,{recursive:true})
  }
})
