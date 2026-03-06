// ============================================================
// APEX RH — supabase/functions/apex-api/index.ts
// Session 53 — API REST Publique v1
// Routes : GET /api/v1/users | /performance | /objectives | /surveys
// Auth   : Bearer <api_key>
// Rate   : 100 req/min par organisation
// ============================================================
import { serve }       from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type'                : 'application/json',
}

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─── Types ───────────────────────────────────────────────────
interface ApiKeyRecord {
  key_id     : string
  org_id     : string
  scopes     : string[]
  rate_limit : number
  is_valid   : boolean
}

interface PaginationParams {
  page     : number
  per_page : number
  offset   : number
}

// ─── Helpers ─────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, ...extra },
  })
}

function errorResponse(message: string, code: string, status: number) {
  return jsonResponse({ error: { message, code, status } }, status)
}

function parsePagination(url: URL): PaginationParams {
  const page     = Math.max(1, parseInt(url.searchParams.get('page')     ?? '1'))
  const per_page = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') ?? '50')))
  return { page, per_page, offset: (page - 1) * per_page }
}

function paginatedMeta(total: number, page: number, per_page: number) {
  return {
    total,
    page,
    per_page,
    total_pages : Math.ceil(total / per_page),
    has_next    : page * per_page < total,
    has_prev    : page > 1,
  }
}

// ─── Auth middleware ──────────────────────────────────────────

async function authenticateRequest(
  req    : Request,
  db     : ReturnType<typeof createClient>,
  scope  : string
): Promise<{ key: ApiKeyRecord | null; error: Response | null }> {

  const authHeader = req.headers.get('authorization') ?? req.headers.get('x-api-key') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (!token) {
    return { key: null, error: errorResponse('Missing API key. Pass Bearer token or X-Api-Key header.', 'AUTH_MISSING', 401) }
  }

  const { data, error } = await db.rpc('validate_api_key', { key_text: token })
  if (error || !data?.length) {
    return { key: null, error: errorResponse('Invalid or expired API key.', 'AUTH_INVALID', 401) }
  }

  const key: ApiKeyRecord = data[0]
  if (!key.is_valid) {
    return { key: null, error: errorResponse('API key is inactive or expired.', 'AUTH_INACTIVE', 403) }
  }

  // Vérification scope
  if (!key.scopes.includes(scope) && !key.scopes.includes(scope.replace(':read', ':write'))) {
    return {
      key: null,
      error: errorResponse(`Insufficient scope. Required: ${scope}`, 'AUTH_SCOPE', 403),
    }
  }

  // Rate limit
  const { data: underLimit } = await db.rpc('check_api_rate_limit', {
    p_key_id: key.key_id,
    p_limit : key.rate_limit,
  })
  if (!underLimit) {
    return {
      key: null,
      error: errorResponse('Rate limit exceeded. Max 100 requests/minute.', 'RATE_LIMIT', 429),
    }
  }

  return { key, error: null }
}

// ─── Audit logger ─────────────────────────────────────────────

async function logApiCall(
  db         : ReturnType<typeof createClient>,
  orgId      : string,
  keyId      : string,
  endpoint   : string,
  method     : string,
  status     : number,
  req        : Request,
  rows       : number,
  ms         : number,
  errorMsg  ?: string
) {
  const url  = new URL(req.url)
  const params: Record<string, string> = {}
  url.searchParams.forEach((v, k) => { params[k] = v })

  await db.from('api_audit_logs').insert({
    organization_id  : orgId,
    api_key_id       : keyId,
    endpoint,
    method,
    status_code      : status,
    ip_address       : req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip'),
    user_agent       : req.headers.get('user-agent'),
    request_params   : Object.keys(params).length ? params : null,
    response_rows    : rows,
    response_time_ms : ms,
    error_message    : errorMsg ?? null,
  })
}

// ─── Route handlers ───────────────────────────────────────────

// GET /api/v1/users
async function handleUsers(
  req   : Request,
  db    : ReturnType<typeof createClient>,
  orgId : string,
  start : number
): Promise<Response> {
  const url   = new URL(req.url)
  const { page, per_page, offset } = parsePagination(url)

  // Filtres
  const role      = url.searchParams.get('role')
  const active    = url.searchParams.get('active')
  const serviceId = url.searchParams.get('service_id')

  let query = db
    .from('users')
    .select(`
      id, email, first_name, last_name, role, is_active,
      hire_date, job_title,
      services(id, name),
      divisions(id, name),
      directions(id, name)
    `, { count: 'exact' })
    .eq('organization_id', orgId)
    .range(offset, offset + per_page - 1)
    .order('last_name', { ascending: true })

  if (role)      query = query.eq('role', role)
  if (active !== null && active !== '') query = query.eq('is_active', active === 'true')
  if (serviceId) query = query.eq('service_id', serviceId)

  const { data, error, count } = await query
  if (error) {
    await logApiCall(db, orgId, '', '/api/v1/users', 'GET', 500, req, 0, Date.now() - start, error.message)
    return errorResponse('Database error.', 'DB_ERROR', 500)
  }

  const rows = (data ?? []).map((u: Record<string, unknown>) => ({
    id         : u.id,
    email      : u.email,
    first_name : u.first_name,
    last_name  : u.last_name,
    full_name  : `${u.first_name} ${u.last_name}`,
    role       : u.role,
    is_active  : u.is_active,
    hire_date  : u.hire_date,
    job_title  : u.job_title,
    service    : (u.services as Record<string, string>)?.name ?? null,
    division   : (u.divisions as Record<string, string>)?.name ?? null,
    direction  : (u.directions as Record<string, string>)?.name ?? null,
  }))

  return jsonResponse({
    data : rows,
    meta : paginatedMeta(count ?? 0, page, per_page),
  })
}

// GET /api/v1/performance
async function handlePerformance(
  req   : Request,
  db    : ReturnType<typeof createClient>,
  orgId : string,
  start : number
): Promise<Response> {
  const url   = new URL(req.url)
  const { page, per_page, offset } = parsePagination(url)

  const userId   = url.searchParams.get('user_id')
  const dateFrom = url.searchParams.get('date_from')
  const dateTo   = url.searchParams.get('date_to')
  const groupBy  = url.searchParams.get('group_by') // 'user' | 'month' | null

  if (groupBy === 'month') {
    // Agrégation mensuelle depuis la vue matérialisée
    const { data, error } = await db
      .from('mv_user_pulse_monthly')
      .select('*')
      .eq('organization_id', orgId)
      .order('month', { ascending: false })
      .range(offset, offset + per_page - 1)

    if (error) return errorResponse('Database error.', 'DB_ERROR', 500)
    return jsonResponse({ data: data ?? [], meta: { group_by: 'month' } })
  }

  let query = db
    .from('performance_scores')
    .select(`
      id, score_date, score_delivery, score_quality, score_regularity, score_bonus, score_total,
      users!inner(id, first_name, last_name, organization_id)
    `, { count: 'exact' })
    .eq('users.organization_id', orgId)
    .order('score_date', { ascending: false })
    .range(offset, offset + per_page - 1)

  if (userId)   query = query.eq('user_id', userId)
  if (dateFrom) query = query.gte('score_date', dateFrom)
  if (dateTo)   query = query.lte('score_date', dateTo)

  const { data, error, count } = await query
  if (error) return errorResponse('Database error.', 'DB_ERROR', 500)

  const rows = (data ?? []).map((s: Record<string, unknown>) => {
    const u = s.users as Record<string, string>
    return {
      id               : s.id,
      score_date       : s.score_date,
      score_delivery   : s.score_delivery,
      score_quality    : s.score_quality,
      score_regularity : s.score_regularity,
      score_bonus      : s.score_bonus,
      score_total      : s.score_total,
      user_id          : u?.id,
      user_name        : `${u?.first_name} ${u?.last_name}`,
    }
  })

  return jsonResponse({
    data : rows,
    meta : paginatedMeta(count ?? 0, page, per_page),
  })
}

// GET /api/v1/objectives
async function handleObjectives(
  req   : Request,
  db    : ReturnType<typeof createClient>,
  orgId : string,
  start : number
): Promise<Response> {
  const url   = new URL(req.url)
  const { page, per_page, offset } = parsePagination(url)

  const status  = url.searchParams.get('status')
  const level   = url.searchParams.get('level')
  const ownerId = url.searchParams.get('owner_id')

  let query = db
    .from('objectives')
    .select(`
      id, title, description, status, level, progress_score, weight,
      due_date, owner_id, parent_id,
      users!inner(id, first_name, last_name, organization_id)
    `, { count: 'exact' })
    .eq('users.organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1)

  if (status)  query = query.eq('status', status)
  if (level)   query = query.eq('level', level)
  if (ownerId) query = query.eq('owner_id', ownerId)

  const { data, error, count } = await query
  if (error) return errorResponse('Database error.', 'DB_ERROR', 500)

  const rows = (data ?? []).map((o: Record<string, unknown>) => {
    const u = o.users as Record<string, string>
    return {
      id             : o.id,
      title          : o.title,
      description    : o.description,
      status         : o.status,
      level          : o.level,
      progress_score : o.progress_score,
      weight         : o.weight,
      due_date       : o.due_date,
      parent_id      : o.parent_id,
      owner_id       : u?.id,
      owner_name     : `${u?.first_name} ${u?.last_name}`,
    }
  })

  return jsonResponse({
    data : rows,
    meta : paginatedMeta(count ?? 0, page, per_page),
  })
}

// GET /api/v1/surveys
async function handleSurveys(
  req   : Request,
  db    : ReturnType<typeof createClient>,
  orgId : string,
  start : number
): Promise<Response> {
  const url   = new URL(req.url)
  const { page, per_page, offset } = parsePagination(url)

  const { data: surveys, error, count } = await db
    .from('engagement_surveys')
    .select('id, title, description, status, created_at, due_date', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1)

  if (error) return errorResponse('Database error.', 'DB_ERROR', 500)

  // Ajouter le taux de réponse pour chaque survey
  const enriched = await Promise.all((surveys ?? []).map(async (s: Record<string, unknown>) => {
    const { count: respCount } = await db
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', s.id)

    return {
      ...s,
      response_count : respCount ?? 0,
    }
  }))

  return jsonResponse({
    data : enriched,
    meta : paginatedMeta(count ?? 0, page, per_page),
  })
}

// ─── Router principal ─────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const start = Date.now()
  const url   = new URL(req.url)
  const path  = url.pathname

  // Route OpenAPI spec
  if (path === '/api/v1' || path === '/api/v1/') {
    return jsonResponse({
      openapi_spec : `${url.origin}/apex-api/docs/openapi.json`,
      version      : '1.0.0',
      endpoints    : [
        { method: 'GET', path: '/api/v1/users',       scope: 'users:read'       },
        { method: 'GET', path: '/api/v1/performance', scope: 'performance:read' },
        { method: 'GET', path: '/api/v1/objectives',  scope: 'objectives:read'  },
        { method: 'GET', path: '/api/v1/surveys',     scope: 'surveys:read'     },
      ],
    })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Détermination scope selon endpoint
  const scopeMap: Record<string, string> = {
    '/api/v1/users'       : 'users:read',
    '/api/v1/performance' : 'performance:read',
    '/api/v1/objectives'  : 'objectives:read',
    '/api/v1/surveys'     : 'surveys:read',
  }

  // Normalisation du path (Supabase Edge Functions préfixent avec /nom-function)
  const normalizedPath = path.replace(/^\/apex-api/, '')
  const scope = scopeMap[normalizedPath]

  if (!scope) {
    return errorResponse(`Unknown endpoint: ${normalizedPath}. See /api/v1 for available routes.`, 'NOT_FOUND', 404)
  }

  // Auth
  const { key, error: authError } = await authenticateRequest(req, db, scope)
  if (authError) return authError

  const orgId = key!.org_id
  const keyId = key!.key_id

  try {
    let response: Response
    let rowCount = 0

    if (normalizedPath === '/api/v1/users') {
      response = await handleUsers(req, db, orgId, start)
    } else if (normalizedPath === '/api/v1/performance') {
      response = await handlePerformance(req, db, orgId, start)
    } else if (normalizedPath === '/api/v1/objectives') {
      response = await handleObjectives(req, db, orgId, start)
    } else {
      response = await handleSurveys(req, db, orgId, start)
    }

    // Audit log (async, sans bloquer la réponse)
    const ms = Date.now() - start
    try {
      const clone = response.clone()
      const body  = await clone.json()
      rowCount    = body?.data?.length ?? 0
    } catch (_) { /* ignore */ }

    logApiCall(db, orgId, keyId, normalizedPath, req.method, response.status, req, rowCount, ms)

    return response

  } catch (err) {
    const ms  = Date.now() - start
    const msg = err instanceof Error ? err.message : 'Unknown error'
    logApiCall(db, orgId, keyId, normalizedPath, req.method, 500, req, 0, ms, msg)
    return errorResponse('Internal server error.', 'SERVER_ERROR', 500)
  }
})
