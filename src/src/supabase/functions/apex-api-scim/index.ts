// @ts-nocheck
// ============================================================
// APEX RH — supabase/functions/apex-api-scim/index.ts
// Session 53 — Connecteur SCIM 2.0 (RFC 7644)
// Routes : GET/POST/PUT/PATCH/DELETE /api/v1/scim/Users
// Auth   : Bearer <api_key> avec scope scim:write
// ============================================================
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Content-Type'                : 'application/scim+json',
}

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SCIM_SCHEMA      = 'urn:ietf:params:scim:schemas:core:2.0:User'
const LIST_SCHEMA      = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'

// ─── Types SCIM ───────────────────────────────────────────────
interface ScimUser {
  schemas     : string[]
  id          : string
  externalId ?: string
  userName    : string
  name        : { givenName: string; familyName: string; formatted?: string }
  emails      : Array<{ value: string; primary?: boolean; type?: string }>
  active      : boolean
  title      ?: string
  displayName?: string
  meta        : { resourceType: string; created: string; lastModified: string; location: string }
}

function scimError(detail: string, status: number, scimType?: string) {
  return new Response(
    JSON.stringify({
      schemas : ['urn:ietf:params:scim:api:messages:2.0:Error'],
      status,
      scimType,
      detail,
    }),
    { status, headers: CORS }
  )
}

function toScimUser(u: Record<string, unknown>, baseUrl: string): ScimUser {
  return {
    schemas    : [SCIM_SCHEMA],
    id         : u.id as string,
    externalId : (u.external_id as string) ?? undefined,
    userName   : u.email as string,
    name       : {
      givenName  : u.first_name as string,
      familyName : u.last_name  as string,
      formatted  : `${u.first_name} ${u.last_name}`,
    },
    emails  : [{ value: u.email as string, primary: true, type: 'work' }],
    active  : u.is_active as boolean,
    title   : (u.job_title as string) ?? undefined,
    displayName: `${u.first_name} ${u.last_name}`,
    meta    : {
      resourceType : 'User',
      created      : u.created_at as string,
      lastModified : u.updated_at as string,
      location     : `${baseUrl}/Users/${u.id}`,
    },
  }
}

async function getApiKey(
  db    : ReturnType<typeof createClient>,
  token : string
): Promise<{ orgId: string; keyId: string } | null> {
  const { data, error } = await db.rpc('validate_api_key', { key_text: token })
  if (error || !data?.length) return null
  const k = data[0]
  if (!k.is_valid) return null
  if (!k.scopes.includes('scim:write') && !k.scopes.includes('scim:read')) return null
  return { orgId: k.org_id, keyId: k.key_id }
}

// ─── Handlers ─────────────────────────────────────────────────

// GET /Users — Liste avec filtrage SCIM
async function listUsers(
  req    : Request,
  db     : ReturnType<typeof createClient>,
  orgId  : string,
  baseUrl: string
): Promise<Response> {
  const url       = new URL(req.url)
  const startIndex = parseInt(url.searchParams.get('startIndex') ?? '1')
  const count      = Math.min(200, parseInt(url.searchParams.get('count') ?? '100'))
  const filter     = url.searchParams.get('filter') ?? ''

  let query = db
    .from('users')
    .select('id, email, first_name, last_name, is_active, job_title, hire_date, created_at, updated_at', { count: 'exact' })
    .eq('organization_id', orgId)
    .range(startIndex - 1, startIndex - 1 + count - 1)

  // Filtrage SCIM basique : userName eq "email@example.com"
  const userNameMatch = filter.match(/userName eq "(.+?)"/i)
  const activeMatch   = filter.match(/active eq (true|false)/i)
  if (userNameMatch) query = query.eq('email', userNameMatch[1])
  if (activeMatch)   query = query.eq('is_active', activeMatch[1] === 'true')

  const { data, error, count: total } = await query
  if (error) return scimError('Database error', 500)

  const resources = (data ?? []).map((u: Record<string, unknown>) => toScimUser(u, baseUrl))

  return new Response(JSON.stringify({
    schemas      : [LIST_SCHEMA],
    totalResults : total ?? 0,
    startIndex,
    itemsPerPage : resources.length,
    Resources    : resources,
  }), { status: 200, headers: CORS })
}

// GET /Users/:id
async function getUser(
  userId  : string,
  db      : ReturnType<typeof createClient>,
  orgId   : string,
  baseUrl : string
): Promise<Response> {
  const { data, error } = await db
    .from('users')
    .select('id, email, first_name, last_name, is_active, job_title, hire_date, created_at, updated_at')
    .eq('id', userId)
    .eq('organization_id', orgId)
    .single()

  if (error || !data) return scimError('User not found', 404, 'noTarget')

  return new Response(JSON.stringify(toScimUser(data, baseUrl)), { status: 200, headers: CORS })
}

// POST /Users — Création collaborateur
async function createUser(
  req    : Request,
  db     : ReturnType<typeof createClient>,
  orgId  : string,
  keyId  : string,
  baseUrl: string
): Promise<Response> {
  const body = await req.json()

  const email     = body.emails?.[0]?.value ?? body.userName
  const firstName = body.name?.givenName
  const lastName  = body.name?.familyName
  const active    = body.active ?? true
  const title     = body.title ?? null
  const extId     = body.externalId ?? null

  if (!email || !firstName || !lastName) {
    return scimError('Missing required fields: userName (email), name.givenName, name.familyName', 400, 'invalidValue')
  }

  // Vérifier email unique
  const { data: existing } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('organization_id', orgId)
    .single()

  if (existing) {
    return scimError(`User with email ${email} already exists`, 409, 'uniqueness')
  }

  // Créer le user (auth.users sera créé séparément — ici on crée le profil public)
  const { data: newUser, error } = await db
    .from('users')
    .insert({
      email,
      first_name      : firstName,
      last_name        : lastName,
      is_active        : active,
      job_title        : title,
      organization_id  : orgId,
      role             : 'collaborateur',
      must_change_password: true,
    })
    .select()
    .single()

  if (error) return scimError(`Creation failed: ${error.message}`, 500)

  // Log sync
  await db.from('scim_sync_logs').insert({
    organization_id : orgId,
    api_key_id      : keyId,
    sync_type       : 'import',
    source_system   : 'scim',
    total_records   : 1,
    created_count   : 1,
    status          : 'completed',
    completed_at    : new Date().toISOString(),
  })

  return new Response(
    JSON.stringify(toScimUser(newUser, baseUrl)),
    { status: 201, headers: { ...CORS, Location: `${baseUrl}/Users/${newUser.id}` } }
  )
}

// PUT /Users/:id — Remplacement complet
async function replaceUser(
  userId  : string,
  req     : Request,
  db      : ReturnType<typeof createClient>,
  orgId   : string,
  baseUrl : string
): Promise<Response> {
  const body = await req.json()

  const updates: Record<string, unknown> = {
    first_name : body.name?.givenName,
    last_name  : body.name?.familyName,
    email      : body.emails?.[0]?.value ?? body.userName,
    is_active  : body.active ?? true,
    job_title  : body.title ?? null,
  }

  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', userId)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) return scimError(`Update failed: ${error.message}`, 500)
  if (!data)  return scimError('User not found', 404, 'noTarget')

  return new Response(JSON.stringify(toScimUser(data, baseUrl)), { status: 200, headers: CORS })
}

// PATCH /Users/:id — Opérations partielles SCIM
async function patchUser(
  userId  : string,
  req     : Request,
  db      : ReturnType<typeof createClient>,
  orgId   : string,
  baseUrl : string
): Promise<Response> {
  const body = await req.json()
  const operations: Array<{ op: string; path: string; value: unknown }> = body.Operations ?? []

  const updates: Record<string, unknown> = {}

  for (const op of operations) {
    const opLower = op.op?.toLowerCase()
    if (opLower === 'replace' || opLower === 'add') {
      if (op.path === 'active')            updates.is_active  = op.value
      if (op.path === 'name.givenName')    updates.first_name = op.value
      if (op.path === 'name.familyName')   updates.last_name  = op.value
      if (op.path === 'title')             updates.job_title  = op.value
      if (op.path === 'userName' || op.path === 'emails[type eq "work"].value') {
        updates.email = op.value
      }
      // Support valeur directe sans path (Workday style)
      if (!op.path && typeof op.value === 'object') {
        const v = op.value as Record<string, unknown>
        if (v.active !== undefined) updates.is_active = v.active
      }
    }
  }

  if (!Object.keys(updates).length) {
    return new Response('', { status: 204, headers: CORS })
  }

  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', userId)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error) return scimError(`Patch failed: ${error.message}`, 500)
  if (!data)  return scimError('User not found', 404, 'noTarget')

  return new Response(JSON.stringify(toScimUser(data, baseUrl)), { status: 200, headers: CORS })
}

// DELETE /Users/:id — Désactivation (soft delete)
async function deactivateUser(
  userId : string,
  db     : ReturnType<typeof createClient>,
  orgId  : string
): Promise<Response> {
  const { error } = await db
    .from('users')
    .update({ is_active: false })
    .eq('id', userId)
    .eq('organization_id', orgId)

  if (error) return scimError(`Deactivation failed: ${error.message}`, 500)

  return new Response('', { status: 204, headers: CORS })
}

// ─── Router SCIM ──────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url     = new URL(req.url)
  const path    = url.pathname.replace(/^\/apex-api-scim/, '')
  const baseUrl = `${url.origin}/apex-api-scim`

  // Auth
  const authHeader = req.headers.get('authorization') ?? req.headers.get('x-api-key') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (!token) return scimError('Missing API key', 401)

  const db  = createClient(SUPABASE_URL, SUPABASE_SERVICE)
  const auth = await getApiKey(db, token)
  if (!auth) return scimError('Invalid or insufficient API key. Requires scim:read or scim:write scope.', 401)

  const { orgId, keyId } = auth

  // ServiceProviderConfig
  if (path === '/ServiceProviderConfig') {
    return new Response(JSON.stringify({
      schemas              : ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri     : 'https://docs.apex-rh.com/api/scim',
      patch                : { supported: true },
      bulk                 : { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter               : { supported: true, maxResults: 200 },
      changePassword       : { supported: false },
      sort                 : { supported: false },
      etag                 : { supported: false },
      authenticationSchemes: [{ type: 'oauthbearertoken', name: 'API Key Bearer', description: 'APEX RH API Key' }],
    }), { status: 200, headers: CORS })
  }

  // ResourceTypes
  if (path === '/ResourceTypes') {
    return new Response(JSON.stringify({
      schemas      : ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults : 1,
      Resources    : [{
        schemas     : ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id          : 'User',
        name        : 'User',
        endpoint    : '/Users',
        schema      : SCIM_SCHEMA,
      }],
    }), { status: 200, headers: CORS })
  }

  // /Users routes
  const usersMatch = path.match(/^\/Users(?:\/([^/]+))?$/)
  if (!usersMatch) return scimError('Not found', 404)

  const userId = usersMatch[1]

  if (req.method === 'GET' && !userId)  return await listUsers(req, db, orgId, baseUrl)
  if (req.method === 'GET' && userId)   return await getUser(userId, db, orgId, baseUrl)
  if (req.method === 'POST')            return await createUser(req, db, orgId, keyId, baseUrl)
  if (req.method === 'PUT' && userId)   return await replaceUser(userId, req, db, orgId, baseUrl)
  if (req.method === 'PATCH' && userId) return await patchUser(userId, req, db, orgId, baseUrl)
  if (req.method === 'DELETE' && userId) return await deactivateUser(userId, db, orgId)

  return scimError('Method not allowed', 405)
})