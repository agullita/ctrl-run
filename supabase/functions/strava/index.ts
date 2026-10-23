const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type Payload = {
  action?: 'exchange' | 'refresh' | 'latest' | 'streams'
  code?: string
  accessToken?: string
  refreshToken?: string
  activityId?: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const clientId = Deno.env.get('STRAVA_CLIENT_ID')
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    return json(
      {
        error:
          'STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET no configurados en los secrets de Supabase.',
      },
      500,
    )
  }

  let payload: Payload
  try {
    payload = (await req.json()) as Payload
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  try {
    if (payload.action === 'exchange') {
      if (!payload.code) return json({ error: 'Falta code' }, 400)

      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: payload.code,
          grant_type: 'authorization_code',
        }),
      })

      if (!response.ok) {
        return json(
          { error: 'Strava rechazó el intercambio de token', detail: await response.text() },
          response.status,
        )
      }

      return json(await response.json())
    }

    if (payload.action === 'refresh') {
      if (!payload.refreshToken) return json({ error: 'Falta refreshToken' }, 400)

      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: payload.refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      if (!response.ok) {
        return json(
          { error: 'Strava rechazó el refresh de token', detail: await response.text() },
          response.status,
        )
      }

      return json(await response.json())
    }

    if (payload.action === 'latest') {
      if (!payload.accessToken) return json({ error: 'Falta accessToken' }, 400)

      const response = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=1',
        { headers: { Authorization: `Bearer ${payload.accessToken}` } },
      )

      if (!response.ok) {
        return json(
          { error: 'Strava rechazó la petición de actividades', detail: await response.text() },
          response.status,
        )
      }

      const activities = (await response.json()) as unknown[]
      return json(activities[0] ?? null)
    }

    if (payload.action === 'streams') {
      if (!payload.accessToken) return json({ error: 'Falta accessToken' }, 400)
      if (!payload.activityId || !Number.isFinite(payload.activityId)) {
        return json({ error: 'Falta activityId válido' }, 400)
      }

      const url = new URL(
        `https://www.strava.com/api/v3/activities/${payload.activityId}/streams`,
      )
      url.searchParams.set('keys', 'time,heartrate')
      url.searchParams.set('key_by_type', 'true')

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${payload.accessToken}` },
      })

      if (!response.ok) {
        return json(
          { error: 'Strava rechazó la petición de streams', detail: await response.text() },
          response.status,
        )
      }

      return json(await response.json())
    }

    return json({ error: 'action no soportada' }, 400)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Error desconocido'
    return json({ error: 'Fallo la Edge Function de Strava', detail }, 500)
  }
})
