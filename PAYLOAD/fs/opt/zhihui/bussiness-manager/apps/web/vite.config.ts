import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 智汇统一登录：静态数据文件（json/表格/文档）必须携带有效会话才可下载
const zhDataGuard = {
  name: 'zh-data-guard',
  configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
    server.middlewares.use(async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
      const pathOnly = (req.url ?? '/').split('?')[0]
      if (!/\.(json|xlsx|xls|docx|doc|pdf|csv)$/i.test(pathOnly)) return next()
      try {
        const response = await fetch(`${process.env.PROJECT_API_PROXY_TARGET ?? 'http://127.0.0.1:3100'}/api/auth/me`, { headers: { cookie: req.headers.cookie ?? '' } })
        if (response.ok) return next()
      } catch { /* 校验失败按未登录处理 */ }
      res.statusCode = 401
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'AUTH_REQUIRED' }))
    })
  },
}

export default defineConfig({ plugins:[react(), zhDataGuard], root:'apps/web', server:{host:'0.0.0.0',port:Number(process.env.OPPORTUNITY_WEB_PORT??3210),allowedHosts:['.trycloudflare.com'],proxy:{'/shared-api':{target:process.env.PROJECT_API_PROXY_TARGET??'http://127.0.0.1:3100',changeOrigin:true,rewrite:path=>path.replace(/^\/shared-api/,'/api')},'/opp-api':{target:process.env.OPPORTUNITY_API_PROXY_TARGET??'http://127.0.0.1:3211',changeOrigin:true,rewrite:path=>path.replace(/^\/opp-api/,'/api')}}}, build:{outDir:'../../dist/web', emptyOutDir:true} })
