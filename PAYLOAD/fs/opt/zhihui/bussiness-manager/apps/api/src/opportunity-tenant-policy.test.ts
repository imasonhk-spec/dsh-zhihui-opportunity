import {describe,expect,it} from 'vitest'
import {trustedTenantId} from './opportunity-tenant-policy.js'

const tenant='11111111-1111-4111-8111-111111111111'
const other='22222222-2222-4222-8222-222222222222'
describe('opportunity trusted tenant policy',()=>{
  it('fails closed with 503-class error when OPPORTUNITY_TENANT_ID is absent',()=>expect(()=>trustedTenantId(undefined,undefined)).toThrow('tenant_context_unavailable'))
  it('uses trusted scope when header is absent or matches',()=>{expect(trustedTenantId(tenant,undefined)).toBe(tenant);expect(trustedTenantId(tenant,tenant)).toBe(tenant)})
  it('does not disclose cross-tenant existence for a conflicting client claim',()=>expect(()=>trustedTenantId(tenant,other)).toThrow('resource_not_found'))
})
