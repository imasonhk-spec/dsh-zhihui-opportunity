/** WP-07 shadow-only Opportunity Context/Tools adapter.
 * Pure, dependency-free contract adapter: no database, network, or channel side effects.
 */
export type OpportunityPrincipal = {type: 'user' | 'service'; id: string; displayName?: string}
export type OpportunityContext = {
  tenantId: string
  principal: OpportunityPrincipal
  workspace: {type: 'opportunity'; id: string; code: 'OPP-MASTER'}
  opportunityId?: string
  action: 'read' | 'write' | 'admin'
  requestId: string
  traceId: string
  sourceApp: 'opportunity' | 'portal' | 'agentmm'
  authMethod: 'session' | 'service-token' | 'ticket'
  shadowMode: true
  productionGateway: false
}
export type ShadowErrorCode = 'request_context_invalid' | 'AUTH_REQUIRED' | 'workspace_forbidden' | 'resource_not_found' | 'identity_upstream_unavailable'
export type ShadowError = {status: 400 | 401 | 403 | 404 | 503; error: ShadowErrorCode; requestId?: string; traceId?: string}
export type HarnessEnvelope = {type: 'client-request'; rpcId: string; method: string; payload: Record<string, unknown>}

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const workspaceId = 'OPP-MASTER'

type OpportunityContextInput = Partial<Omit<OpportunityContext, 'workspace'>> & {workspace?: {type?: string; id?: string; code?: string}}

export function createOpportunityContext(input: OpportunityContextInput | undefined): OpportunityContext | ShadowError {
  if (!input || !input.tenantId || !input.principal?.id || !input.requestId || !input.traceId || !input.sourceApp || !input.authMethod) return {status: 400, error: 'request_context_invalid'}
  const requestId = input.requestId, traceId = input.traceId
  if (!requestIdPattern.test(requestId) || !requestIdPattern.test(traceId)) return {status: 400, error: 'request_context_invalid'}
  if (input.workspace?.type !== 'opportunity' || input.workspace.id !== workspaceId || input.workspace.code !== workspaceId) return {status: 403, error: 'workspace_forbidden', requestId, traceId}
  if (input.action !== 'read') return {status: 403, error: 'workspace_forbidden', requestId, traceId}
  return {tenantId: input.tenantId, principal: input.principal, workspace: {type: 'opportunity', id: workspaceId, code: workspaceId}, opportunityId: input.opportunityId, action: 'read', requestId, traceId, sourceApp: input.sourceApp, authMethod: input.authMethod, shadowMode: true, productionGateway: false}
}

export function mapOpportunityFailure(kind: 'unauthenticated' | 'forbidden' | 'missing' | 'upstream', requestId?: string, traceId?: string): ShadowError {
  const mapped = kind === 'unauthenticated' ? {status: 401 as const, error: 'AUTH_REQUIRED' as const} : kind === 'forbidden' ? {status: 403 as const, error: 'workspace_forbidden' as const} : kind === 'missing' ? {status: 404 as const, error: 'resource_not_found' as const} : {status: 503 as const, error: 'identity_upstream_unavailable' as const}
  return {...mapped, requestId, traceId}
}

export function createHarnessEnvelope(method: string, payload: Record<string, unknown>, rpcId: string): HarnessEnvelope {
  if (!method || !requestIdPattern.test(rpcId)) throw new Error('rpc_id_invalid')
  return {type: 'client-request', rpcId, method, payload: {...payload}}
}

export function isOpportunityWorkspace(value: unknown): value is {type: 'opportunity'; id: 'OPP-MASTER'; code: 'OPP-MASTER'} {
  return !!value && typeof value === 'object' && (value as {type?: unknown}).type === 'opportunity' && (value as {id?: unknown}).id === workspaceId && (value as {code?: unknown}).code === workspaceId
}

export function shadowToolPolicy(): {shadowMode: true; productionGateway: false; allowNetwork: false; allowWrites: false; allowExternalMessages: false; allowTokenExport: false} {
  return {shadowMode: true, productionGateway: false, allowNetwork: false, allowWrites: false, allowExternalMessages: false, allowTokenExport: false}
}
