import test from 'node:test'
import assert from 'node:assert/strict'
import { cardFingerprint, parseCardItems, getOpportunityCardAnalysis, cardTodoKeys } from '../apps/api/src/opportunity-card-analysis.ts'

test('legacy imported business keys resolve only an unambiguous authorized opportunity name',()=>{
  assert.deepEqual(cardTodoKeys('商机A项目',[{id:'legacy-A',name:'商机A'},{id:'legacy-B',name:'商机B'}]),['legacy-A'])
  assert.deepEqual(cardTodoKeys('商机A',[{id:'one',name:'商机A'},{id:'two',name:'商机A项目'}]),[])
  assert.deepEqual(cardTodoKeys('商机C',[{id:'legacy-A',name:'商机A'}]),[])
})

test('card cache changes with model, facts and current date', () => {
  const a=cardFingerprint('tenant-A',{name:'商机A',stage:'需求调研'},[],'old/model','2026-10-20')
  assert.notEqual(a,cardFingerprint('tenant-A',{name:'商机A',stage:'需求调研'},[],'agron-local/huiwen-2-agron:latest','2026-10-20'))
  assert.notEqual(a,cardFingerprint('tenant-B',{name:'商机A',stage:'需求调研'},[],'old/model','2026-10-20'))
  assert.notEqual(a,cardFingerprint('tenant-A',{name:'商机A',stage:'方案报价'},[],'old/model','2026-10-20'))
  assert.notEqual(a,cardFingerprint('tenant-A',{name:'商机A',stage:'需求调研'},[],'old/model','2026-10-21'))
})

test('card parser rejects incomplete, empty and non-text model output', () => {
  assert.deepEqual(parseCardItems('{"items":["项目处于需求调研阶段。","签单时间未填写。"]}'),['项目处于需求调研阶段。','签单时间未填写。'])
  for(const raw of ['{"items":["截断', '{"items":[]}', '{"items":[23]}','{"items":[""]}'])assert.throws(()=>parseCardItems(raw))
})

test('missing authorized opportunity never starts analysis or exposes a cached result', async () => {
  const result=await getOpportunityCardAnalysis({query:async()=>({rows:[]})},'tenant-A','unknown',async()=>{throw new Error('must not run')},'agron-local/huiwen-2-agron:latest')
  assert.equal(result,undefined)
})
