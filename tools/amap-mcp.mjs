// 高德地图 MCP 客户端
// 用途：按 MCP Streamable HTTP 协议调用 https://mcp.amap.com/mcp 上的高德工具，
//       为路书补充 POI 详情（评分 / 人均 / 营业时间 / 电话 / 门址）、检索与距离核验。
// 用法：
//   node tools/amap-mcp.mjs tools                      列出可用工具
//   node tools/amap-mcp.mjs call maps_search_detail '{"id":"B0KRFURYHQ"}'
//   node tools/amap-mcp.mjs batch tools/amap-queries.json [--refresh]
// Key：优先读环境变量 AMAP_KEY，其次读 ~/.zcode/cli/config.json 里 amap-maps MCP 的 url。
// 缓存：batch 结果写入 tools/.cache/amap-mcp-<batch 名>.json；默认命中缓存不重复请求，--refresh 强制刷新。

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'tools/.cache')
const PROTOCOL = '2025-03-26'

export function resolveAmapKey() {
  if (process.env.AMAP_KEY) return process.env.AMAP_KEY
  const cfgPath = join(homedir(), '.zcode/cli/config.json')
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
      const url = cfg?.mcp?.servers?.['amap-maps-streamableHTTP']?.url
      const key = new URL(url).searchParams.get('key')
      if (key) return key
    } catch { /* fallthrough */ }
  }
  throw new Error('缺少 AMAP_KEY（或无法从 ~/.zcode/cli/config.json 读取高德 Key）')
}

function endpoint() {
  return 'https://mcp.amap.com/mcp?key=' + resolveAmapKey()
}

let rpcId = 0
let sessionId = null

function decodePayload(text) {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed)
  // SSE: 取最后一个 data: 块里的 JSON-RPC 消息
  let last = null
  for (const block of trimmed.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
    if (!data) continue
    try { last = JSON.parse(data) } catch { /* ignore non-JSON keep-alive */ }
  }
  return last
}

async function rpc(method, params, { notify = false, retries = 3 } = {}) {
  const body = notify
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id: ++rpcId, method, params }
  for (let attempt = 1; ; attempt++) {
    try {
      const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
      if (sessionId) headers['mcp-session-id'] = sessionId
      const res = await fetch(endpoint(), { method: 'POST', headers, body: JSON.stringify(body) })
      const sid = res.headers.get('mcp-session-id')
      if (sid) sessionId = sid
      const text = await res.text()
      if (res.status === 202) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      const payload = decodePayload(text)
      if (payload?.error) throw new Error(`MCP error ${payload.error.code}: ${payload.error.message}`)
      return payload?.result ?? null
    } catch (err) {
      if (attempt > retries) throw err
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
}

async function ensureSession() {
  if (sessionId) return
  await rpc('initialize', {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: 'dsh-roadbook', version: '1.0.0' },
  })
  await rpc('notifications/initialized', undefined, { notify: true })
}

export async function listTools() {
  await ensureSession()
  const result = await rpc('tools/list', {})
  return result?.tools ?? []
}

export async function callTool(name, args = {}) {
  await ensureSession()
  const result = await rpc('tools/call', { name, arguments: args })
  const chunks = (result?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text)
  const text = chunks.join('\n')
  return { isError: Boolean(result?.isError), text, raw: result }
}

/** 高德 MCP 多数工具返回 JSON 文本；尽量解析为对象，失败则返回原文本。 */
export async function callToolJson(name, args = {}) {
  const { isError, text } = await callTool(name, args)
  if (isError) throw new Error(`工具 ${name} 调用失败：${text.slice(0, 300)}`)
  try { return JSON.parse(text) } catch { return { _text: text } }
}

export async function runBatch(queries, { refresh = false, cacheFile = null, quiet = false } = {}) {
  mkdirSync(CACHE, { recursive: true })
  let cache = {}
  if (cacheFile && existsSync(cacheFile) && !refresh) {
    try { cache = JSON.parse(readFileSync(cacheFile, 'utf-8')) } catch { cache = {} }
  }
  const out = { ...cache }
  const pending = queries.filter((q) => refresh || !(q.key in out))
  if (!quiet) console.log(`[${pending.length}/${queries.length}] 需要调用高德 MCP`)
  for (const q of pending) {
    try {
      out[q.key] = { tool: q.tool, args: q.args, at: new Date().toISOString(), result: await callToolJson(q.tool, q.args) }
      if (!quiet) console.log('  ok   ' + q.key)
    } catch (err) {
      out[q.key] = { tool: q.tool, args: q.args, at: new Date().toISOString(), error: String(err.message ?? err) }
      if (!quiet) console.log('  FAIL ' + q.key + ' :: ' + String(err.message ?? err).slice(0, 120))
    }
    await new Promise((r) => setTimeout(r, 120))
  }
  if (cacheFile) writeFileSync(cacheFile, JSON.stringify(out, null, 2))
  return out
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (!cmd || cmd === 'help') {
    console.log('用法: node tools/amap-mcp.mjs <tools|call|batch> [...]')
    return
  }
  if (cmd === 'tools') {
    for (const t of await listTools()) console.log(t.name + ' — ' + (t.description ?? '').split('\n')[0])
    return
  }
  if (cmd === 'call') {
    const [name, argsJson = '{}'] = rest
    const { isError, text } = await callTool(name, JSON.parse(argsJson))
    console.log(isError ? '[isError] ' : '')
    console.log(text)
    return
  }
  if (cmd === 'batch') {
    const [file, ...flags] = rest
    const queries = JSON.parse(readFileSync(file, 'utf-8'))
    const cacheFile = join(CACHE, 'amap-mcp-' + basename(file, '.json') + '.json')
    const out = await runBatch(queries, { refresh: flags.includes('--refresh'), cacheFile })
    console.log('结果缓存: ' + cacheFile + `（${Object.keys(out).length} 项）`)
    return
  }
  throw new Error('未知命令: ' + cmd)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { console.error(err); process.exitCode = 1 })
}
