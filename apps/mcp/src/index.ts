import 'dotenv/config'
import express from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { validateApiKey, getApiKeyFromHeader } from './auth.js'
import { registerTools } from './tools.js'

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'worldcup26-mcp', version: '0.1.0' })
})

// MCP endpoint — stateless per-request server
app.post('/mcp', async (req, res) => {
  const apiKey = getApiKeyFromHeader(req.headers.authorization)
  if (!apiKey) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <apiKey>' })
    return
  }

  const user = await validateApiKey(apiKey)
  if (!user) {
    res.status(401).json({ error: 'Invalid API key' })
    return
  }

  const server = new McpServer({
    name: 'worldcup26',
    version: '0.1.0',
  })

  registerTools(server, user.userId)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no session
  })

  res.on('close', () => transport.close())

  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

// SSE + GET for MCP clients that use them — return 405 with helpful message
app.get('/mcp', (_req, res) => {
  res.status(405).json({
    error: 'This MCP server uses stateless HTTP. Use POST /mcp only.',
    docs: 'https://modelcontextprotocol.io/specification/2025-03-26',
  })
})

app.delete('/mcp', (_req, res) => {
  res.status(405).json({ error: 'Stateless mode — no sessions to delete.' })
})

const PORT = process.env.PORT ?? 4001
app.listen(PORT, () => {
  console.log(`WorldCup26 MCP server running on port ${PORT}`)
  console.log(`  Next.js API: ${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}`)
})
