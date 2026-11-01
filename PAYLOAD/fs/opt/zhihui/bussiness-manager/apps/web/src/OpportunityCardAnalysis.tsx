import {useEffect,useState,type ReactNode} from 'react'
import {Button,Tag} from '@arco-design/web-react'

type Analysis={source:'model'|'rules';items:string[];pending:boolean;model:string;generatedAt:string|null}
export function OpportunityCardAnalysis({opportunityId,fallback}:{opportunityId:string;fallback:ReactNode}){
  const[analysis,setAnalysis]=useState<Analysis>(),[refresh,setRefresh]=useState(0)
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let force=refresh>0
    setAnalysis(undefined)
    const load=async()=>{
      try{
        const response=await fetch(`/opp-api/opportunities/${encodeURIComponent(opportunityId)}/ai-analysis`,{method:force?'POST':'GET',signal:controller.signal});force=false
        if(!response.ok)throw new Error('card_analysis_unavailable')
        const value=await response.json() as Analysis
        if(controller.signal.aborted)return
        setAnalysis(value)
        if(value.pending)timer=setTimeout(()=>void load(),5000)
      }catch{if(!controller.signal.aborted)setAnalysis({source:'rules',items:[],pending:false,model:'',generatedAt:null})}
    }
    void load()
    return()=>{controller.abort();if(timer)clearTimeout(timer)}
  },[opportunityId,refresh])
  return <><Tag size="small" color={analysis?.source==='model'?'purple':'gray'}>{analysis?.source==='model'?'模型分析':'规则兜底'}{!analysis||analysis.pending?' · 生成中':''}</Tag>{analysis?.source==='model'?<ul>{analysis.items.map((text,index)=><li key={index}>{text}</li>)}</ul>:fallback}<Button size="mini" type="text" disabled={!analysis||analysis.pending} onClick={event=>{event.stopPropagation();setRefresh(value=>value+1)}}>重新分析</Button></>
}
