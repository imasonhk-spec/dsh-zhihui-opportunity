type Health = { ok: boolean; status?: string; version?: string; authRequired?: boolean; authConfigured?: boolean; [key: string]: unknown }
type WikiProject = { id: string; name: string }
const baseUrl = (process.env.LLM_WIKI_API_BASE_URL?.trim() || 'http://127.0.0.1:19928').replace(/\/$/, '')
const token = process.env.LLM_WIKI_API_TOKEN?.trim()
const timeoutMs = Number(process.env.LLM_WIKI_TIMEOUT_MS ?? 15000)
let projectCache: { expiresAt: number; projects: WikiProject[] } | undefined
export function isLlmWikiConfigured() { return Boolean(token) }
export async function llmWikiHealth(): Promise<Health> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { const response = await fetch(`${baseUrl}/api/v1/health`, { signal: controller.signal }); const value = await response.json() as Health; if (!response.ok) throw new Error(`llm_wiki_http_${response.status}`); return value }
  catch (error) { throw new Error(error instanceof Error && error.name === 'AbortError' ? 'llm_wiki_timeout' : 'llm_wiki_unavailable') }
  finally { clearTimeout(timer) }
}
export async function llmWikiSearch(projectId: string, query: string) {
  if (!token) throw new Error('llm_wiki_token_missing')
  const response = await fetch(`${baseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/search`, { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ query, topK: 8, includeContent: true }) })
  if (!response.ok) throw new Error(`llm_wiki_http_${response.status}`)
  return response.json()
}

export async function searchOpportunityKnowledge(input: { workspaceId: string; query: string; projectId?: string }) {
  const workspaceId = input.workspaceId.trim()
  const query = input.query.normalize('NFKC').trim()
  if (workspaceId !== 'OPP-MASTER') throw new Error('opportunity_workspace_forbidden')
  if (input.projectId?.trim()) throw new Error('opportunity_project_scope_client_forbidden')
  if (query.length < 2 || query.length > 2000) throw new Error('opportunity_knowledge_query_invalid')
  const projectId = await resolveOpportunityWikiProject(workspaceId)
  const value = await llmWikiSearch(projectId, query) as { results?: Array<Record<string, unknown>>; mode?: string }
  const results = value.results ?? []
  return { ok: true, source: 'llm-wiki', mode: value.mode ?? 'hybrid', workspaceId, projectId, results, total: results.length }
}

async function resolveOpportunityWikiProject(workspaceId: string) {
  const projects = await cachedProjects()
  const direct = projects.find(project => project.id === workspaceId)
  if (direct) return direct.id
  const configured = process.env.OPPORTUNITY_LLM_WIKI_PROJECT_ID?.trim()
  if (configured && projects.some(project => project.id === configured)) return configured
  if (workspaceId !== 'OPP-MASTER') throw new Error('opportunity_wiki_project_not_found')
  const matches = projects.filter(project => project.name === '项目知识库-政企商机知识库')
  if (matches.length !== 1) throw new Error(matches.length ? 'opportunity_wiki_project_ambiguous' : 'opportunity_wiki_project_not_found')
  return matches[0]!.id
}
async function cachedProjects() {
  if (projectCache && projectCache.expiresAt > Date.now()) return projectCache.projects
  if (!token) throw new Error('llm_wiki_token_missing')
  const response = await fetch(`${baseUrl}/api/v1/projects`, { headers: { accept: 'application/json', authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`llm_wiki_http_${response.status}`)
  const value = await response.json() as { projects?: WikiProject[] }
  const projects = value.projects ?? []
  projectCache = { expiresAt: Date.now() + 60_000, projects }
  return projects
}
