import { createHash } from 'node:crypto'

type Queryable = { query(sql: string, values?: any[]): Promise<{ rows: any[] }> }
type CardAnalysis = { source: 'model'|'rules'; items: string[]; pending: boolean; model: string; generatedAt: string|null }
const running = new Map<string, Promise<void>>()
let queue = Promise.resolve()

export function cardTodoKeys(name: string, references: Array<{id:string;name:string}>) {
  const normalize=(value:string)=>value.toLowerCase().replace(/[\s（）()“”"'·—_-]/g,'').replace(/项目|建设|需求/g,'')
  const matches=references.filter(item=>normalize(item.name)===normalize(name))
  return matches.length===1?[matches[0].id]:[]
}

export function cardFingerprint(tenant: string, opportunity: Record<string,unknown>, todos: unknown[], model: string, date: string) {
  return createHash('sha256').update(JSON.stringify({ version: 1, tenant, opportunity, todos, model, date })).digest('hex')
}

export function parseCardItems(text: string): string[] {
  const value=JSON.parse(text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')) as { items?: unknown }
  if(!Array.isArray(value.items)||!value.items.length||value.items.length>3||value.items.some(x=>typeof x!=='string'||!x.trim()||x.length>240)) throw new Error('opportunity_card_analysis_invalid')
  return value.items.map(x=>String(x).trim())
}

export async function getOpportunityCardAnalysis(pool: Queryable, tenant: string, id: string,
  analyze: (prompt: string)=>Promise<string>, model: string, force=false,
  reportError: (error: unknown)=>void = ()=>{}, references: Array<{id:string;name:string}>=[]) : Promise<CardAnalysis|undefined> {
  const found=await pool.query('SELECT id,name,stage,status,estimated_amount,probability_band,expected_sign_date,latest_status,presales_owner,customer_needs,updated_at FROM opportunity.opportunities WHERE tenant_id=$1 AND id::text=$2 AND is_current=true',[tenant,id])
  const opportunity=found.rows[0]
  if(!opportunity)return undefined
  // Older imports store static reference IDs in opportunity_key instead of the UUID FK.
  const keys=cardTodoKeys(opportunity.name,references)
  const todos=await pool.query(`SELECT t.title,t.status,t.due_date,t.owner_name,t.result_remark,t.updated_at FROM opportunity.market_solution_todos t JOIN opportunity.opportunities o ON o.id::text=$2 AND o.tenant_id=$1 WHERE (t.opportunity_id=o.id OR (t.opportunity_id IS NULL AND t.opportunity_key=ANY($3::text[]))) AND t.import_id=(SELECT id FROM opportunity.market_solution_todo_imports ORDER BY imported_at DESC,id DESC LIMIT 1) ORDER BY t.established_date DESC,t.source_row LIMIT 30`,[tenant,id,keys])
  const date=new Date().toISOString().slice(0,10)
  const fingerprint=cardFingerprint(tenant,opportunity,todos.rows,model,date)
  const cached=await pool.query('SELECT fingerprint,items,source,model_source,generated_at FROM opportunity.card_analyses WHERE tenant_id=$1 AND opportunity_id=$2',[tenant,opportunity.id])
  const row=cached.rows[0]
  const valid=row?.fingerprint===fingerprint
  const key=`${tenant}:${id}:${fingerprint}`
  const view:CardAnalysis=valid?{source:row.source,items:row.items,pending:running.has(key),model:row.model_source,generatedAt:row.generated_at instanceof Date?row.generated_at.toISOString():row.generated_at}:{source:'rules',items:[],pending:true,model,generatedAt:null}
  if(valid&&!force)return view
  if(!running.has(key)) {
    // Cards can mount together; serialize their background work instead of flooding model slots.
    const task=queue.then(async()=>{
      let source:'model'|'rules'='model'; let items:string[]=[]
      try {
        const prompt=`你是智汇商机推进分析助手。只依据下列当前商机及最近批次最多30条明确关联待办，输出项目卡片的3条简短分析，依次说明当前阶段与已填成单率、签单节点风险、推进阻塞及下一步。不得按阶段编造新的概率，不得新增金额、人物、日期或完成事实；缺失资料明确说明。每条不超过80字。只返回严格JSON：{"items":["分析1","分析2","分析3"]}，不要Markdown。今天：${date}。商机：${JSON.stringify(opportunity)}。待办：${JSON.stringify(todos.rows)}`
        items=parseCardItems(await analyze(prompt))
      } catch(error) { source='rules';reportError(error) }
      await pool.query(`INSERT INTO opportunity.card_analyses(tenant_id,opportunity_id,fingerprint,items,source,model_source,generated_at) VALUES($1,$2,$3,$4::jsonb,$5,$6,now()) ON CONFLICT(tenant_id,opportunity_id) DO UPDATE SET fingerprint=excluded.fingerprint,items=excluded.items,source=excluded.source,model_source=excluded.model_source,generated_at=excluded.generated_at`,[tenant,opportunity.id,fingerprint,JSON.stringify(items),source,model])
    }).catch(reportError).finally(()=>running.delete(key))
    queue=task
    running.set(key,task)
  }
  return {...view,pending:true}
}
