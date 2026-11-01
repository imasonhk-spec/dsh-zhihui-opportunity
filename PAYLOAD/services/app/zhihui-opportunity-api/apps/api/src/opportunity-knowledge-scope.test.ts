import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchOpportunityKnowledge } from './llm-wiki-client.js'

afterEach(() => vi.unstubAllGlobals())

describe('OPP-MASTER knowledge scope', () => {
  it('rejects non-portfolio workspace before network access', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(searchOpportunityKnowledge({ workspaceId: 'PRJ-001', query: '查询风险' })).rejects.toThrow('opportunity_workspace_forbidden')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects client supplied wiki projectId before network access', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(searchOpportunityKnowledge({ workspaceId: 'OPP-MASTER', query: '查询风险', projectId: 'forged-project' })).rejects.toThrow('opportunity_project_scope_client_forbidden')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
