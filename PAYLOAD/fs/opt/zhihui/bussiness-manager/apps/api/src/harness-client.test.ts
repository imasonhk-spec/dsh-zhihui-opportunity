import {describe,expect,it} from 'vitest'
import {sanitizeOpportunityModelOutput} from './harness-client.js'

describe('Occamy opportunity output boundary',()=>{
  it('removes reasoning and control tokens',()=>{expect(sanitizeOpportunityModelOutput('<think>private</think><|im_start|>{"judgments":[],"actions":[]}<|im_end|>')).toBe('{"judgments":[],"actions":[]}')})
  it('rejects an unclosed reasoning block',()=>{expect(sanitizeOpportunityModelOutput('<analysis>private')).toBe('')})
  it('removes system disclosure blocks',()=>{expect(sanitizeOpportunityModelOutput('[SYSTEM] secret\n\n安全结果')).toBe('安全结果')})
})
